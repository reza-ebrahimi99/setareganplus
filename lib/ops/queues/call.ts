import {
  CrmTaskStatus,
  CrmTaskType,
  RegistrationStatus,
} from "@/generated/prisma/enums";
import type { OperationalQueueItem, OpsQueueListQuery } from "@/lib/ops/types";
import { DEFAULT_QUEUE_LIMIT, MAX_QUEUE_LIMIT } from "@/lib/ops/types";
import {
  evaluateFirstContactSla,
  resolveOpsSlaPolicy,
} from "@/lib/ops/sla-policy";
import { scoreBandPriority, taskPriorityToOps } from "@/lib/ops/priority";
import { prisma } from "@/lib/prisma";

export async function listCallQueue(
  query: OpsQueueListQuery,
): Promise<OperationalQueueItem[]> {
  const limit = Math.min(
    query.limit ?? DEFAULT_QUEUE_LIMIT,
    MAX_QUEUE_LIMIT,
  );
  const now = new Date();
  const policy = await resolveOpsSlaPolicy(query.organizationId);
  const items: OperationalQueueItem[] = [];

  const callTasks = await prisma.crmTask.findMany({
    where: {
      organizationId: query.organizationId,
      deletedAt: null,
      taskType: CrmTaskType.CALL,
      status: { in: [CrmTaskStatus.OPEN, CrmTaskStatus.IN_PROGRESS] },
      ...(query.ownerUserId
        ? { assignedToUserId: query.ownerUserId }
        : {}),
      ...(query.branchIds
        ? { lead: { branchId: { in: [...query.branchIds] } } }
        : {}),
    },
    orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
    take: limit,
    select: {
      id: true,
      organizationId: true,
      leadId: true,
      assignedToUserId: true,
      priority: true,
      dueAt: true,
      createdAt: true,
      lead: { select: { ownerUserId: true, scoreBand: true } },
    },
  });

  for (const task of callTasks) {
    items.push({
      queueId: "CALL",
      entityType: "CRM_TASK",
      entityId: task.id,
      organizationId: task.organizationId,
      ownerUserId: task.assignedToUserId ?? task.lead.ownerUserId,
      priority: taskPriorityToOps(task.priority),
      dueAt: task.dueAt?.toISOString() ?? null,
      slaState: task.dueAt
        ? task.dueAt.getTime() < now.getTime()
          ? "BREACHED"
          : "OK"
        : "OK",
      createdAt: task.createdAt.toISOString(),
      metadata: {
        leadId: task.leadId,
        scoreBand: task.lead.scoreBand,
        kind: "CALL_TASK",
      },
    });
  }

  const remaining = Math.max(0, limit - items.length);
  if (remaining > 0) {
    const regs = await prisma.registration.findMany({
      where: {
        organizationId: query.organizationId,
        deletedAt: null,
        status: RegistrationStatus.NEEDS_CALL,
        ...(query.branchIds
          ? { branchId: { in: [...query.branchIds] } }
          : {}),
      },
      orderBy: [{ updatedAt: "asc" }],
      take: remaining,
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
        queueId: "CALL",
        entityType: "REGISTRATION",
        entityId: reg.id,
        organizationId: reg.organizationId,
        ownerUserId: reg.lead?.ownerUserId ?? null,
        priority: "HIGH",
        dueAt: reg.updatedAt.toISOString(),
        slaState: "AT_RISK",
        createdAt: reg.createdAt.toISOString(),
        metadata: {
          leadId: reg.leadId,
          kind: "REGISTRATION_NEEDS_CALL",
        },
      });
    }
  }

  const still = Math.max(0, limit - items.length);
  if (still > 0) {
    const cutoff = new Date(
      now.getTime() - policy.firstContactHours * 3_600_000,
    );
    const noContact = await prisma.lead.findMany({
      where: {
        organizationId: query.organizationId,
        deletedAt: null,
        status: { notIn: ["ENROLLED", "LOST"] },
        createdAt: { lte: cutoff },
        OR: [{ lastContactAt: null }, { lastContactAt: { lt: cutoff } }],
        ...(query.branchIds
          ? { branchId: { in: [...query.branchIds] } }
          : {}),
        ...(query.ownerUserId
          ? { ownerUserId: query.ownerUserId }
          : {}),
      },
      orderBy: [{ createdAt: "asc" }],
      take: still,
      select: {
        id: true,
        organizationId: true,
        ownerUserId: true,
        createdAt: true,
        lastContactAt: true,
        scoreBand: true,
      },
    });
    for (const lead of noContact) {
      items.push({
        queueId: "CALL",
        entityType: "LEAD",
        entityId: lead.id,
        organizationId: lead.organizationId,
        ownerUserId: lead.ownerUserId,
        priority: scoreBandPriority(lead.scoreBand),
        dueAt: cutoff.toISOString(),
        slaState: evaluateFirstContactSla({
          createdAt: lead.createdAt,
          lastContactAt: lead.lastContactAt,
          policy,
          now,
        }),
        createdAt: lead.createdAt.toISOString(),
        metadata: {
          kind: "NO_CONTACT",
          scoreBand: lead.scoreBand,
        },
      });
    }
  }

  return items.slice(0, limit);
}
