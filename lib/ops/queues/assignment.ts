import type { OperationalQueueItem, OpsQueueListQuery } from "@/lib/ops/types";
import { DEFAULT_QUEUE_LIMIT, MAX_QUEUE_LIMIT } from "@/lib/ops/types";
import { scoreBandPriority } from "@/lib/ops/priority";
import { prisma } from "@/lib/prisma";

export async function listAssignmentQueue(
  query: OpsQueueListQuery,
): Promise<OperationalQueueItem[]> {
  const limit = Math.min(
    query.limit ?? DEFAULT_QUEUE_LIMIT,
    MAX_QUEUE_LIMIT,
  );
  const leads = await prisma.lead.findMany({
    where: {
      organizationId: query.organizationId,
      deletedAt: null,
      ownerUserId: null,
      ...(query.branchIds
        ? { branchId: { in: [...query.branchIds] } }
        : {}),
    },
    orderBy: [{ createdAt: "asc" }],
    take: limit,
    select: {
      id: true,
      organizationId: true,
      ownerUserId: true,
      createdAt: true,
      scoreBand: true,
      sourceType: true,
      source: true,
    },
  });

  return leads.map((lead) => ({
    queueId: "ASSIGNMENT" as const,
    entityType: "LEAD" as const,
    entityId: lead.id,
    organizationId: lead.organizationId,
    ownerUserId: lead.ownerUserId,
    priority: scoreBandPriority(lead.scoreBand),
    dueAt: null,
    slaState: "OK" as const,
    createdAt: lead.createdAt.toISOString(),
    metadata: {
      sourceType: lead.sourceType,
      source: lead.source,
      scoreBand: lead.scoreBand,
    },
  }));
}
