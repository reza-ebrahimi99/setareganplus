/**
 * Domain event claim + automation rule evaluation/execution (StarOS v0.7).
 *
 * Idempotency:
 * - AutomationExecution unique(organizationId, automationRuleId, domainEventId)
 * - Task/SMS idempotency keys include rule+event+action
 */

import type { Prisma } from "@/generated/prisma/client";
import {
  AutomationExecutionStatus,
  CrmActivityType,
  CrmTaskStatus,
  DomainEventStatus,
  DomainEventType,
  LeadSourceType,
} from "@/generated/prisma/enums";
import { recordCrmActivity } from "@/lib/crm/activity";
import {
  parseAutomationActionConfig,
  parseAutomationConditions,
  type AutomationAction,
  type AutomationConditions,
} from "@/lib/crm/automation-contract";
import { linkBookingToLead } from "@/lib/crm/booking-to-lead";
import { processFormSubmissionCrm } from "@/lib/crm/form-to-lead";
import {
  assignLeadOwner,
  changeLeadStage,
} from "@/lib/crm/leads";
import { ensureDefaultPipeline } from "@/lib/crm/pipeline";
import { calculateLeadScore } from "@/lib/crm/scoring";
import { createCrmTask } from "@/lib/crm/tasks";
import { enqueueSms, renderSmsTemplate } from "@/lib/communication/queue";
import { prisma } from "@/lib/prisma";

const MAX_EVENT_ATTEMPTS = 5;

function computeBackoffMs(attemptCount: number): number {
  return Math.min(30_000 * 2 ** Math.max(0, attemptCount - 1), 30 * 60_000);
}

export async function claimPendingDomainEvents(limit = 10): Promise<string[]> {
  const now = new Date();
  const candidates = await prisma.domainEventOutbox.findMany({
    where: {
      status: DomainEventStatus.PENDING,
      availableAt: { lte: now },
    },
    orderBy: { availableAt: "asc" },
    take: Math.min(Math.max(limit, 1), 50),
    select: { id: true },
  });

  const claimed: string[] = [];
  for (const candidate of candidates) {
    const result = await prisma.domainEventOutbox.updateMany({
      where: {
        id: candidate.id,
        status: DomainEventStatus.PENDING,
        availableAt: { lte: now },
      },
      data: {
        status: DomainEventStatus.PROCESSING,
        attemptCount: { increment: 1 },
      },
    });
    if (result.count === 1) claimed.push(candidate.id);
  }
  return claimed;
}

function hoursBetween(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / 3_600_000;
}

async function evaluateConditions(params: {
  organizationId: string;
  conditions: AutomationConditions;
  leadId: string | null;
  eventCreatedAt: Date;
  branchId: string | null;
}): Promise<boolean> {
  const c = params.conditions;
  if (c.branchId && params.branchId && c.branchId !== params.branchId) {
    return false;
  }
  if (
    typeof c.hoursSinceEventMin === "number" &&
    hoursBetween(new Date(), params.eventCreatedAt) < c.hoursSinceEventMin
  ) {
    return false;
  }
  if (
    typeof c.hoursSinceEventMax === "number" &&
    hoursBetween(new Date(), params.eventCreatedAt) > c.hoursSinceEventMax
  ) {
    return false;
  }

  if (!params.leadId) {
    // Conditions that need lead fail closed when no lead yet — unless empty conditions.
    const needsLead =
      (c.stageIds && c.stageIds.length > 0) ||
      (c.stageTypes && c.stageTypes.length > 0) ||
      typeof c.scoreMin === "number" ||
      typeof c.scoreMax === "number" ||
      (c.sourceTypes && c.sourceTypes.length > 0) ||
      typeof c.hasBooking === "boolean" ||
      typeof c.hasCompletedTask === "boolean";
    return !needsLead;
  }

  const lead = await prisma.lead.findFirst({
    where: {
      id: params.leadId,
      organizationId: params.organizationId,
      deletedAt: null,
    },
    select: {
      stageId: true,
      score: true,
      sourceType: true,
      stage: { select: { stageType: true } },
    },
  });
  if (!lead) return false;

  if (c.stageIds?.length && (!lead.stageId || !c.stageIds.includes(lead.stageId))) {
    return false;
  }
  if (
    c.stageTypes?.length &&
    (!lead.stage || !c.stageTypes.includes(lead.stage.stageType))
  ) {
    return false;
  }
  if (typeof c.scoreMin === "number" && lead.score < c.scoreMin) return false;
  if (typeof c.scoreMax === "number" && lead.score > c.scoreMax) return false;
  if (
    c.sourceTypes?.length &&
    !c.sourceTypes.includes(lead.sourceType)
  ) {
    return false;
  }
  if (typeof c.hasBooking === "boolean") {
    const count = await prisma.bookingReservation.count({
      where: {
        organizationId: params.organizationId,
        leadId: params.leadId,
        deletedAt: null,
      },
    });
    if (c.hasBooking !== count > 0) return false;
  }
  if (typeof c.hasCompletedTask === "boolean") {
    const count = await prisma.crmTask.count({
      where: {
        organizationId: params.organizationId,
        leadId: params.leadId,
        status: CrmTaskStatus.COMPLETED,
        deletedAt: null,
      },
    });
    if (c.hasCompletedTask !== count > 0) return false;
  }
  return true;
}

async function resolveLeadIdForEvent(event: {
  organizationId: string;
  eventType: DomainEventType;
  aggregateType: string;
  aggregateId: string;
  payload: Prisma.JsonValue;
}): Promise<string | null> {
  const payload = (event.payload ?? {}) as Record<string, unknown>;
  if (typeof payload.leadId === "string") return payload.leadId;

  if (event.aggregateType === "Lead") return event.aggregateId;

  if (event.aggregateType === "FormSubmission") {
    const sub = await prisma.formSubmission.findFirst({
      where: {
        id: event.aggregateId,
        organizationId: event.organizationId,
      },
      select: { leadId: true },
    });
    return sub?.leadId ?? null;
  }

  if (event.aggregateType === "BookingReservation") {
    const res = await prisma.bookingReservation.findFirst({
      where: {
        id: event.aggregateId,
        organizationId: event.organizationId,
      },
      select: { leadId: true },
    });
    return res?.leadId ?? null;
  }

  return null;
}

async function executeAction(params: {
  organizationId: string;
  ruleId: string;
  eventId: string;
  action: AutomationAction;
  actionIndex: number;
  leadId: string | null;
  eventType: DomainEventType;
  aggregateId: string;
}): Promise<string | null> {
  const { action, organizationId } = params;
  let leadId = params.leadId;
  const idemBase = `${params.ruleId}:${params.eventId}:${params.actionIndex}:${action.type}`;

  switch (action.type) {
    case "CREATE_LEAD": {
      if (leadId) return leadId;
      if (params.eventType.toString().startsWith("FORM_")) {
        const sub = await prisma.formSubmission.findFirst({
          where: { id: params.aggregateId, organizationId },
          select: {
            id: true,
            branchId: true,
            formId: true,
            formVersionId: true,
          },
        });
        if (sub) {
          await processFormSubmissionCrm({
            organizationId,
            submissionId: sub.id,
            formId: sub.formId,
            formVersionId: sub.formVersionId,
            branchId: sub.branchId,
          });
          const updated = await prisma.formSubmission.findFirst({
            where: { id: sub.id },
            select: { leadId: true },
          });
          return updated?.leadId ?? null;
        }
      }
      if (params.eventType.toString().startsWith("BOOKING_")) {
        await linkBookingToLead({
          organizationId,
          reservationId: params.aggregateId,
          eventType: params.eventType,
        });
        const res = await prisma.bookingReservation.findFirst({
          where: { id: params.aggregateId },
          select: { leadId: true },
        });
        return res?.leadId ?? null;
      }
      return leadId;
    }
    case "UPDATE_STAGE": {
      if (!leadId) return null;
      await changeLeadStage({
        organizationId,
        leadId,
        stageId: action.stageId,
      });
      return leadId;
    }
    case "ASSIGN_OWNER": {
      if (!leadId) return null;
      const assignment = await assignLeadOwner({
        organizationId,
        leadId,
        ownerUserId: action.userId,
        source: "AUTOMATION",
      });
      if (!assignment.ok) {
        throw new Error(`ASSIGN_OWNER_FAILED: ${assignment.error}`);
      }
      return leadId;
    }
    case "CREATE_TASK": {
      if (!leadId) return null;
      await createCrmTask({
        organizationId,
        leadId,
        title: action.title,
        taskType: action.taskType,
        priority: action.priority,
        dueMinutes: action.dueMinutes,
        assignedToUserId: action.assignToUserId,
        automationRuleId: params.ruleId,
        idempotencyKey: `auto_task:${idemBase}`,
      });
      return leadId;
    }
    case "SET_NEXT_FOLLOW_UP": {
      if (!leadId) return null;
      await prisma.lead.update({
        where: { id: leadId },
        data: {
          nextFollowUpAt: new Date(Date.now() + action.dueMinutes * 60_000),
        },
      });
      return leadId;
    }
    case "ADD_ACTIVITY": {
      if (!leadId) return null;
      await recordCrmActivity({
        organizationId,
        leadId,
        activityType: CrmActivityType.NOTE_ADDED,
        title: action.title,
        summary: action.summary,
      });
      return leadId;
    }
    case "ENQUEUE_SMS": {
      if (!leadId) return null;
      const lead = await prisma.lead.findFirst({
        where: { id: leadId, organizationId },
        select: { normalizedMobile: true, mobile: true },
      });
      const toMobile = lead?.normalizedMobile ?? lead?.mobile;
      if (!toMobile) return leadId;
      const template = await prisma.smsTemplate.findFirst({
        where: {
          organizationId,
          code: action.templateCode,
          isActive: true,
          deletedAt: null,
        },
        select: { id: true, body: true },
      });
      const body = renderSmsTemplate(
        template?.body ?? "پیام سامانه ستارگان پلاس",
        {},
      );
      try {
        await enqueueSms({
          organizationId,
          toMobile,
          body,
          purpose: action.purpose ?? "crm_automation",
          idempotencyKey: `auto_sms:${idemBase}`,
          templateId: template?.id ?? null,
          relatedType: "Lead",
          relatedId: leadId,
        });
        await recordCrmActivity({
          organizationId,
          leadId,
          activityType: CrmActivityType.SMS_QUEUED,
          title: "پیامک در صف قرار گرفت",
          metadata: { templateCode: action.templateCode },
        });
      } catch {
        // SMS must not corrupt CRM transaction path.
      }
      return leadId;
    }
    case "UPDATE_SCORE": {
      if (!leadId) return null;
      const lead = await prisma.lead.findFirst({
        where: { id: leadId, organizationId },
        select: {
          score: true,
          scoreBand: true,
          normalizedMobile: true,
          nationalCode: true,
          sourceType: true,
        },
      });
      if (!lead) return leadId;
      if (action.recalculate || action.delta == null) {
        const bookingCount = await prisma.bookingReservation.count({
          where: { organizationId, leadId, deletedAt: null },
        });
        const completed = await prisma.bookingReservation.count({
          where: {
            organizationId,
            leadId,
            deletedAt: null,
            status: "COMPLETED",
          },
        });
        const overdue = await prisma.crmTask.count({
          where: {
            organizationId,
            leadId,
            deletedAt: null,
            status: { in: [CrmTaskStatus.OPEN, CrmTaskStatus.IN_PROGRESS] },
            dueAt: { lt: new Date() },
          },
        });
        const result = calculateLeadScore({
          hasValidMobile: Boolean(lead.normalizedMobile),
          hasValidEmail: false,
          hasNationalId: Boolean(lead.nationalCode),
          consultationRequested: lead.sourceType === LeadSourceType.BOOKING,
          bookingCreated: bookingCount > 0,
          bookingCompleted: completed > 0,
          hasOverdueTask: overdue > 0,
        });
        const prevBand = lead.scoreBand;
        await prisma.lead.update({
          where: { id: leadId },
          data: {
            score: result.score,
            scoreBand: result.band,
            scoreBreakdown: result.breakdown,
          },
        });
        if (prevBand !== result.band) {
          await recordCrmActivity({
            organizationId,
            leadId,
            activityType: CrmActivityType.SCORE_CHANGED,
            title: "تغییر امتیاز",
            metadata: { from: prevBand, to: result.band, score: result.score },
          });
        }
      } else {
        const next = Math.max(0, Math.min(100, lead.score + action.delta));
        await prisma.lead.update({
          where: { id: leadId },
          data: { score: next },
        });
      }
      return leadId;
    }
    case "MARK_WON": {
      if (!leadId) return null;
      const pipeline = await ensureDefaultPipeline(organizationId);
      const wonId = pipeline.stageByCode.won;
      if (wonId) {
        await changeLeadStage({
          organizationId,
          leadId,
          stageId: wonId,
        });
      }
      return leadId;
    }
    case "MARK_LOST": {
      if (!leadId) return null;
      const pipeline = await ensureDefaultPipeline(organizationId);
      const lostId = pipeline.stageByCode.lost;
      if (lostId) {
        await changeLeadStage({
          organizationId,
          leadId,
          stageId: lostId,
          lostReason: action.reason,
        });
      }
      return leadId;
    }
    default:
      return leadId;
  }
}

async function ensureBuiltinHandlers(event: {
  id: string;
  organizationId: string;
  eventType: DomainEventType;
  aggregateType: string;
  aggregateId: string;
}): Promise<void> {
  if (event.eventType.toString().startsWith("BOOKING_")) {
    await linkBookingToLead({
      organizationId: event.organizationId,
      reservationId: event.aggregateId,
      eventType: event.eventType,
    });
  }
  if (event.eventType === DomainEventType.FORM_SUBMISSION_RECEIVED) {
    const sub = await prisma.formSubmission.findFirst({
      where: {
        id: event.aggregateId,
        organizationId: event.organizationId,
      },
      select: { id: true, formId: true, formVersionId: true, branchId: true },
    });
    if (sub) {
      await processFormSubmissionCrm({
        organizationId: event.organizationId,
        submissionId: sub.id,
        formId: sub.formId,
        formVersionId: sub.formVersionId,
        branchId: sub.branchId,
      });
    }
  }
}

export async function processDomainEvent(eventId: string): Promise<{
  ok: boolean;
  status: DomainEventStatus;
}> {
  const event = await prisma.domainEventOutbox.findFirst({
    where: { id: eventId },
  });
  if (!event || event.status !== DomainEventStatus.PROCESSING) {
    return {
      ok: false,
      status: event?.status ?? DomainEventStatus.FAILED,
    };
  }

  try {
    await ensureBuiltinHandlers(event);

    const rules = await prisma.automationRule.findMany({
      where: {
        organizationId: event.organizationId,
        trigger: event.eventType,
        isEnabled: true,
        deletedAt: null,
      },
    });

    let leadId = await resolveLeadIdForEvent(event);

    for (const rule of rules) {
      if (rule.formId) {
        const payload = event.payload as Record<string, unknown>;
        if (payload.formId !== rule.formId && event.aggregateType === "FormSubmission") {
          const sub = await prisma.formSubmission.findFirst({
            where: { id: event.aggregateId },
            select: { formId: true },
          });
          if (sub?.formId !== rule.formId) continue;
        } else if (
          typeof payload.formId === "string" &&
          payload.formId !== rule.formId
        ) {
          continue;
        }
      }
      if (rule.bookingServiceId) {
        const payload = event.payload as Record<string, unknown>;
        if (
          typeof payload.serviceId === "string" &&
          payload.serviceId !== rule.bookingServiceId
        ) {
          continue;
        }
      }

      const idempotencyKey = `${rule.id}:${event.id}`;
      const existingExec = await prisma.automationExecution.findFirst({
        where: {
          organizationId: event.organizationId,
          automationRuleId: rule.id,
          domainEventId: event.id,
        },
      });
      if (
        existingExec &&
        (existingExec.status === AutomationExecutionStatus.SUCCEEDED ||
          existingExec.status === AutomationExecutionStatus.SKIPPED)
      ) {
        continue;
      }

      const conditions = parseAutomationConditions(rule.conditions);
      const matches = await evaluateConditions({
        organizationId: event.organizationId,
        conditions,
        leadId,
        eventCreatedAt: event.createdAt,
        branchId: event.branchId,
      });

      const execution =
        existingExec ??
        (await prisma.automationExecution.create({
          data: {
            organizationId: event.organizationId,
            automationRuleId: rule.id,
            domainEventId: event.id,
            status: AutomationExecutionStatus.RUNNING,
            attempts: 1,
            startedAt: new Date(),
            idempotencyKey,
          },
        }));

      if (!matches) {
        await prisma.automationExecution.update({
          where: { id: execution.id },
          data: {
            status: AutomationExecutionStatus.SKIPPED,
            completedAt: new Date(),
          },
        });
        continue;
      }

      try {
        const { actions } = parseAutomationActionConfig(rule.actionConfig);
        for (let i = 0; i < actions.length; i += 1) {
          leadId = await executeAction({
            organizationId: event.organizationId,
            ruleId: rule.id,
            eventId: event.id,
            action: actions[i]!,
            actionIndex: i,
            leadId,
            eventType: event.eventType,
            aggregateId: event.aggregateId,
          });
        }
        await prisma.automationExecution.update({
          where: { id: execution.id },
          data: {
            status: AutomationExecutionStatus.SUCCEEDED,
            completedAt: new Date(),
            attempts: { increment: existingExec ? 1 : 0 },
          },
        });
      } catch (error) {
        await prisma.automationExecution.update({
          where: { id: execution.id },
          data: {
            status: AutomationExecutionStatus.FAILED,
            errorCode: "ACTION_FAILED",
            lastError:
              error instanceof Error ? error.message.slice(0, 200) : "failed",
            completedAt: new Date(),
          },
        });
      }
    }

    await prisma.domainEventOutbox.update({
      where: { id: event.id },
      data: {
        status: DomainEventStatus.PROCESSED,
        processedAt: new Date(),
        lastError: null,
      },
    });
    return { ok: true, status: DomainEventStatus.PROCESSED };
  } catch (error) {
    const attempts = event.attemptCount;
    const exhausted = attempts >= MAX_EVENT_ATTEMPTS;
    const status = exhausted
      ? DomainEventStatus.DEAD_LETTER
      : DomainEventStatus.PENDING;
    await prisma.domainEventOutbox.update({
      where: { id: event.id },
      data: {
        status,
        availableAt: exhausted
          ? event.availableAt
          : new Date(Date.now() + computeBackoffMs(attempts)),
        lastError:
          error instanceof Error ? error.message.slice(0, 300) : "process_failed",
      },
    });
    return { ok: false, status };
  }
}

export async function processPendingAutomationBatch(limit = 10): Promise<{
  claimed: number;
  processed: number;
  failed: number;
}> {
  const ids = await claimPendingDomainEvents(limit);
  let processed = 0;
  let failed = 0;
  for (const id of ids) {
    const result = await processDomainEvent(id);
    if (result.ok) processed += 1;
    else failed += 1;
  }
  return { claimed: ids.length, processed, failed };
}
