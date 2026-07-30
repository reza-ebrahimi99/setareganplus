/**
 * Scheduled CRM due-item processing (bounded, one-shot).
 *
 * Sprint 6.6 Phase C: clock emitters enqueue events only by default.
 * Dual-run rollback: STAROS_AUTOMATION_CLOCK_CUTOVER=0
 */

import {
  CrmActivityType,
  CrmTaskStatus,
  DomainEventType,
} from "@/generated/prisma/enums";
import { isAutomationClockCutoverEnabled } from "@/lib/automation/cutover";
import { enqueueDomainEvent } from "@/lib/automation/enqueue";
import { recordCrmActivity } from "@/lib/crm/activity";
import { createCrmTask } from "@/lib/crm/tasks";
import { processOpsSlaEscalations } from "@/lib/ops/worker";
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

/** Emit FOLLOWUP_DUE; create task only when cutover is disabled. */
export async function processFollowUpReminders(
  organizationId?: string,
): Promise<number> {
  const now = new Date();
  const cutover = isAutomationClockCutoverEnabled();
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
      branchId: true,
      nextFollowUpAt: true,
    },
  });

  let emitted = 0;
  for (const lead of leads) {
    const dueIso = lead.nextFollowUpAt?.toISOString() ?? "none";
    const enqueued = await enqueueDomainEvent({
      organizationId: lead.organizationId,
      branchId: lead.branchId,
      eventType: DomainEventType.FOLLOWUP_DUE,
      aggregateType: "Lead",
      aggregateId: lead.id,
      dedupeKey: `FOLLOWUP_DUE:${lead.id}:${dueIso}`,
      payload: {
        leadId: lead.id,
        nextFollowUpAt: dueIso,
        reason: "next_follow_up",
        slaState: "BREACHED",
      },
    }).catch(() => ({ created: false }));

    if (!cutover) {
      await createCrmTask({
        organizationId: lead.organizationId,
        leadId: lead.id,
        title: "یادآوری پیگیری",
        taskType: "FOLLOW_UP",
        dueMinutes: 30,
        idempotencyKey: `followup:${lead.id}:${dueIso}`,
      });
    }

    await prisma.lead.update({
      where: { id: lead.id },
      data: { nextFollowUpAt: null },
    });
    if (enqueued && "created" in enqueued && enqueued.created) emitted += 1;
    else emitted += 1;
  }
  return emitted;
}

/**
 * No-contact clock — emit FOLLOWUP_DUE (unified); task only if cutover off.
 */
export async function processNoContactReminders(
  hours = 24,
  organizationId?: string,
): Promise<number> {
  const cutover = isAutomationClockCutoverEnabled();
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
    select: {
      id: true,
      organizationId: true,
      branchId: true,
      createdAt: true,
    },
  });

  let emitted = 0;
  for (const lead of leads) {
    await enqueueDomainEvent({
      organizationId: lead.organizationId,
      branchId: lead.branchId,
      eventType: DomainEventType.FOLLOWUP_DUE,
      aggregateType: "Lead",
      aggregateId: lead.id,
      dedupeKey: `FOLLOWUP_DUE:nocontact:${lead.id}:${hours}h`,
      payload: {
        leadId: lead.id,
        reason: "no_contact_scheduled",
        hoursWithoutContact: hours,
        slaState: "AT_RISK",
      },
    }).catch(() => undefined);

    if (!cutover) {
      const result = await createCrmTask({
        organizationId: lead.organizationId,
        leadId: lead.id,
        title: `یادآوری: بدون تماس بیش از ${hours} ساعت`,
        taskType: "FOLLOW_UP",
        dueMinutes: 60,
        idempotencyKey: `nocontact:${lead.id}:${hours}h`,
      });
      if (result.created) emitted += 1;
    } else {
      emitted += 1;
    }
  }
  return emitted;
}

export async function processScheduledCrmBatch(): Promise<{
  overdueNotes: number;
  followUps: number;
  noContact: number;
  slaEscalations: number;
}> {
  const overdueNotes = await processOverdueTasks();
  const followUps = await processFollowUpReminders();
  const noContact = await processNoContactReminders(24);
  const slaEscalations = await processOpsSlaEscalations();
  return { overdueNotes, followUps, noContact, slaEscalations };
}
