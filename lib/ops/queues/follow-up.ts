/**
 * Follow-up Queue — primary clock: Lead.nextFollowUpAt (approved design).
 * Secondary: open FOLLOW_UP tasks past due flagged in metadata.
 */

import { CrmTaskStatus, CrmTaskType } from "@/generated/prisma/enums";
import type { OperationalQueueItem, OpsQueueListQuery } from "@/lib/ops/types";
import { DEFAULT_QUEUE_LIMIT, MAX_QUEUE_LIMIT } from "@/lib/ops/types";
import { evaluateFollowUpSla, resolveOpsSlaPolicy } from "@/lib/ops/sla-policy";
import { scoreBandPriority } from "@/lib/ops/priority";
import { prisma } from "@/lib/prisma";

export async function listFollowUpQueue(
  query: OpsQueueListQuery,
): Promise<OperationalQueueItem[]> {
  const limit = Math.min(
    query.limit ?? DEFAULT_QUEUE_LIMIT,
    MAX_QUEUE_LIMIT,
  );
  const now = new Date();
  const policy = await resolveOpsSlaPolicy(query.organizationId);

  const leads = await prisma.lead.findMany({
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
    take: limit,
    select: {
      id: true,
      organizationId: true,
      ownerUserId: true,
      createdAt: true,
      nextFollowUpAt: true,
      scoreBand: true,
    },
  });

  const leadIds = leads.map((l) => l.id);
  const secondaryTasks =
    leadIds.length === 0
      ? []
      : await prisma.crmTask.findMany({
          where: {
            organizationId: query.organizationId,
            deletedAt: null,
            leadId: { in: leadIds },
            taskType: CrmTaskType.FOLLOW_UP,
            status: { in: [CrmTaskStatus.OPEN, CrmTaskStatus.IN_PROGRESS] },
            dueAt: { lt: now },
          },
          select: { leadId: true, id: true, dueAt: true },
        });
  const overdueTaskByLead = new Map(
    secondaryTasks.map((t) => [t.leadId, t]),
  );

  return leads.map((lead) => {
    const due = lead.nextFollowUpAt!;
    const secondary = overdueTaskByLead.get(lead.id);
    return {
      queueId: "FOLLOW_UP" as const,
      entityType: "LEAD" as const,
      entityId: lead.id,
      organizationId: lead.organizationId,
      ownerUserId: lead.ownerUserId,
      priority: scoreBandPriority(lead.scoreBand),
      dueAt: due.toISOString(),
      slaState: evaluateFollowUpSla({ dueAt: due, policy, now }),
      createdAt: lead.createdAt.toISOString(),
      metadata: {
        scoreBand: lead.scoreBand,
        secondaryOverdueTaskId: secondary?.id ?? null,
        secondaryTaskDueAt: secondary?.dueAt?.toISOString() ?? null,
      },
    };
  });
}
