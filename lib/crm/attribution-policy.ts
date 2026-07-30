/**
 * Organization attribution policies (Admissions CRM v2 Sprint 2 / 2.6).
 */

import type { Prisma } from "@/generated/prisma/client";
import {
  AttributionPolicyMode,
  type AttributionPolicyMode as AttributionPolicyModeValue,
} from "@/generated/prisma/enums";
import {
  buildAttributionCorrelationId,
  logPolicyResolved,
} from "@/lib/crm/attribution-observability";
import { prisma } from "@/lib/prisma";

export const DEFAULT_ATTRIBUTION_POLICY_KEY = "default_current_owner" as const;

export type ResolvedAttributionPolicy = {
  id: string;
  policyKey: string;
  version: number;
  mode: AttributionPolicyModeValue;
  name: string;
};

/**
 * Pure policy credit resolution (unit-tested).
 */
export function pickAttributedUserId(params: {
  mode: AttributionPolicyModeValue;
  currentOwnerUserId: string | null;
  firstOwnerUserId: string | null;
}): string | null {
  if (params.mode === AttributionPolicyMode.FIRST_OWNER) {
    return params.firstOwnerUserId ?? params.currentOwnerUserId;
  }
  return params.currentOwnerUserId;
}

/**
 * Returns the org default active policy, creating CURRENT_OWNER_AT_EVENT v1 if missing.
 */
export async function resolveDefaultAttributionPolicy(params: {
  organizationId: string;
  correlationId?: string;
  revenueKey?: string;
  tx?: Prisma.TransactionClient;
}): Promise<ResolvedAttributionPolicy> {
  const client = params.tx ?? prisma;

  const existing = await client.attributionPolicy.findFirst({
    where: {
      organizationId: params.organizationId,
      isDefault: true,
      isActive: true,
    },
    orderBy: { version: "desc" },
    select: {
      id: true,
      policyKey: true,
      version: true,
      mode: true,
      name: true,
    },
  });
  if (existing) {
    if (params.revenueKey) {
      logPolicyResolved({
        organizationId: params.organizationId,
        correlationId:
          params.correlationId ??
          buildAttributionCorrelationId({ revenueKey: params.revenueKey }),
        revenueKey: params.revenueKey,
        policyKey: existing.policyKey,
        policyVersion: existing.version,
        policyMode: existing.mode,
      });
    }
    return existing;
  }

  try {
    const created = await client.attributionPolicy.create({
      data: {
        organizationId: params.organizationId,
        policyKey: DEFAULT_ATTRIBUTION_POLICY_KEY,
        version: 1,
        mode: AttributionPolicyMode.CURRENT_OWNER_AT_EVENT,
        name: "مالک فعلی در زمان رویداد درآمد",
        isDefault: true,
        isActive: true,
      },
      select: {
        id: true,
        policyKey: true,
        version: true,
        mode: true,
        name: true,
      },
    });
    if (params.revenueKey) {
      logPolicyResolved({
        organizationId: params.organizationId,
        correlationId:
          params.correlationId ??
          buildAttributionCorrelationId({ revenueKey: params.revenueKey }),
        revenueKey: params.revenueKey,
        policyKey: created.policyKey,
        policyVersion: created.version,
        policyMode: created.mode,
      });
    }
    return created;
  } catch {
    const raced = await client.attributionPolicy.findFirst({
      where: {
        organizationId: params.organizationId,
        isDefault: true,
        isActive: true,
      },
      orderBy: { version: "desc" },
      select: {
        id: true,
        policyKey: true,
        version: true,
        mode: true,
        name: true,
      },
    });
    if (!raced) {
      throw new Error("DEFAULT_ATTRIBUTION_POLICY_MISSING");
    }
    if (params.revenueKey) {
      logPolicyResolved({
        organizationId: params.organizationId,
        correlationId:
          params.correlationId ??
          buildAttributionCorrelationId({ revenueKey: params.revenueKey }),
        revenueKey: params.revenueKey,
        policyKey: raced.policyKey,
        policyVersion: raced.version,
        policyMode: raced.mode,
      });
    }
    return raced;
  }
}

export async function resolveAttributedUserId(params: {
  organizationId: string;
  leadId: string;
  mode: AttributionPolicyModeValue;
  tx?: Prisma.TransactionClient;
}): Promise<string | null> {
  const client = params.tx ?? prisma;

  let firstOwnerUserId: string | null = null;
  if (params.mode === AttributionPolicyMode.FIRST_OWNER) {
    const first = await client.leadOwnershipHistory.findFirst({
      where: {
        organizationId: params.organizationId,
        leadId: params.leadId,
        ownerUserId: { not: null },
      },
      orderBy: { effectiveFrom: "asc" },
      select: { ownerUserId: true },
    });
    firstOwnerUserId = first?.ownerUserId ?? null;
  }

  const lead = await client.lead.findFirst({
    where: {
      id: params.leadId,
      organizationId: params.organizationId,
      deletedAt: null,
    },
    select: { ownerUserId: true },
  });

  return pickAttributedUserId({
    mode: params.mode,
    currentOwnerUserId: lead?.ownerUserId ?? null,
    firstOwnerUserId,
  });
}
