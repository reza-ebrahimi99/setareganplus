/**
 * Outbound SMS queue foundation (StarOS v0.6A).
 *
 * - enqueueSms: persist PENDING row (idempotent via organizationId+idempotencyKey)
 * - claimPendingSmsMessages: optimistic atomic claim → PROCESSING
 * - processSmsMessage / processPendingSmsBatch: send via provider, backoff on failure
 *
 * Do NOT run an infinite worker inside Next.js — use the CLI script.
 */

import type { Prisma } from "@/generated/prisma/client";
import { SmsMessageStatus } from "@/generated/prisma/enums";
import { getCommunicationConfig } from "@/lib/communication/config";
import { sendText } from "@/lib/communication/send";
import {
  getSmsProvider,
  readSmsProviderName,
} from "@/lib/communication/sms-provider";
import { normalizeIranianMobile } from "@/lib/forms/normalize-mobile";
import { prisma } from "@/lib/prisma";

export type EnqueueSmsInput = {
  organizationId: string;
  toMobile: string;
  body: string;
  purpose: string;
  idempotencyKey: string;
  templateId?: string | null;
  relatedType?: string | null;
  relatedId?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
  maxAttempts?: number;
  availableAt?: Date;
};

export type EnqueueSmsResult =
  | { ok: true; messageId: string; created: boolean }
  | { ok: false; error: string };

export function renderSmsTemplate(
  body: string,
  variables: Record<string, string>,
): string {
  return body.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => {
    return variables[key] ?? "";
  });
}

/**
 * Exponential backoff: 30s, 60s, 120s, 240s, … capped at 30 minutes.
 */
export function computeSmsBackoffMs(attemptCount: number): number {
  const base = 30_000;
  const ms = base * 2 ** Math.max(0, attemptCount - 1);
  return Math.min(ms, 30 * 60_000);
}

export async function enqueueSms(
  input: EnqueueSmsInput,
): Promise<EnqueueSmsResult> {
  const mobile = normalizeIranianMobile(input.toMobile);
  if (!mobile.ok) {
    return { ok: false, error: mobile.error };
  }

  const key = input.idempotencyKey.trim();
  if (!key) {
    return { ok: false, error: "کلید یکتایی پیامک نامعتبر است." };
  }

  const body = input.body.trim();
  if (!body) {
    return { ok: false, error: "متن پیامک خالی است." };
  }

  const config = getCommunicationConfig();
  const maxAttempts = input.maxAttempts ?? config.smsMaxAttempts;
  const provider = readSmsProviderName();

  const existing = await prisma.smsMessage.findFirst({
    where: {
      organizationId: input.organizationId,
      idempotencyKey: key,
    },
    select: { id: true },
  });
  if (existing) {
    return { ok: true, messageId: existing.id, created: false };
  }

  try {
    const created = await prisma.smsMessage.create({
      data: {
        organizationId: input.organizationId,
        templateId: input.templateId ?? null,
        toMobile: mobile.normalized,
        body,
        status: SmsMessageStatus.PENDING,
        provider,
        purpose: input.purpose.trim() || "generic",
        relatedType: input.relatedType ?? null,
        relatedId: input.relatedId ?? null,
        maxAttempts,
        availableAt: input.availableAt ?? new Date(),
        idempotencyKey: key,
        metadata: (input.metadata ?? undefined) as
          | Prisma.InputJsonValue
          | undefined,
      },
      select: { id: true },
    });
    return { ok: true, messageId: created.id, created: true };
  } catch (error) {
    // Unique race on idempotencyKey — treat as success (already enqueued).
    const existingAfter = await prisma.smsMessage.findFirst({
      where: {
        organizationId: input.organizationId,
        idempotencyKey: key,
      },
      select: { id: true },
    });
    if (existingAfter) {
      return { ok: true, messageId: existingAfter.id, created: false };
    }
    void error;
    return {
      ok: false,
      error: "ثبت پیامک در صف ممکن نشد.",
    };
  }
}

/**
 * Atomically claim up to `limit` PENDING messages that are due.
 * Uses conditional update (status must still be PENDING) for concurrency safety.
 */
export async function claimPendingSmsMessages(
  limit = 10,
): Promise<string[]> {
  const now = new Date();
  const candidates = await prisma.smsMessage.findMany({
    where: {
      status: SmsMessageStatus.PENDING,
      availableAt: { lte: now },
    },
    orderBy: { availableAt: "asc" },
    take: Math.min(Math.max(limit, 1), 50),
    select: { id: true },
  });

  const claimed: string[] = [];
  for (const candidate of candidates) {
    const result = await prisma.smsMessage.updateMany({
      where: {
        id: candidate.id,
        status: SmsMessageStatus.PENDING,
        availableAt: { lte: now },
      },
      data: {
        status: SmsMessageStatus.PROCESSING,
        attemptCount: { increment: 1 },
      },
    });
    if (result.count === 1) {
      claimed.push(candidate.id);
    }
  }
  return claimed;
}

export async function processSmsMessage(messageId: string): Promise<{
  ok: boolean;
  status: SmsMessageStatus;
}> {
  const message = await prisma.smsMessage.findFirst({
    where: { id: messageId },
  });
  if (!message) {
    return { ok: false, status: SmsMessageStatus.FAILED };
  }
  if (message.status !== SmsMessageStatus.PROCESSING) {
    return { ok: false, status: message.status };
  }

  const provider = getSmsProvider();
  const result = await sendText({
    toMobile: message.toMobile,
    body: message.body,
    correlationId: message.id,
  });

  if (result.ok) {
    await prisma.smsMessage.update({
      where: { id: message.id },
      data: {
        status: SmsMessageStatus.SENT,
        sentAt: new Date(),
        provider: provider.name,
        providerMessageId: result.providerMessageId,
        lastError: null,
      },
    });
    return { ok: true, status: SmsMessageStatus.SENT };
  }

  const attempts = message.attemptCount;
  const exhausted = attempts >= message.maxAttempts || !result.retryable;
  const nextStatus = exhausted
    ? SmsMessageStatus.DEAD_LETTER
    : SmsMessageStatus.PENDING;
  const availableAt = exhausted
    ? message.availableAt
    : new Date(Date.now() + computeSmsBackoffMs(attempts));

  await prisma.smsMessage.update({
    where: { id: message.id },
    data: {
      status: nextStatus,
      availableAt,
      lastError: result.message,
      provider: provider.name,
    },
  });

  return { ok: false, status: nextStatus };
}

export async function processPendingSmsBatch(limit = 10): Promise<{
  claimed: number;
  sent: number;
  failed: number;
}> {
  const ids = await claimPendingSmsMessages(limit);
  let sent = 0;
  let failed = 0;
  for (const id of ids) {
    const result = await processSmsMessage(id);
    if (result.ok) sent += 1;
    else failed += 1;
  }
  return { claimed: ids.length, sent, failed };
}
