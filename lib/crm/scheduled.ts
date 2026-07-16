/**
 * Scheduled CRM due-item processing (bounded, one-shot).
 *
 * Cron / PM2 strategy (document for VPS):
 *   * /5 * * * *  cd /var/www/setareganplus && npm run crm:automation-worker-once
 *   * /10 * * * * cd /var/www/setareganplus && npm run crm:scheduled-worker-once
 *   * /2 * * * *  cd /var/www/setareganplus && npm run communication:worker-once
 *
 * Or PM2 ecosystem with cron_restart. Never run infinite loops inside Next.js.
 */

import {
  CrmActivityType,
  CrmTaskStatus,
  DomainEventType,
} from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { recordCrmActivity } from "@/lib/crm/activity";
import { createCrmTask } from "@/lib/crm/tasks";
import { prisma } from "@/lib/prisma";

export async function processOverdueTasks(organizationId?: string): Promise<number> {
  const now = new Date();
  const tasks = await prisma.crmTask.findMany({
    where: {
      ...(organizationId ? { organizationId } : {}),
      deletedAt: null,
      status: { in: [CrmTaskStatus.OPEN, CrmTaskStatus.IN_PROGRESS] },
      dueAt: { lt: now },
    },
    take: 100,
    select: {
      id: true,
      organizationId: true,
      leadId: true,
      title: true,
    },
  });

  // Overdue is derived at read time; here we only enqueue reminder activities once.
  let touched = 0;
  for (const task of tasks) {
    const key = `overdue_note:${task.id}`;
    const existing = await prisma.crmActivity.findFirst({
      where: {
        organizationId: task.organizationId,
        leadId: task.leadId,
        relatedTaskId: task.id,
        activityType: CrmActivityType.NOTE_ADDED,
        title: "وظیفه سررسید گذشته",
      },
      select: { id: true },
    });
    if (existing) continue;
    await recordCrmActivity({
      organizationId: task.organizationId,
      leadId: task.leadId,
      activityType: CrmActivityType.NOTE_ADDED,
      title: "وظیفه سررسید گذشته",
      summary: task.title,
      relatedTaskId: task.id,
      metadata: { key },
    });
    touched += 1;
  }
  return touched;
}

export async function processFollowUpReminders(
  organizationId?: string,
): Promise<number> {
  const now = new Date();
  const leads = await prisma.lead.findMany({
    where: {
      ...(organizationId ? { organizationId } : {}),
      deletedAt: null,
      nextFollowUpAt: { lte: now },
    },
    take: 50,
    select: {
      id: true,
      organizationId: true,
      nextFollowUpAt: true,
    },
  });

  let created = 0;
  for (const lead of leads) {
    const result = await createCrmTask({
      organizationId: lead.organizationId,
      leadId: lead.id,
      title: "یادآوری پیگیری",
      taskType: "FOLLOW_UP",
      dueMinutes: 30,
      idempotencyKey: `followup:${lead.id}:${lead.nextFollowUpAt?.toISOString() ?? "none"}`,
    });
    if (result.created) created += 1;
    await prisma.lead.update({
      where: { id: lead.id },
      data: { nextFollowUpAt: null },
    });
  }
  return created;
}

export async function processNoContactReminders(
  hours = 24,
  organizationId?: string,
): Promise<number> {
  const cutoff = new Date(Date.now() - hours * 3_600_000);
  const leads = await prisma.lead.findMany({
    where: {
      ...(organizationId ? { organizationId } : {}),
      deletedAt: null,
      OR: [{ lastContactAt: null }, { lastContactAt: { lt: cutoff } }],
      createdAt: { lte: cutoff },
      status: { notIn: ["ENROLLED", "LOST"] },
    },
    take: 50,
    select: { id: true, organizationId: true, createdAt: true },
  });

  let created = 0;
  for (const lead of leads) {
    const result = await createCrmTask({
      organizationId: lead.organizationId,
      leadId: lead.id,
      title: `یادآوری: بدون تماس بیش از ${hours} ساعت`,
      taskType: "FOLLOW_UP",
      dueMinutes: 60,
      idempotencyKey: `nocontact:${lead.id}:${hours}h`,
    });
    if (result.created) {
      created += 1;
      await prisma.domainEventOutbox.create({
        data: {
          organizationId: lead.organizationId,
          eventType: DomainEventType.FORM_LEAD_CREATED,
          aggregateType: "Lead",
          aggregateId: lead.id,
          payload: {
            leadId: lead.id,
            reason: "no_contact_scheduled",
          } satisfies Prisma.InputJsonObject,
        },
      }).catch(() => undefined);
    }
  }
  return created;
}

export async function processScheduledCrmBatch(): Promise<{
  overdueNotes: number;
  followUps: number;
  noContact: number;
}> {
  const overdueNotes = await processOverdueTasks();
  const followUps = await processFollowUpReminders();
  const noContact = await processNoContactReminders(24);
  return { overdueNotes, followUps, noContact };
}
