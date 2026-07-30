import { OpsEscalationStatus } from "@/generated/prisma/enums";
import type { OperationalQueueItem, OpsQueueListQuery } from "@/lib/ops/types";
import { DEFAULT_QUEUE_LIMIT, MAX_QUEUE_LIMIT } from "@/lib/ops/types";
import { prisma } from "@/lib/prisma";

export async function listEscalationQueue(
  query: OpsQueueListQuery,
): Promise<OperationalQueueItem[]> {
  const limit = Math.min(
    query.limit ?? DEFAULT_QUEUE_LIMIT,
    MAX_QUEUE_LIMIT,
  );
  const rows = await prisma.opsEscalation.findMany({
    where: {
      organizationId: query.organizationId,
      status: OpsEscalationStatus.OPEN,
      ...(query.ownerUserId && query.ownerUserId.length > 0
        ? {
            leadId: {
              in: await prisma.lead
                .findMany({
                  where: {
                    organizationId: query.organizationId,
                    ownerUserId: query.ownerUserId,
                    deletedAt: null,
                  },
                  select: { id: true },
                  take: 5_000,
                })
                .then((leads) => leads.map((l) => l.id)),
            },
          }
        : {}),
    },
    orderBy: [{ openedAt: "asc" }],
    take: limit,
    select: {
      id: true,
      organizationId: true,
      entityType: true,
      entityId: true,
      leadId: true,
      reason: true,
      openedAt: true,
      createdAt: true,
      queueId: true,
    },
  });

  const leadIds = [
    ...new Set(rows.flatMap((r) => (r.leadId ? [r.leadId] : []))),
  ];
  const owners =
    leadIds.length === 0
      ? []
      : await prisma.lead.findMany({
          where: { organizationId: query.organizationId, id: { in: leadIds } },
          select: { id: true, ownerUserId: true },
        });
  const ownerByLead = new Map(owners.map((l) => [l.id, l.ownerUserId]));

  return rows.map((row) => ({
    queueId: "ESCALATION" as const,
    entityType: row.entityType as OperationalQueueItem["entityType"],
    entityId: row.entityId,
    organizationId: row.organizationId,
    ownerUserId: row.leadId ? ownerByLead.get(row.leadId) ?? null : null,
    priority: "URGENT" as const,
    dueAt: row.openedAt.toISOString(),
    slaState: "BREACHED" as const,
    createdAt: row.createdAt.toISOString(),
    metadata: {
      escalationId: row.id,
      reason: row.reason,
      escalated: true,
      sourceQueueId: row.queueId,
      leadId: row.leadId,
    },
  }));
}
