/**
 * Read-only Automation facades for Dashboard Platform (Sprint 6).
 * Never runs the processor or mutates rules/executions.
 */

import { AutomationExecutionStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

export type AutomationActivitySummary = {
  succeeded24h: number;
  failed24h: number;
  skipped24h: number;
  pending: number;
  deadLetter: number;
};

export async function readAutomationActivitySummary(params: {
  organizationId: string;
}): Promise<AutomationActivitySummary> {
  const since = new Date(Date.now() - 24 * 3_600_000);
  const [succeeded24h, failed24h, skipped24h, pending, deadLetter] =
    await Promise.all([
      prisma.automationExecution.count({
        where: {
          organizationId: params.organizationId,
          status: AutomationExecutionStatus.SUCCEEDED,
          completedAt: { gte: since },
        },
      }),
      prisma.automationExecution.count({
        where: {
          organizationId: params.organizationId,
          status: AutomationExecutionStatus.FAILED,
          completedAt: { gte: since },
        },
      }),
      prisma.automationExecution.count({
        where: {
          organizationId: params.organizationId,
          status: AutomationExecutionStatus.SKIPPED,
          completedAt: { gte: since },
        },
      }),
      prisma.automationExecution.count({
        where: {
          organizationId: params.organizationId,
          status: {
            in: [
              AutomationExecutionStatus.PENDING,
              AutomationExecutionStatus.RUNNING,
            ],
          },
        },
      }),
      prisma.automationExecution.count({
        where: {
          organizationId: params.organizationId,
          status: AutomationExecutionStatus.DEAD_LETTER,
        },
      }),
    ]);
  return { succeeded24h, failed24h, skipped24h, pending, deadLetter };
}

export type StaffNotificationSummary = {
  unreadCount: number;
  latest: Array<{
    id: string;
    title: string;
    body: string | null;
    createdAt: string;
    entityType: string | null;
    entityId: string | null;
  }>;
};

export async function readStaffNotificationSummary(params: {
  organizationId: string;
  userId: string;
  limit?: number;
}): Promise<StaffNotificationSummary> {
  const limit = Math.min(Math.max(params.limit ?? 5, 1), 20);
  const [unreadCount, latest] = await Promise.all([
    prisma.staffNotification.count({
      where: {
        organizationId: params.organizationId,
        userId: params.userId,
        readAt: null,
      },
    }),
    prisma.staffNotification.findMany({
      where: {
        organizationId: params.organizationId,
        userId: params.userId,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        title: true,
        body: true,
        createdAt: true,
        entityType: true,
        entityId: true,
      },
    }),
  ]);
  return {
    unreadCount,
    latest: latest.map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
      entityType: row.entityType,
      entityId: row.entityId,
    })),
  };
}
