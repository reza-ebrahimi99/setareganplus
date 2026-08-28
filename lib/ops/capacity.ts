/**
 * Capacity Engine — load counting + MANUAL / ROUND_ROBIN / LEAST_LOAD dispatch.
 * Ownership mutations always go through setLeadOwner.
 */

import { OpsDispatchStrategy } from "@/generated/prisma/enums";
import { isEligibleLeadOwner, setLeadOwner } from "@/lib/crm/lead-ownership";
import type { OpsDispatchStrategy as OpsDispatchStrategyValue } from "@/lib/ops/types";
import { prisma } from "@/lib/prisma";

export type OpsCapacityPolicyResolved = {
  dispatchStrategy: OpsDispatchStrategyValue;
  softLimitOwnedLeads: number | null;
  hardLimitOwnedLeads: number | null;
  roundRobinCursorUserId: string | null;
};

const IMPLEMENTED: ReadonlySet<OpsDispatchStrategyValue> = new Set([
  "MANUAL",
  "ROUND_ROBIN",
  "LEAST_LOAD",
]);

export async function resolveOpsCapacityPolicy(
  organizationId: string,
): Promise<OpsCapacityPolicyResolved> {
  const existing = await prisma.opsCapacityPolicy.findUnique({
    where: { organizationId },
  });
  if (existing?.isActive) {
    return {
      dispatchStrategy: existing.dispatchStrategy,
      softLimitOwnedLeads: existing.softLimitOwnedLeads,
      hardLimitOwnedLeads: existing.hardLimitOwnedLeads,
      roundRobinCursorUserId: existing.roundRobinCursorUserId,
    };
  }
  try {
    const created = await prisma.opsCapacityPolicy.create({
      data: {
        organizationId,
        dispatchStrategy: OpsDispatchStrategy.MANUAL,
        isActive: true,
      },
    });
    return {
      dispatchStrategy: created.dispatchStrategy,
      softLimitOwnedLeads: created.softLimitOwnedLeads,
      hardLimitOwnedLeads: created.hardLimitOwnedLeads,
      roundRobinCursorUserId: created.roundRobinCursorUserId,
    };
  } catch {
    return {
      dispatchStrategy: "MANUAL",
      softLimitOwnedLeads: null,
      hardLimitOwnedLeads: null,
      roundRobinCursorUserId: null,
    };
  }
}

export async function countOwnedLeadsByUser(params: {
  organizationId: string;
  userIds: readonly string[];
  branchIds?: readonly string[];
}): Promise<Map<string, number>> {
  if (params.userIds.length === 0) return new Map();
  const groups = await prisma.lead.groupBy({
    by: ["ownerUserId"],
    where: {
      organizationId: params.organizationId,
      deletedAt: null,
      ownerUserId: { in: [...params.userIds] },
      ...(params.branchIds
        ? { branchId: { in: [...params.branchIds] } }
        : {}),
    },
    _count: { _all: true },
  });
  const map = new Map<string, number>();
  for (const id of params.userIds) map.set(id, 0);
  for (const group of groups) {
    if (group.ownerUserId) {
      map.set(group.ownerUserId, group._count._all);
    }
  }
  return map;
}

function underHardLimit(
  load: number,
  hardLimit: number | null,
): boolean {
  if (hardLimit === null || hardLimit === undefined) return true;
  return load < hardLimit;
}

/**
 * Pick next advisor for dispatch. Returns null for MANUAL or empty pool.
 */
export async function pickDispatchOwner(params: {
  organizationId: string;
  branchId: string;
  candidateUserIds: readonly string[];
}): Promise<
  | { ok: true; ownerUserId: string; strategy: OpsDispatchStrategyValue }
  | { ok: false; error: string }
> {
  const policy = await resolveOpsCapacityPolicy(params.organizationId);
  if (!IMPLEMENTED.has(policy.dispatchStrategy)) {
    return {
      ok: false,
      error: `استراتژی ${policy.dispatchStrategy} هنوز پیاده‌سازی نشده است.`,
    };
  }
  if (policy.dispatchStrategy === "MANUAL") {
    return { ok: false, error: "تخصیص خودکار در حالت MANUAL غیرفعال است." };
  }

  const eligible: string[] = [];
  for (const userId of params.candidateUserIds) {
    const ok = await isEligibleLeadOwner({
      organizationId: params.organizationId,
      branchId: params.branchId,
      userId,
    });
    if (ok) eligible.push(userId);
  }
  if (eligible.length === 0) {
    return { ok: false, error: "هیچ مشاور واجد شرایطی یافت نشد." };
  }

  const loads = await countOwnedLeadsByUser({
    organizationId: params.organizationId,
    userIds: eligible,
  });
  const available = eligible.filter((id) =>
    underHardLimit(loads.get(id) ?? 0, policy.hardLimitOwnedLeads),
  );
  if (available.length === 0) {
    return { ok: false, error: "همه مشاوران در سقف ظرفیت هستند." };
  }

  if (policy.dispatchStrategy === "LEAST_LOAD") {
    available.sort(
      (a, b) => (loads.get(a) ?? 0) - (loads.get(b) ?? 0) || a.localeCompare(b),
    );
    return {
      ok: true,
      ownerUserId: available[0]!,
      strategy: "LEAST_LOAD",
    };
  }

  // ROUND_ROBIN
  const sorted = [...available].sort((a, b) => a.localeCompare(b));
  const cursor = policy.roundRobinCursorUserId;
  let idx = cursor ? sorted.findIndex((id) => id === cursor) : -1;
  const next = sorted[(idx + 1) % sorted.length]!;
  await prisma.opsCapacityPolicy.update({
    where: { organizationId: params.organizationId },
    data: { roundRobinCursorUserId: next },
  });
  return { ok: true, ownerUserId: next, strategy: "ROUND_ROBIN" };
}

/**
 * Dispatch assignment for a lead — always via setLeadOwner.
 */
export async function dispatchLeadAssignment(params: {
  organizationId: string;
  leadId: string;
  candidateUserIds: readonly string[];
  actorUserId?: string | null;
  source?: "SYSTEM" | "AUTOMATION";
}): Promise<
  | { ok: true; ownerUserId: string; changed: boolean }
  | { ok: false; error: string }
> {
  const lead = await prisma.lead.findFirst({
    where: {
      id: params.leadId,
      organizationId: params.organizationId,
      deletedAt: null,
    },
    select: { id: true, branchId: true, ownerUserId: true },
  });
  if (!lead) return { ok: false, error: "لید یافت نشد." };
  if (lead.ownerUserId) {
    return { ok: false, error: "لید از قبل مسئول دارد." };
  }

  const picked = await pickDispatchOwner({
    organizationId: params.organizationId,
    branchId: lead.branchId,
    candidateUserIds: params.candidateUserIds,
  });
  if (!picked.ok) return picked;

  const result = await setLeadOwner({
    organizationId: params.organizationId,
    leadId: lead.id,
    ownerUserId: picked.ownerUserId,
    actorUserId: params.actorUserId,
    source: params.source ?? "SYSTEM",
  });
  if (!result.ok) return { ok: false, error: result.error };
  return {
    ok: true,
    ownerUserId: picked.ownerUserId,
    changed: result.changed,
  };
}
