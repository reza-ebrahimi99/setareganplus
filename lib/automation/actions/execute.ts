import type { Prisma } from "@/generated/prisma/client";
import {
  AutomationExecutionStatus,
  CrmActivityType,
  CrmTaskStatus,
  DomainEventType,
  LeadSourceType,
} from "@/generated/prisma/enums";
import { enqueueDomainEvent } from "@/lib/automation/enqueue";
import { appendAutomationActionLog } from "@/lib/automation/history/action-log";
import {
  actionIdempotencyKey,
  isKnownDomainEventType,
  type AutomationAction,
} from "@/lib/automation/rules/contract";
import type { OpsQueueId as OpsQueueIdValue } from "@/lib/ops/types";
import { recordCrmActivity } from "@/lib/crm/activity";
import { linkBookingToLead } from "@/lib/crm/booking-to-lead";
import { processFormSubmissionCrm } from "@/lib/crm/form-to-lead";
import { assignLeadOwner, changeLeadStage } from "@/lib/crm/leads";
import { ensureDefaultPipeline } from "@/lib/crm/pipeline";
import { calculateLeadScore } from "@/lib/crm/scoring";
import { createCrmTask } from "@/lib/crm/tasks";
import { enqueueSms, renderSmsTemplate } from "@/lib/communication/queue";
import { dispatchLeadAssignment } from "@/lib/ops/capacity";
import { escalateAndReassign, openEscalation } from "@/lib/ops/escalation";
import { prisma } from "@/lib/prisma";

export async function executeAutomationAction(params: {
  organizationId: string;
  ruleId: string;
  eventId: string;
  executionId: string;
  action: AutomationAction;
  actionIndex: number;
  leadId: string | null;
  eventType: DomainEventType;
  aggregateId: string;
  branchId: string | null;
  eventPayload: Record<string, unknown>;
}): Promise<string | null> {
  const { action, organizationId } = params;
  let leadId = params.leadId;
  const idemBase = actionIdempotencyKey({
    ruleId: params.ruleId,
    eventId: params.eventId,
    actionIndex: params.actionIndex,
    actionType: action.type,
  });

  try {
    switch (action.type) {
      case "CREATE_LEAD": {
        if (leadId) break;
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
            leadId = updated?.leadId ?? null;
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
          leadId = res?.leadId ?? null;
        }
        break;
      }
      case "UPDATE_STAGE": {
        if (!leadId) break;
        await changeLeadStage({
          organizationId,
          leadId,
          stageId: action.stageId,
        });
        break;
      }
      case "ASSIGN_OWNER": {
        if (!leadId) break;
        const assignment = await assignLeadOwner({
          organizationId,
          leadId,
          ownerUserId: action.userId,
          source: "AUTOMATION",
        });
        if (!assignment.ok) {
          throw new Error(`ASSIGN_OWNER_FAILED: ${assignment.error}`);
        }
        break;
      }
      case "DISPATCH_OWNER": {
        if (!leadId) break;
        if (!action.candidateUserIds.length) {
          throw new Error("DISPATCH_OWNER_FAILED: empty candidateUserIds");
        }
        const dispatched = await dispatchLeadAssignment({
          organizationId,
          leadId,
          candidateUserIds: action.candidateUserIds,
          source: "AUTOMATION",
        });
        if (!dispatched.ok) {
          throw new Error(`DISPATCH_OWNER_FAILED: ${dispatched.error}`);
        }
        break;
      }
      case "CREATE_TASK": {
        if (!leadId) break;
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
        break;
      }
      case "SET_NEXT_FOLLOW_UP": {
        if (!leadId) break;
        await prisma.lead.update({
          where: { id: leadId },
          data: {
            nextFollowUpAt: new Date(Date.now() + action.dueMinutes * 60_000),
          },
        });
        break;
      }
      case "ADD_ACTIVITY": {
        if (!leadId) break;
        await recordCrmActivity({
          organizationId,
          leadId,
          activityType: CrmActivityType.NOTE_ADDED,
          title: action.title,
          summary: action.summary,
        });
        break;
      }
      case "ENQUEUE_SMS": {
        if (!leadId) break;
        const lead = await prisma.lead.findFirst({
          where: { id: leadId, organizationId },
          select: { normalizedMobile: true, mobile: true },
        });
        const toMobile = lead?.normalizedMobile ?? lead?.mobile;
        if (!toMobile) break;
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
          // SMS must not corrupt CRM path.
        }
        break;
      }
      case "UPDATE_SCORE": {
        if (!leadId) break;
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
        if (!lead) break;
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
              scoreBreakdown: result.breakdown as Prisma.InputJsonValue,
            },
          });
          if (prevBand !== result.band) {
            await recordCrmActivity({
              organizationId,
              leadId,
              activityType: CrmActivityType.SCORE_CHANGED,
              title: "تغییر امتیاز",
              metadata: {
                from: prevBand,
                to: result.band,
                score: result.score,
              },
            });
          }
        } else {
          const next = Math.max(0, Math.min(100, lead.score + action.delta));
          await prisma.lead.update({
            where: { id: leadId },
            data: { score: next },
          });
        }
        break;
      }
      case "MARK_WON": {
        if (!leadId) break;
        const pipeline = await ensureDefaultPipeline(organizationId);
        const wonId = pipeline.stageByCode.won;
        if (wonId) {
          await changeLeadStage({
            organizationId,
            leadId,
            stageId: wonId,
          });
        }
        break;
      }
      case "MARK_LOST": {
        if (!leadId) break;
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
        break;
      }
      case "NOTIFY_USER": {
        await prisma.staffNotification.create({
          data: {
            organizationId,
            userId: action.userId,
            title: action.title,
            body: action.body ?? null,
            entityType: action.entityType ?? (leadId ? "Lead" : null),
            entityId: action.entityId ?? leadId,
            automationExecutionId: params.executionId,
          },
        });
        break;
      }
      case "OPEN_ESCALATION": {
        const entityId = leadId ?? params.aggregateId;
        const allowed: OpsQueueIdValue[] = [
          "ASSIGNMENT",
          "FOLLOW_UP",
          "CALL",
          "SLA",
          "ESCALATION",
        ];
        const queueId = allowed.includes(action.queueId as OpsQueueIdValue)
          ? (action.queueId as OpsQueueIdValue)
          : "SLA";
        await openEscalation({
          organizationId,
          entityType: "LEAD",
          entityId,
          leadId,
          queueId,
          reason: action.reason,
          metadata: { source: "AUTOMATION", ruleId: params.ruleId },
        });
        break;
      }
      case "ESCALATE_REASSIGN": {
        if (!leadId) break;
        const result = await escalateAndReassign({
          organizationId,
          leadId,
          newOwnerUserId: action.newOwnerUserId,
          reason: action.reason,
          source: "AUTOMATION",
        });
        if (!result.ok) {
          throw new Error(`ESCALATE_REASSIGN_FAILED: ${result.error}`);
        }
        break;
      }
      case "ENQUEUE_DELAYED_EVENT": {
        if (!isKnownDomainEventType(action.eventType)) {
          throw new Error(`UNKNOWN_EVENT_TYPE: ${action.eventType}`);
        }
        const suffix = action.dedupeKeySuffix ?? action.eventType;
        await enqueueDomainEvent({
          organizationId,
          branchId: params.branchId,
          eventType: action.eventType,
          aggregateType: leadId ? "Lead" : "DomainEvent",
          aggregateId: leadId ?? params.aggregateId,
          availableAt: new Date(Date.now() + action.delayMinutes * 60_000),
          dedupeKey: `delayed:${params.ruleId}:${params.eventId}:${suffix}`,
          payload: {
            leadId,
            parentEventId: params.eventId,
            reason: "ENQUEUE_DELAYED_EVENT",
          },
        });
        break;
      }
      default:
        break;
    }

    await appendAutomationActionLog({
      organizationId,
      automationExecutionId: params.executionId,
      actionIndex: params.actionIndex,
      actionType: action.type,
      status: AutomationExecutionStatus.SUCCEEDED,
      inputSummary: { type: action.type },
      outputSummary: { leadId },
    });
    return leadId;
  } catch (error) {
    await appendAutomationActionLog({
      organizationId,
      automationExecutionId: params.executionId,
      actionIndex: params.actionIndex,
      actionType: action.type,
      status: AutomationExecutionStatus.FAILED,
      inputSummary: { type: action.type },
      errorCode: "ACTION_FAILED",
      outputSummary: {
        message: error instanceof Error ? error.message.slice(0, 200) : "failed",
      },
    });
    throw error;
  }
}
