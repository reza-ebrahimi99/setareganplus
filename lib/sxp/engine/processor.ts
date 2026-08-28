import { Prisma } from "@/generated/prisma/client";
import {
  ExperienceEngineHandlerName,
  SmsMessageStatus,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  SMS_SENT_EVENT_TYPE,
  SXP_ENGINE_MAX_ATTEMPTS,
  smsInboxEventId,
} from "@/lib/sxp/constants";
import { SXP_OUTBOX_EVENT_TYPES } from "@/lib/sxp/engine/catalog";
import { runFeedCurator } from "@/lib/sxp/engine/handlers/feed-curator";
import { runTimelineAppender } from "@/lib/sxp/engine/handlers/timeline-appender";
import { runWidgetSnapshotter } from "@/lib/sxp/engine/handlers/widget-snapshotter";
import { claimHandlerInbox, completeHandlerInbox } from "@/lib/sxp/engine/inbox";
import { asRecord } from "@/lib/sxp/engine/payload";
import type { EngineSourceEvent, HandlerOutcome } from "@/lib/sxp/engine/types";
import { isSxpHardOff } from "@/lib/sxp/flags";

const HANDLERS: ExperienceEngineHandlerName[] = [
  ExperienceEngineHandlerName.TIMELINE_APPENDER,
  ExperienceEngineHandlerName.FEED_CURATOR,
  ExperienceEngineHandlerName.WIDGET_SNAPSHOTTER,
];

export type ExperienceEngineBatchResult = {
  hardOff: boolean;
  scanned: number;
  claimed: number;
  processed: number;
  skipped: number;
  failed: number;
  deadLettered: number;
};

async function loadUnprocessedOutboxIds(limit: number): Promise<string[]> {
  const rows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT o.id
    FROM domain_event_outbox o
    WHERE o."eventType"::text IN (${Prisma.join(SXP_OUTBOX_EVENT_TYPES)})
      AND NOT EXISTS (
        SELECT 1
        FROM experience_engine_inbox i
        WHERE i."organizationId" = o."organizationId"
          AND i."outboxEventId" = o.id
          AND i."handlerName" = 'TIMELINE_APPENDER'::"ExperienceEngineHandlerName"
          AND i.status IN (
            'PROCESSED'::"ExperienceEngineInboxStatus",
            'SKIPPED'::"ExperienceEngineInboxStatus",
            'DEAD_LETTER'::"ExperienceEngineInboxStatus"
          )
      )
    ORDER BY o."createdAt" ASC, o.id ASC
    LIMIT ${limit}
  `);
  return rows.map((row) => row.id);
}

async function loadUnprocessedSmsIds(limit: number): Promise<string[]> {
  const rows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT m.id
    FROM sms_messages m
    WHERE m.status = 'SENT'::"SmsMessageStatus"
      AND NOT EXISTS (
        SELECT 1
        FROM experience_engine_inbox i
        WHERE i."organizationId" = m."organizationId"
          AND i."outboxEventId" = ('sms-message:' || m.id)
          AND i."handlerName" = 'TIMELINE_APPENDER'::"ExperienceEngineHandlerName"
          AND i.status IN (
            'PROCESSED'::"ExperienceEngineInboxStatus",
            'SKIPPED'::"ExperienceEngineInboxStatus",
            'DEAD_LETTER'::"ExperienceEngineInboxStatus"
          )
      )
    ORDER BY m."sentAt" ASC NULLS LAST, m.id ASC
    LIMIT ${limit}
  `);
  return rows.map((row) => row.id);
}

async function runHandler(
  handlerName: ExperienceEngineHandlerName,
  event: EngineSourceEvent,
  inboxId: string,
): Promise<HandlerOutcome> {
  if (handlerName === ExperienceEngineHandlerName.TIMELINE_APPENDER) {
    return runTimelineAppender({ inboxId, event });
  }
  if (handlerName === ExperienceEngineHandlerName.FEED_CURATOR) {
    return runFeedCurator({ event });
  }
  return runWidgetSnapshotter({ event });
}

async function processEvent(event: EngineSourceEvent): Promise<{
  claimed: number;
  processed: number;
  skipped: number;
  failed: number;
  deadLettered: number;
}> {
  const counts = {
    claimed: 0,
    processed: 0,
    skipped: 0,
    failed: 0,
    deadLettered: 0,
  };

  for (const handlerName of HANDLERS) {
    const claimed = await claimHandlerInbox({
      organizationId: event.organizationId,
      outboxEventId: event.outboxEventId,
      handlerName,
    });
    if (!claimed) continue;
    counts.claimed += 1;

    try {
      const outcome = await runHandler(handlerName, event, claimed.id);
      await completeHandlerInbox({
        inboxId: claimed.id,
        status: outcome.status,
        attemptCount: claimed.attemptCount,
        lastError:
          outcome.status === "skipped"
            ? outcome.reason
            : outcome.status === "failed"
              ? outcome.error
              : undefined,
      });
      if (outcome.status === "processed") counts.processed += 1;
      else if (outcome.status === "skipped") counts.skipped += 1;
      else counts.failed += 1;
      if (
        outcome.status === "failed" &&
        claimed.attemptCount >= SXP_ENGINE_MAX_ATTEMPTS
      ) {
        counts.deadLettered += 1;
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message.slice(0, 300) : "handler_failed";
      await completeHandlerInbox({
        inboxId: claimed.id,
        status: "failed",
        attemptCount: claimed.attemptCount,
        lastError: message,
      });
      counts.failed += 1;
      if (claimed.attemptCount >= SXP_ENGINE_MAX_ATTEMPTS) {
        counts.deadLettered += 1;
      }
    }
  }

  return counts;
}

/**
 * One-shot Experience Engine tick.
 * Reads DomainEventOutbox without changing its status. SMS SENT rows use synthetic inbox keys.
 */
export async function processExperienceEngineBatch(
  limit = 20,
): Promise<ExperienceEngineBatchResult> {
  const result: ExperienceEngineBatchResult = {
    hardOff: false,
    scanned: 0,
    claimed: 0,
    processed: 0,
    skipped: 0,
    failed: 0,
    deadLettered: 0,
  };

  if (isSxpHardOff()) {
    result.hardOff = true;
    return result;
  }

  const bounded = Math.min(Math.max(limit, 1), 50);
  const outboxIds = await loadUnprocessedOutboxIds(bounded);
  const smsIds = await loadUnprocessedSmsIds(bounded);

  const outboxRows =
    outboxIds.length === 0
      ? []
      : await prisma.domainEventOutbox.findMany({
          where: { id: { in: outboxIds } },
        });
  const smsRows =
    smsIds.length === 0
      ? []
      : await prisma.smsMessage.findMany({
          where: {
            id: { in: smsIds },
            status: SmsMessageStatus.SENT,
          },
        });

  const events: EngineSourceEvent[] = [
    ...outboxRows.map((row) => ({
      organizationId: row.organizationId,
      outboxEventId: row.id,
      eventType: row.eventType,
      aggregateType: row.aggregateType,
      aggregateId: row.aggregateId,
      payload: asRecord(row.payload),
      occurredAt: row.createdAt,
      sourceKind: "outbox" as const,
    })),
    ...smsRows.map((row) => ({
      organizationId: row.organizationId,
      outboxEventId: smsInboxEventId(row.id),
      eventType: SMS_SENT_EVENT_TYPE,
      aggregateType: "SmsMessage",
      aggregateId: row.id,
      payload: {
        purpose: row.purpose,
        relatedType: row.relatedType,
        relatedId: row.relatedId,
        toMobile: row.toMobile,
      },
      occurredAt: row.sentAt ?? row.createdAt,
      sourceKind: "sms" as const,
    })),
  ];

  result.scanned = events.length;

  for (const event of events) {
    const counts = await processEvent(event);
    result.claimed += counts.claimed;
    result.processed += counts.processed;
    result.skipped += counts.skipped;
    result.failed += counts.failed;
    result.deadLettered += counts.deadLettered;
  }

  return result;
}
