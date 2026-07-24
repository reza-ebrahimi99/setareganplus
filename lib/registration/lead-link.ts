/**
 * Lead ↔ Registration linking (no schema migration).
 * Snapshot lives on Registration.metadata.leadLink; FK remains Registration.leadId.
 */

import {
  CrmActivityType,
  CrmStageType,
  LeadSourceType,
} from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { recordCrmActivity } from "@/lib/crm/activity";
import { normalizeEmail } from "@/lib/forms/normalize-email";
import { normalizeIranianMobile } from "@/lib/forms/normalize-mobile";
import { normalizeNationalId } from "@/lib/forms/normalize-national-id";
import { prisma } from "@/lib/prisma";
import type { RegistrationAttribution } from "@/lib/registration/attribution";
import { attributionToMetadataPatch } from "@/lib/registration/attribution";

/** Bump when leadLink shape changes incompatibly. Unversioned rows read as v1. */
export const LEAD_LINK_SCHEMA_VERSION = 1 as const;

export type LeadLinkSnapshot = {
  /** Schema version for forward-compatible reads (optional on legacy rows). */
  schemaVersion?: typeof LEAD_LINK_SCHEMA_VERSION;
  leadId: string;
  leadOwnerId: string | null;
  leadOwnerName: string | null;
  pipelineId: string | null;
  pipelineName: string | null;
  stageId: string | null;
  stageName: string | null;
  leadSource: string | null;
  leadSourceType: string | null;
  assignedStaffId: string | null;
  assignedStaffName: string | null;
  matchedBy: "leadId" | "mobile" | "nationalCode" | "email" | "created";
  linkedAt: string;
};

export type FindLeadMatchParams = {
  organizationId: string;
  leadId?: string | null;
  mobile?: string | null;
  nationalCode?: string | null;
  email?: string | null;
};

/**
 * Priority: Lead ID → Mobile → National Code → Email
 * Ambiguous multi-matches are skipped (no auto-merge).
 */
export async function findLeadForRegistration(
  params: FindLeadMatchParams,
): Promise<{ id: string; matchedBy: LeadLinkSnapshot["matchedBy"] } | null> {
  if (params.leadId?.trim()) {
    const byId = await prisma.lead.findFirst({
      where: {
        id: params.leadId.trim(),
        organizationId: params.organizationId,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (byId) return { id: byId.id, matchedBy: "leadId" };
  }

  if (params.mobile?.trim()) {
    const mobile = normalizeIranianMobile(params.mobile);
    if (mobile.ok) {
      const matches = await prisma.lead.findMany({
        where: {
          organizationId: params.organizationId,
          normalizedMobile: mobile.normalized,
          deletedAt: null,
        },
        select: { id: true },
        take: 3,
      });
      if (matches.length === 1) {
        return { id: matches[0]!.id, matchedBy: "mobile" };
      }
    }
  }

  if (params.nationalCode?.trim()) {
    const national = normalizeNationalId(params.nationalCode);
    if (national.ok) {
      const matches = await prisma.lead.findMany({
        where: {
          organizationId: params.organizationId,
          nationalCode: national.normalized,
          deletedAt: null,
        },
        select: { id: true },
        take: 3,
      });
      // Ambiguous multi-matches: skip (no auto-merge).
      if (matches.length === 1) {
        return { id: matches[0]!.id, matchedBy: "nationalCode" };
      }
    }
  }

  if (params.email?.trim()) {
    const email = normalizeEmail(params.email);
    if (email.ok) {
      // Lead model has no dedicated email column in all orgs — check metadata/description sparingly.
      // Prefer formSubmission email join when present.
      const submissions = await prisma.formSubmission.findMany({
        where: {
          organizationId: params.organizationId,
          email: email.email,
          leadId: { not: null },
          deletedAt: null,
        },
        select: { leadId: true },
        orderBy: { submittedAt: "desc" },
        take: 5,
      });
      const uniqueLeadIds = [
        ...new Set(
          submissions
            .map((row) => row.leadId)
            .filter((id): id is string => Boolean(id)),
        ),
      ];
      // Ambiguous multi-lead email: skip (no auto-merge).
      if (uniqueLeadIds.length === 1) {
        return { id: uniqueLeadIds[0]!, matchedBy: "email" };
      }
    }
  }

  return null;
}

export async function buildLeadLinkSnapshot(params: {
  organizationId: string;
  leadId: string;
  matchedBy: LeadLinkSnapshot["matchedBy"];
}): Promise<LeadLinkSnapshot | null> {
  const lead = await prisma.lead.findFirst({
    where: {
      id: params.leadId,
      organizationId: params.organizationId,
      deletedAt: null,
    },
    include: {
      owner: { select: { id: true, firstName: true, lastName: true } },
      pipeline: { select: { id: true, name: true } },
      stage: { select: { id: true, name: true } },
    },
  });
  if (!lead) return null;

  const ownerName = lead.owner
    ? `${lead.owner.firstName} ${lead.owner.lastName}`.trim()
    : null;

  return {
    schemaVersion: LEAD_LINK_SCHEMA_VERSION,
    leadId: lead.id,
    leadOwnerId: lead.ownerUserId,
    leadOwnerName: ownerName,
    pipelineId: lead.pipelineId,
    pipelineName: lead.pipeline?.name ?? null,
    stageId: lead.stageId,
    stageName: lead.stage?.name ?? null,
    leadSource: lead.source,
    leadSourceType: lead.sourceType,
    assignedStaffId: lead.ownerUserId,
    assignedStaffName: ownerName,
    matchedBy: params.matchedBy,
    linkedAt: new Date().toISOString(),
  };
}

/**
 * Prevent a second active registration on the same flow for one lead
 * (future-ready: Multiple Registrations Per Lead / re-enrollment / sibling
 * can relax via Registration.metadata.allowMultipleForLead = true).
 */
export async function findDuplicateRegistrationForLead(params: {
  organizationId: string;
  leadId: string;
  flowKey: string;
  excludeRegistrationId?: string | null;
}): Promise<{ id: string; registrationNumber: string; status: string } | null> {
  const row = await prisma.registration.findFirst({
    where: {
      organizationId: params.organizationId,
      leadId: params.leadId,
      flowKey: params.flowKey,
      deletedAt: null,
      status: {
        notIn: ["CANCELLED", "REJECTED"],
      },
      ...(params.excludeRegistrationId
        ? { NOT: { id: params.excludeRegistrationId } }
        : {}),
    },
    select: { id: true, registrationNumber: true, status: true },
    orderBy: { createdAt: "desc" },
  });
  return row;
}

/**
 * Advance CRM stage for registration lifecycle.
 * Mapping comes from Organization.settings.registrationStageMapping
 * with DEFAULT_STAGES fallback (qualified / decision / won).
 * Missing stage codes log a warning and no-op (non-destructive).
 */
export async function advanceLeadStageForRegistration(params: {
  organizationId: string;
  leadId: string;
  /** payment pending vs completed/free */
  phase: "started" | "payment_pending" | "registered" | "cancelled";
}): Promise<void> {
  const { advanceLeadStageForRegistrationPhase, legacyPhaseToMappingKey } =
    await import("@/lib/registration/stage-mapping");
  await advanceLeadStageForRegistrationPhase({
    organizationId: params.organizationId,
    leadId: params.leadId,
    phase: legacyPhaseToMappingKey(params.phase),
  });
}

export async function recordRegistrationLeadTimeline(params: {
  organizationId: string;
  leadId: string;
  registrationId: string;
  registrationNumber: string;
  flowKey: string;
  events: Array<{
    kind:
      | "started"
      | "promotion_applied"
      | "payment_started"
      | "payment_successful"
      | "completed";
    summary?: string;
    metadata?: Record<string, unknown>;
  }>;
}): Promise<void> {
  const titleMap = {
    started: "Registration Started",
    promotion_applied: "Promotion Applied",
    payment_started: "Payment Started",
    payment_successful: "Payment Successful",
    completed: "Registration Completed",
  } as const;

  for (const event of params.events) {
    const activityType =
      event.kind === "payment_started"
        ? CrmActivityType.PAYMENT_STARTED
        : event.kind === "payment_successful"
          ? CrmActivityType.PAYMENT_SUCCEEDED
          : event.kind === "completed" || event.kind === "started"
            ? CrmActivityType.REGISTRATION_CREATED
            : CrmActivityType.NOTE_ADDED;

    // Idempotent: one timeline row per registrationId + timelineKind.
    const existing = await prisma.crmActivity.findFirst({
      where: {
        organizationId: params.organizationId,
        leadId: params.leadId,
        activityType,
        AND: [
          {
            metadata: {
              path: ["timelineKind"],
              equals: event.kind,
            },
          },
          {
            metadata: {
              path: ["registrationId"],
              equals: params.registrationId,
            },
          },
        ],
      },
      select: { id: true },
    });
    if (existing) continue;

    await recordCrmActivity({
      organizationId: params.organizationId,
      leadId: params.leadId,
      activityType,
      title: titleMap[event.kind],
      summary:
        event.summary ??
        `${params.registrationNumber} · ${params.flowKey}`,
      metadata: {
        registrationId: params.registrationId,
        registrationNumber: params.registrationNumber,
        flowKey: params.flowKey,
        timelineKind: event.kind,
        ...(event.metadata ?? {}),
      },
    });
  }
}

export function leadLinkToMetadataPatch(
  snapshot: LeadLinkSnapshot,
  attribution?: RegistrationAttribution | null,
): Record<string, unknown> {
  const versioned: LeadLinkSnapshot = {
    ...snapshot,
    schemaVersion: snapshot.schemaVersion ?? LEAD_LINK_SCHEMA_VERSION,
  };
  return {
    leadLink: versioned,
    leadLinkSchemaVersion: versioned.schemaVersion,
    leadId: versioned.leadId,
    leadOwner: versioned.leadOwnerName,
    leadOwnerId: versioned.leadOwnerId,
    pipeline: versioned.pipelineName,
    pipelineId: versioned.pipelineId,
    stage: versioned.stageName,
    stageId: versioned.stageId,
    leadSource: versioned.leadSource,
    assignedStaff: versioned.assignedStaffName,
    ...(attribution ? attributionToMetadataPatch(attribution) : {}),
  };
}

export function parseLeadLinkFromMetadata(
  metadata: unknown,
): LeadLinkSnapshot | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const raw = metadata as Record<string, unknown>;
  const nested =
    raw.leadLink && typeof raw.leadLink === "object" && !Array.isArray(raw.leadLink)
      ? (raw.leadLink as Record<string, unknown>)
      : null;
  if (!nested || typeof nested.leadId !== "string") return null;

  const versionRaw = nested.schemaVersion ?? raw.leadLinkSchemaVersion;
  const schemaVersion =
    typeof versionRaw === "number" && Number.isFinite(versionRaw)
      ? Math.trunc(versionRaw)
      : LEAD_LINK_SCHEMA_VERSION;

  return {
    schemaVersion:
      schemaVersion > 0 ? LEAD_LINK_SCHEMA_VERSION : LEAD_LINK_SCHEMA_VERSION,
    leadId: nested.leadId,
    leadOwnerId: typeof nested.leadOwnerId === "string" ? nested.leadOwnerId : null,
    leadOwnerName:
      typeof nested.leadOwnerName === "string" ? nested.leadOwnerName : null,
    pipelineId: typeof nested.pipelineId === "string" ? nested.pipelineId : null,
    pipelineName:
      typeof nested.pipelineName === "string" ? nested.pipelineName : null,
    stageId: typeof nested.stageId === "string" ? nested.stageId : null,
    stageName: typeof nested.stageName === "string" ? nested.stageName : null,
    leadSource: typeof nested.leadSource === "string" ? nested.leadSource : null,
    leadSourceType:
      typeof nested.leadSourceType === "string" ? nested.leadSourceType : null,
    assignedStaffId:
      typeof nested.assignedStaffId === "string" ? nested.assignedStaffId : null,
    assignedStaffName:
      typeof nested.assignedStaffName === "string"
        ? nested.assignedStaffName
        : null,
    matchedBy:
      nested.matchedBy === "leadId" ||
      nested.matchedBy === "mobile" ||
      nested.matchedBy === "nationalCode" ||
      nested.matchedBy === "email" ||
      nested.matchedBy === "created"
        ? nested.matchedBy
        : "created",
    linkedAt:
      typeof nested.linkedAt === "string"
        ? nested.linkedAt
        : new Date().toISOString(),
  };
}

export type { LeadSourceType, CrmStageType, Prisma };
