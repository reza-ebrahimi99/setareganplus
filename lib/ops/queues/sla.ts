import { RegistrationStatus } from "@/generated/prisma/enums";
import type { OperationalQueueItem, OpsQueueListQuery } from "@/lib/ops/types";
import { DEFAULT_QUEUE_LIMIT, MAX_QUEUE_LIMIT } from "@/lib/ops/types";
import {
  evaluateFirstContactSla,
  evaluateFollowUpSla,
  hoursAgo,
  resolveOpsSlaPolicy,
} from "@/lib/ops/sla-policy";
import { scoreBandPriority } from "@/lib/ops/priority";
import { prisma } from "@/lib/prisma";

export async function listSlaQueue(
  query: OpsQueueListQuery,
): Promise<OperationalQueueItem[]> {
  const limit = Math.min(
    query.limit ?? DEFAULT_QUEUE_LIMIT,
    MAX_QUEUE_LIMIT,
  );
  const now = new Date();
  const policy = await resolveOpsSlaPolicy(query.organizationId);
  const items: OperationalQueueItem[] = [];

  const firstContactCutoff = hoursAgo(policy.firstContactHours, now);
  const leads = await prisma.lead.findMany({
    where: {
      organizationId: query.organizationId,
      deletedAt: null,
      lastContactAt: null,
      createdAt: { lte: firstContactCutoff },
      status: { notIn: ["ENROLLED", "LOST"] },
      ...(query.branchIds
        ? { branchId: { in: [...query.branchIds] } }
        : {}),
      ...(query.ownerUserId
        ? { ownerUserId: query.ownerUserId }
        : {}),
    },
    orderBy: [{ createdAt: "asc" }],
    take: limit,
    select: {
      id: true,
      organizationId: true,
      ownerUserId: true,
      createdAt: true,
      lastContactAt: true,
      nextFollowUpAt: true,
      scoreBand: true,
    },
  });

  for (const lead of leads) {
    const slaState = evaluateFirstContactSla({
      createdAt: lead.createdAt,
      lastContactAt: lead.lastContactAt,
      policy,
      now,
    });
    if (slaState === "OK") continue;
    items.push({
      queueId: "SLA",
      entityType: "LEAD",
      entityId: lead.id,
      organizationId: lead.organizationId,
      ownerUserId: lead.ownerUserId,
      priority: slaState === "BREACHED" ? "URGENT" : "HIGH",
      dueAt: new Date(
        lead.createdAt.getTime() + policy.firstContactHours * 3_600_000,
      ).toISOString(),
      slaState,
      createdAt: lead.createdAt.toISOString(),
      metadata: {
        clock: "FIRST_CONTACT",
        scoreBand: lead.scoreBand,
      },
    });
  }

  const remaining = Math.max(0, limit - items.length);
  if (remaining > 0) {
    const followUps = await prisma.lead.findMany({
      where: {
        organizationId: query.organizationId,
        deletedAt: null,
        nextFollowUpAt: { lte: now },
        ...(query.branchIds
          ? { branchId: { in: [...query.branchIds] } }
          : {}),
        ...(query.ownerUserId
          ? { ownerUserId: query.ownerUserId }
          : {}),
      },
      orderBy: [{ nextFollowUpAt: "asc" }],
      take: remaining,
      select: {
        id: true,
        organizationId: true,
        ownerUserId: true,
        createdAt: true,
        nextFollowUpAt: true,
        scoreBand: true,
      },
    });
    for (const lead of followUps) {
      if (!lead.nextFollowUpAt) continue;
      const slaState = evaluateFollowUpSla({
        dueAt: lead.nextFollowUpAt,
        policy,
        now,
      });
      if (slaState === "OK") continue;
      items.push({
        queueId: "SLA",
        entityType: "LEAD",
        entityId: lead.id,
        organizationId: lead.organizationId,
        ownerUserId: lead.ownerUserId,
        priority: slaState === "BREACHED" ? "URGENT" : scoreBandPriority(lead.scoreBand),
        dueAt: lead.nextFollowUpAt.toISOString(),
        slaState,
        createdAt: lead.createdAt.toISOString(),
        metadata: { clock: "FOLLOW_UP", scoreBand: lead.scoreBand },
      });
    }
  }

  const still = Math.max(0, limit - items.length);
  if (still > 0) {
    const needsCallCutoff = hoursAgo(policy.registrationNeedsCallHours, now);
    const regs = await prisma.registration.findMany({
      where: {
        organizationId: query.organizationId,
        deletedAt: null,
        status: RegistrationStatus.NEEDS_CALL,
        updatedAt: { lte: needsCallCutoff },
        ...(query.branchIds
          ? { branchId: { in: [...query.branchIds] } }
          : {}),
      },
      orderBy: [{ updatedAt: "asc" }],
      take: still,
      select: {
        id: true,
        organizationId: true,
        leadId: true,
        createdAt: true,
        updatedAt: true,
        lead: { select: { ownerUserId: true } },
      },
    });
    for (const reg of regs) {
      items.push({
        queueId: "SLA",
        entityType: "REGISTRATION",
        entityId: reg.id,
        organizationId: reg.organizationId,
        ownerUserId: reg.lead?.ownerUserId ?? null,
        priority: "URGENT",
        dueAt: new Date(
          reg.updatedAt.getTime() +
            policy.registrationNeedsCallHours * 3_600_000,
        ).toISOString(),
        slaState: "BREACHED",
        createdAt: reg.createdAt.toISOString(),
        metadata: {
          clock: "REGISTRATION_NEEDS_CALL",
          leadId: reg.leadId,
        },
      });
    }
  }

  return items.slice(0, limit);
}
