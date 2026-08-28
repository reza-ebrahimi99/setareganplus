/**
 * Append-only lead ownership periods (Admissions CRM v2 Sprint 2 / 2.6).
 * DB enforces at most one open period per lead (partial unique index).
 */

import type { Prisma } from "@/generated/prisma/client";
import { LeadOwnershipHistorySource } from "@/generated/prisma/enums";
import type { LeadOwnershipSource } from "@/lib/crm/lead-ownership";
import { prisma } from "@/lib/prisma";

function mapSource(
  source: LeadOwnershipSource,
): LeadOwnershipHistorySource {
  switch (source) {
    case "MANUAL":
      return LeadOwnershipHistorySource.MANUAL;
    case "BULK":
      return LeadOwnershipHistorySource.BULK;
    case "AUTOMATION":
      return LeadOwnershipHistorySource.AUTOMATION;
    case "IMPORT":
      return LeadOwnershipHistorySource.IMPORT;
    default:
      return LeadOwnershipHistorySource.SYSTEM;
  }
}

export { mapSource as mapLeadOwnershipHistorySource };

/**
 * Ensures an open ownership period exists for a newly created lead.
 * Concurrent creates collide on the partial unique index and become no-ops.
 */
export async function ensureOpenOwnershipPeriod(params: {
  organizationId: string;
  leadId: string;
  ownerUserId: string | null;
  source?: LeadOwnershipSource;
  actorUserId?: string | null;
  effectiveFrom?: Date;
  tx?: Prisma.TransactionClient;
}): Promise<void> {
  const client = params.tx ?? prisma;
  const open = await client.leadOwnershipHistory.findFirst({
    where: {
      organizationId: params.organizationId,
      leadId: params.leadId,
      effectiveTo: null,
    },
    select: { id: true },
  });
  if (open) return;

  try {
    await client.leadOwnershipHistory.create({
      data: {
        organizationId: params.organizationId,
        leadId: params.leadId,
        ownerUserId: params.ownerUserId,
        effectiveFrom: params.effectiveFrom ?? new Date(),
        effectiveTo: null,
        source: mapSource(params.source ?? "SYSTEM"),
        actorUserId: params.actorUserId ?? null,
      },
    });
  } catch {
    // Unique open-period index: another writer already opened the period.
    const raced = await client.leadOwnershipHistory.findFirst({
      where: {
        organizationId: params.organizationId,
        leadId: params.leadId,
        effectiveTo: null,
      },
      select: { id: true },
    });
    if (!raced) throw new Error("OWNERSHIP_OPEN_PERIOD_CREATE_FAILED");
  }
}

/**
 * Closes the open period (if any) and opens a new one for the new owner.
 * Closing uses UPDATE of effectiveTo only (period model); row credit fields stay fixed.
 */
export async function recordOwnershipPeriodChange(params: {
  organizationId: string;
  leadId: string;
  previousOwnerUserId: string | null;
  ownerUserId: string | null;
  source: LeadOwnershipSource;
  actorUserId?: string | null;
  at?: Date;
  tx: Prisma.TransactionClient;
}): Promise<void> {
  const at = params.at ?? new Date();
  const source = mapSource(params.source);

  await params.tx.leadOwnershipHistory.updateMany({
    where: {
      organizationId: params.organizationId,
      leadId: params.leadId,
      effectiveTo: null,
    },
    data: { effectiveTo: at },
  });

  try {
    await params.tx.leadOwnershipHistory.create({
      data: {
        organizationId: params.organizationId,
        leadId: params.leadId,
        ownerUserId: params.ownerUserId,
        effectiveFrom: at,
        effectiveTo: null,
        source,
        actorUserId: params.actorUserId ?? null,
      },
    });
  } catch {
    const open = await params.tx.leadOwnershipHistory.findFirst({
      where: {
        organizationId: params.organizationId,
        leadId: params.leadId,
        effectiveTo: null,
      },
      select: { id: true, ownerUserId: true },
    });
    if (open && open.ownerUserId === params.ownerUserId) return;
    throw new Error("OWNERSHIP_PERIOD_CHANGE_FAILED");
  }
}

/**
 * Pure helper for tests: apply a period transition on an in-memory timeline.
 */
export function applyOwnershipPeriodTransition(params: {
  periods: Array<{
    ownerUserId: string | null;
    effectiveFrom: Date;
    effectiveTo: Date | null;
  }>;
  nextOwnerUserId: string | null;
  at: Date;
}): Array<{
  ownerUserId: string | null;
  effectiveFrom: Date;
  effectiveTo: Date | null;
}> {
  const closed = params.periods.map((period) =>
    period.effectiveTo === null
      ? { ...period, effectiveTo: params.at }
      : period,
  );
  return [
    ...closed,
    {
      ownerUserId: params.nextOwnerUserId,
      effectiveFrom: params.at,
      effectiveTo: null,
    },
  ];
}
