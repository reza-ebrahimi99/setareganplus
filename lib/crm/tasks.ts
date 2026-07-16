/**
 * CRM task helpers with idempotency and overdue derivation.
 */

import {
  CrmActivityType,
  CrmTaskPriority,
  CrmTaskStatus,
  CrmTaskType,
} from "@/generated/prisma/enums";
import { recordCrmActivity } from "@/lib/crm/activity";
import { assertOwnerInOrg } from "@/lib/crm/pipeline";
import { prisma } from "@/lib/prisma";

export function isTaskOverdue(params: {
  status: CrmTaskStatus;
  dueAt: Date | null;
  now?: Date;
}): boolean {
  if (
    params.status === CrmTaskStatus.COMPLETED ||
    params.status === CrmTaskStatus.CANCELLED
  ) {
    return false;
  }
  if (!params.dueAt) return false;
  return params.dueAt.getTime() < (params.now ?? new Date()).getTime();
}

export function displayTaskStatus(
  status: CrmTaskStatus,
  dueAt: Date | null,
  now = new Date(),
): CrmTaskStatus | "OVERDUE" {
  if (isTaskOverdue({ status, dueAt, now })) return "OVERDUE";
  return status;
}

function parseTaskType(raw?: string): CrmTaskType {
  const values = Object.values(CrmTaskType) as string[];
  if (raw && values.includes(raw)) return raw as CrmTaskType;
  return CrmTaskType.FOLLOW_UP;
}

function parsePriority(raw?: string): CrmTaskPriority {
  const values = Object.values(CrmTaskPriority) as string[];
  if (raw && values.includes(raw)) return raw as CrmTaskPriority;
  return CrmTaskPriority.NORMAL;
}

export async function createCrmTask(params: {
  organizationId: string;
  leadId: string;
  title: string;
  description?: string | null;
  taskType?: string;
  priority?: string;
  dueAt?: Date | null;
  dueMinutes?: number;
  assignedToUserId?: string | null;
  createdByUserId?: string | null;
  automationRuleId?: string | null;
  idempotencyKey?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx?: any;
}): Promise<{ id: string; created: boolean }> {
  const client = params.tx ?? prisma;
  const key = params.idempotencyKey?.trim() || null;

  if (key) {
    const existing = await client.crmTask.findFirst({
      where: { organizationId: params.organizationId, idempotencyKey: key },
      select: { id: true },
    });
    if (existing) return { id: existing.id, created: false };
  }

  if (params.assignedToUserId) {
    const ok = await assertOwnerInOrg({
      organizationId: params.organizationId,
      userId: params.assignedToUserId,
    });
    if (!ok) {
      throw new Error("CROSS_ORG_ASSIGNEE");
    }
  }

  const dueAt =
    params.dueAt ??
    (typeof params.dueMinutes === "number" && params.dueMinutes > 0
      ? new Date(Date.now() + params.dueMinutes * 60_000)
      : null);

  try {
    const task = await client.crmTask.create({
      data: {
        organizationId: params.organizationId,
        leadId: params.leadId,
        title: params.title.trim(),
        description: params.description?.trim() || null,
        taskType: parseTaskType(params.taskType),
        priority: parsePriority(params.priority),
        status: CrmTaskStatus.OPEN,
        dueAt,
        assignedToUserId: params.assignedToUserId ?? null,
        createdByUserId: params.createdByUserId ?? null,
        automationRuleId: params.automationRuleId ?? null,
        idempotencyKey: key,
      },
      select: { id: true },
    });

    await recordCrmActivity({
      organizationId: params.organizationId,
      leadId: params.leadId,
      activityType: CrmActivityType.TASK_CREATED,
      title: "وظیفه ایجاد شد",
      summary: params.title.trim(),
      actorUserId: params.createdByUserId,
      relatedTaskId: task.id,
      tx: params.tx,
    });

    return { id: task.id, created: true };
  } catch {
    if (key) {
      const existing = await client.crmTask.findFirst({
        where: { organizationId: params.organizationId, idempotencyKey: key },
        select: { id: true },
      });
      if (existing) return { id: existing.id, created: false };
    }
    throw new Error("TASK_CREATE_FAILED");
  }
}

export async function completeCrmTask(params: {
  organizationId: string;
  taskId: string;
  actorUserId?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const task = await prisma.crmTask.findFirst({
    where: {
      id: params.taskId,
      organizationId: params.organizationId,
      deletedAt: null,
    },
  });
  if (!task) return { ok: false, error: "وظیفه یافت نشد." };
  if (task.status === CrmTaskStatus.COMPLETED) return { ok: true };
  if (task.status === CrmTaskStatus.CANCELLED) {
    return { ok: false, error: "وظیفه لغوشده قابل تکمیل نیست." };
  }

  await prisma.crmTask.update({
    where: { id: task.id },
    data: {
      status: CrmTaskStatus.COMPLETED,
      completedAt: new Date(),
    },
  });

  await recordCrmActivity({
    organizationId: params.organizationId,
    leadId: task.leadId,
    activityType: CrmActivityType.TASK_COMPLETED,
    title: "وظیفه تکمیل شد",
    summary: task.title,
    actorUserId: params.actorUserId,
    relatedTaskId: task.id,
  });

  return { ok: true };
}

export async function cancelCrmTask(params: {
  organizationId: string;
  taskId: string;
  actorUserId?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const task = await prisma.crmTask.findFirst({
    where: {
      id: params.taskId,
      organizationId: params.organizationId,
      deletedAt: null,
    },
  });
  if (!task) return { ok: false, error: "وظیفه یافت نشد." };
  if (task.status === CrmTaskStatus.CANCELLED) return { ok: true };

  await prisma.crmTask.update({
    where: { id: task.id },
    data: {
      status: CrmTaskStatus.CANCELLED,
      cancelledAt: new Date(),
    },
  });

  await recordCrmActivity({
    organizationId: params.organizationId,
    leadId: task.leadId,
    activityType: CrmActivityType.NOTE_ADDED,
    title: "وظیفه لغو شد",
    summary: task.title,
    actorUserId: params.actorUserId,
    relatedTaskId: task.id,
  });

  return { ok: true };
}
