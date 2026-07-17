/**
 * Canonical Lead Owner domain service.
 *
 * Lead.ownerUserId / Lead.owner is the single source of truth for the sales
 * advisor responsible for a lead. All ownership changes after creation use
 * this service. Intake paths may set the initial owner in their creation
 * flow, but must emit the same activity/audit metadata for downstream
 * CRM workflows.
 */
import type { Prisma } from "@/generated/prisma/client";
import { AuditAction, CrmActivityType } from "@/generated/prisma/enums";
import { permissionsForRole } from "@/lib/auth/permissions";
import { recordCrmActivity } from "@/lib/crm/activity";
import { prisma } from "@/lib/prisma";

export type LeadOwnershipSource =
  | "MANUAL"
  | "BULK"
  | "AUTOMATION"
  | "IMPORT"
  | "SYSTEM";

export type SetLeadOwnerResult =
  | {
      ok: true;
      changed: boolean;
      previousOwnerUserId: string | null;
      ownerUserId: string | null;
      branchId: string;
    }
  | { ok: false; error: string };

export type LeadOwnerSnapshot = {
  id: string;
  branchId: string;
  ownerUserId: string | null;
};

export async function isEligibleLeadOwner(params: {
  organizationId: string;
  branchId: string;
  userId: string;
  tx?: Prisma.TransactionClient;
}): Promise<boolean> {
  const client = params.tx ?? prisma;
  const owner = await client.organizationMembership.findFirst({
    where: {
      organizationId: params.organizationId,
      userId: params.userId,
      status: "ACTIVE",
      deletedAt: null,
      user: { status: "ACTIVE", deletedAt: null },
      OR: [
        { branchMemberships: { none: { deletedAt: null } } },
        {
          branchMemberships: {
            some: { branchId: params.branchId, deletedAt: null },
          },
        },
      ],
    },
    select: { role: true },
  });
  return Boolean(
    owner && permissionsForRole(owner.role).has("crm.view_assigned"),
  );
}

export async function setLeadOwner(params: {
  organizationId: string;
  leadId: string;
  ownerUserId: string | null;
  actorUserId?: string | null;
  source?: LeadOwnershipSource;
  /** Optional optimistic branch guard supplied by scoped callers. */
  expectedBranchId?: string;
  tx?: Prisma.TransactionClient;
}): Promise<SetLeadOwnerResult> {
  if (!params.tx) {
    return prisma.$transaction((tx) => setLeadOwner({ ...params, tx }));
  }

  const source = params.source ?? "MANUAL";
  const lead = await params.tx.lead.findFirst({
    where: {
      id: params.leadId,
      organizationId: params.organizationId,
      deletedAt: null,
      ...(params.expectedBranchId
        ? { branchId: params.expectedBranchId }
        : {}),
    },
    select: { id: true, branchId: true, ownerUserId: true },
  });
  if (!lead) return { ok: false, error: "لید یافت نشد." };

  if (params.ownerUserId) {
    const eligible = await isEligibleLeadOwner({
      organizationId: params.organizationId,
      branchId: lead.branchId,
      userId: params.ownerUserId,
      tx: params.tx,
    });
    if (!eligible) {
      return {
        ok: false,
        error: "مسئول انتخاب‌شده برای سازمان و شعبه این لید معتبر نیست.",
      };
    }
  }

  if (lead.ownerUserId === params.ownerUserId) {
    return {
      ok: true,
      changed: false,
      previousOwnerUserId: lead.ownerUserId,
      ownerUserId: params.ownerUserId,
      branchId: lead.branchId,
    };
  }

  const updated = await params.tx.lead.updateMany({
    where: {
      id: lead.id,
      organizationId: params.organizationId,
      branchId: lead.branchId,
      deletedAt: null,
      ownerUserId: lead.ownerUserId,
    },
    data: { ownerUserId: params.ownerUserId },
  });
  if (updated.count !== 1) {
    return { ok: false, error: "مالک لید هم‌زمان تغییر کرده است." };
  }

  await recordCrmActivity({
    organizationId: params.organizationId,
    leadId: lead.id,
    activityType: CrmActivityType.OWNER_ASSIGNED,
    title: params.ownerUserId ? "تخصیص مسئول" : "حذف مسئول",
    actorUserId: params.actorUserId,
    metadata: {
      previousOwnerUserId: lead.ownerUserId,
      ownerUserId: params.ownerUserId,
      source,
    },
    tx: params.tx,
  });

  if (params.actorUserId) {
    await params.tx.auditLog.create({
      data: {
        organizationId: params.organizationId,
        branchId: lead.branchId,
        actorUserId: params.actorUserId,
        action: AuditAction.CRM_LEAD_ASSIGNED,
        entityType: "Lead",
        entityId: lead.id,
        metadata: {
          previousOwnerUserId: lead.ownerUserId,
          ownerUserId: params.ownerUserId,
          source,
        },
      },
    });
  }

  return {
    ok: true,
    changed: true,
    previousOwnerUserId: lead.ownerUserId,
    ownerUserId: params.ownerUserId,
    branchId: lead.branchId,
  };
}

export async function setLeadOwnersBulk(params: {
  organizationId: string;
  leads: readonly LeadOwnerSnapshot[];
  ownerUserId: string | null;
  actorUserId: string;
  source: "BULK" | "IMPORT";
  tx: Prisma.TransactionClient;
}): Promise<
  | { ok: true; changedLeadIds: string[] }
  | { ok: false; error: string }
> {
  const changedLeads = params.leads.filter(
    (lead) => lead.ownerUserId !== params.ownerUserId,
  );
  if (changedLeads.length === 0) {
    return { ok: true, changedLeadIds: [] };
  }

  if (params.ownerUserId) {
    const owner = await params.tx.organizationMembership.findFirst({
      where: {
        organizationId: params.organizationId,
        userId: params.ownerUserId,
        status: "ACTIVE",
        deletedAt: null,
        user: { status: "ACTIVE", deletedAt: null },
      },
      select: {
        role: true,
        branchMemberships: {
          where: { deletedAt: null },
          select: { branchId: true },
        },
      },
    });
    const allowedBranches = new Set(
      owner?.branchMemberships.map((membership) => membership.branchId) ?? [],
    );
    if (
      !owner ||
      !permissionsForRole(owner.role).has("crm.view_assigned") ||
      (allowedBranches.size > 0 &&
        changedLeads.some((lead) => !allowedBranches.has(lead.branchId)))
    ) {
      return {
        ok: false,
        error: "مسئول انتخاب‌شده به شعبه همه لیدها دسترسی ندارد.",
      };
    }
  }

  const updated = await params.tx.lead.updateMany({
    where: {
      organizationId: params.organizationId,
      deletedAt: null,
      OR: changedLeads.map((lead) => ({
        id: lead.id,
        branchId: lead.branchId,
        ownerUserId: lead.ownerUserId,
      })),
    },
    data: { ownerUserId: params.ownerUserId },
  });
  if (updated.count !== changedLeads.length) {
    return {
      ok: false,
      error: "مالک یا شعبه یک یا چند لید هم‌زمان تغییر کرده است.",
    };
  }

  const occurredAt = new Date();
  await params.tx.crmActivity.createMany({
    data: changedLeads.map((lead) => ({
      organizationId: params.organizationId,
      leadId: lead.id,
      activityType: CrmActivityType.OWNER_ASSIGNED,
      title: params.ownerUserId ? "تخصیص مسئول" : "حذف مسئول",
      actorUserId: params.actorUserId,
      metadata: {
        previousOwnerUserId: lead.ownerUserId,
        ownerUserId: params.ownerUserId,
        source: params.source,
      },
      occurredAt,
    })),
  });
  await params.tx.auditLog.createMany({
    data: changedLeads.map((lead) => ({
      organizationId: params.organizationId,
      branchId: lead.branchId,
      actorUserId: params.actorUserId,
      action: AuditAction.CRM_LEAD_ASSIGNED,
      entityType: "Lead",
      entityId: lead.id,
      metadata: {
        previousOwnerUserId: lead.ownerUserId,
        ownerUserId: params.ownerUserId,
        source: params.source,
      },
    })),
  });

  return {
    ok: true,
    changedLeadIds: changedLeads.map((lead) => lead.id),
  };
}
