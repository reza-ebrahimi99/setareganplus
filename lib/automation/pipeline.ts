/**
 * Domain event claim + automation rule evaluation/execution (Sprint 5 + 6.6).
 */

import type { Prisma } from "@/generated/prisma/client";
import {
  AutomationExecutionStatus,
  DomainEventStatus,
  DomainEventType,
} from "@/generated/prisma/enums";
import { executeAutomationAction } from "@/lib/automation/actions/execute";
import { runAutomationBuiltins } from "@/lib/automation/builtins/handlers";
import { assertOwnershipActionAllowed } from "@/lib/automation/loop-guard";
import {
  parseAutomationActionConfig,
  parseAutomationConditions,
} from "@/lib/automation/rules/contract";
import { evaluateAutomationConditions } from "@/lib/automation/rules/evaluate";
import { ruleTriggersForEvent } from "@/lib/automation/triggers/aliases";
import {
  MAX_EVENT_ATTEMPTS,
  OUTBOX_PROCESSING_LEASE_MS,
} from "@/lib/automation/types";
import { prisma } from "@/lib/prisma";

function computeBackoffMs(attemptCount: number): number {
  return Math.min(30_000 * 2 ** Math.max(0, attemptCount - 1), 30 * 60_000);
}

/**
 * Reclaim stale PROCESSING rows whose lease (availableAt) has expired.
 */
export async function reclaimStaleProcessingEvents(
  limit = 50,
): Promise<number> {
  const now = new Date();
  const stale = await prisma.domainEventOutbox.findMany({
    where: {
      status: DomainEventStatus.PROCESSING,
      availableAt: { lt: now },
    },
    orderBy: { availableAt: "asc" },
    take: Math.min(Math.max(limit, 1), 100),
    select: { id: true },
  });
  let reclaimed = 0;
  for (const row of stale) {
    const result = await prisma.domainEventOutbox.updateMany({
      where: {
        id: row.id,
        status: DomainEventStatus.PROCESSING,
        availableAt: { lt: now },
      },
      data: {
        status: DomainEventStatus.PENDING,
        availableAt: now,
        lastError: "RECLAIMED_STALE_PROCESSING",
      },
    });
    if (result.count === 1) reclaimed += 1;
  }
  return reclaimed;
}

export async function claimPendingDomainEvents(limit = 10): Promise<string[]> {
  await reclaimStaleProcessingEvents(Math.min(limit * 2, 50));
  const now = new Date();
  const leaseUntil = new Date(now.getTime() + OUTBOX_PROCESSING_LEASE_MS);
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
        // Lease end — used by reclaimStaleProcessingEvents
        availableAt: leaseUntil,
      },
    });
    if (result.count === 1) claimed.push(candidate.id);
  }
  return claimed;
}

async function failOutboxEvent(params: {
  eventId: string;
  attemptCount: number;
  availableAt: Date;
  error: unknown;
}): Promise<DomainEventStatus> {
  const exhausted = params.attemptCount >= MAX_EVENT_ATTEMPTS;
  const status = exhausted
    ? DomainEventStatus.DEAD_LETTER
    : DomainEventStatus.PENDING;
  const message =
    params.error instanceof Error
      ? params.error.message.slice(0, 300)
      : "process_failed";
  await prisma.domainEventOutbox.update({
    where: { id: params.eventId },
    data: {
      status,
      availableAt: exhausted
        ? params.availableAt
        : new Date(Date.now() + computeBackoffMs(params.attemptCount)),
      lastError: message,
    },
  });
  return status;
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

  if (event.aggregateType === "CrmCallLog") {
    const call = await prisma.crmCallLog.findFirst({
      where: {
        id: event.aggregateId,
        organizationId: event.organizationId,
      },
      select: { leadId: true },
    });
    return call?.leadId ?? null;
  }

  if (event.aggregateType === "Registration") {
    const reg = await prisma.registration.findFirst({
      where: {
        id: event.aggregateId,
        organizationId: event.organizationId,
      },
      select: { leadId: true },
    });
    return reg?.leadId ?? null;
  }

  if (event.aggregateType === "PaymentIntent") {
    const intent = await prisma.paymentIntent.findFirst({
      where: {
        id: event.aggregateId,
        organizationId: event.organizationId,
      },
      select: { registration: { select: { leadId: true } } },
    });
    return intent?.registration?.leadId ?? null;
  }

  if (event.aggregateType === "OpsEscalation") {
    const esc = await prisma.opsEscalation.findFirst({
      where: {
        id: event.aggregateId,
        organizationId: event.organizationId,
      },
      select: { leadId: true, entityId: true, entityType: true },
    });
    if (esc?.leadId) return esc.leadId;
    if (esc?.entityType === "LEAD") return esc.entityId;
  }

  return null;
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
    await runAutomationBuiltins(event);

    const triggers = ruleTriggersForEvent(event.eventType);
    const rules = await prisma.automationRule.findMany({
      where: {
        organizationId: event.organizationId,
        trigger: { in: triggers },
        isEnabled: true,
        deletedAt: null,
      },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    });

    let leadId = await resolveLeadIdForEvent(event);
    const eventPayload = (event.payload ?? {}) as Record<string, unknown>;
    let actionFailure: Error | null = null;

    for (const rule of rules) {
      if (actionFailure) break;

      if (rule.formId) {
        const payload = eventPayload;
        if (
          payload.formId !== rule.formId &&
          event.aggregateType === "FormSubmission"
        ) {
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
        if (
          typeof eventPayload.serviceId === "string" &&
          eventPayload.serviceId !== rule.bookingServiceId
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
        if (
          rule.stopOnMatch &&
          existingExec.status === AutomationExecutionStatus.SUCCEEDED
        ) {
          break;
        }
        continue;
      }

      const conditions = parseAutomationConditions(rule.conditions);
      const matches = await evaluateAutomationConditions({
        organizationId: event.organizationId,
        conditions,
        leadId,
        eventCreatedAt: event.createdAt,
        branchId: event.branchId,
        eventPayload,
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
          const action = actions[i]!;
          const guard = await assertOwnershipActionAllowed({
            organizationId: event.organizationId,
            eventType: event.eventType,
            eventPayload,
            leadId,
            actionType: action.type,
          });
          if (!guard.ok) {
            // Soft-skip loop-protected actions; do not fail the whole event.
            continue;
          }
          leadId = await executeAutomationAction({
            organizationId: event.organizationId,
            ruleId: rule.id,
            eventId: event.id,
            executionId: execution.id,
            action,
            actionIndex: i,
            leadId,
            eventType: event.eventType,
            aggregateId: event.aggregateId,
            branchId: event.branchId,
            eventPayload,
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
        if (rule.stopOnMatch) break;
      } catch (error) {
        const message =
          error instanceof Error ? error.message.slice(0, 200) : "failed";
        await prisma.automationExecution.update({
          where: { id: execution.id },
          data: {
            status: AutomationExecutionStatus.FAILED,
            errorCode: "ACTION_FAILED",
            lastError: message,
            completedAt: new Date(),
          },
        });
        actionFailure =
          error instanceof Error ? error : new Error(String(error));
      }
    }

    if (actionFailure) {
      const status = await failOutboxEvent({
        eventId: event.id,
        attemptCount: event.attemptCount,
        availableAt: event.availableAt,
        error: actionFailure,
      });
      return { ok: false, status };
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
    const status = await failOutboxEvent({
      eventId: event.id,
      attemptCount: event.attemptCount,
      availableAt: event.availableAt,
      error,
    });
    return { ok: false, status };
  }
}

export async function processPendingAutomationBatch(limit = 10): Promise<{
  claimed: number;
  processed: number;
  failed: number;
  reclaimed?: number;
}> {
  const reclaimed = await reclaimStaleProcessingEvents(50);
  const ids = await claimPendingDomainEvents(limit);
  let processed = 0;
  let failed = 0;
  for (const id of ids) {
    const result = await processDomainEvent(id);
    if (result.ok) processed += 1;
    else failed += 1;
  }
  return { claimed: ids.length, processed, failed, reclaimed };
}
