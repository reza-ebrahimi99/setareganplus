/**
 * Plain-text booklet SMS delivery (buyer and shared persist/send/update).
 */

import type { Prisma } from "@/generated/prisma/client";
import { SmsMessageStatus } from "@/generated/prisma/enums";
import { sendText } from "@/lib/communication/send";
import type { SmsSendResult } from "@/lib/communication/types";
import { readSmsProviderName } from "@/lib/communication/sms-provider";
import { normalizeIranianMobile } from "@/lib/forms/normalize-mobile";
import { prisma } from "@/lib/prisma";
import { logBookletSms } from "@/lib/commerce/booklet-sms/logger";
import {
  bookletSmsError,
  bookletSmsMetadata,
  type BookletSmsBuilderName,
  type BookletSmsContext,
  type BookletSmsEvent,
  type BookletSmsMessageOutcome,
  type BookletSmsRecipientRole,
} from "@/lib/commerce/booklet-sms/types";

export type BookletSmsDeliverInput = {
  organizationId: string;
  orderId: string;
  toMobile: string;
  body: string;
  purpose: string;
  idempotencyKey: string;
  idempotencyBase: string;
  event: BookletSmsEvent;
  role: BookletSmsRecipientRole;
  builderName: BookletSmsBuilderName;
  correlationId: string;
  ctx: BookletSmsContext;
  send?: (request: {
    toMobile: string;
    body: string;
    correlationId: string;
  }) => Promise<SmsSendResult>;
  db?: typeof prisma;
};

function isUniqueConflict(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "P2002"
  );
}

export async function deliverPlainTextSms(
  input: BookletSmsDeliverInput,
): Promise<BookletSmsMessageOutcome> {
  const db = input.db ?? prisma;
  const send = input.send ?? sendText;
  const mobile = normalizeIranianMobile(input.toMobile);
  if (!mobile.ok) {
    logBookletSms({
      step: "VALIDATE",
      phase: "skipped",
      correlationId: input.correlationId,
      event: input.event,
      organizationId: input.organizationId,
      orderId: input.orderId,
      recipientRole: input.role,
      mobile: input.toMobile,
      skipReason: "invalid_mobile",
    });
    return {
      role: input.role,
      status: "skipped",
      messageId: null,
      skipReason: "invalid_mobile",
      error: bookletSmsError("INVALID_MOBILE"),
    };
  }

  const existing = await db.smsMessage.findFirst({
    where: {
      organizationId: input.organizationId,
      idempotencyKey: input.idempotencyKey,
    },
    select: { id: true },
  });
  if (existing) {
    logBookletSms({
      step: "SAVE_SMS",
      phase: "skipped",
      correlationId: input.correlationId,
      event: input.event,
      organizationId: input.organizationId,
      orderId: input.orderId,
      messageId: existing.id,
      recipientRole: input.role,
      mobile: mobile.normalized,
      skipReason: "duplicate_idempotency",
    });
    return {
      role: input.role,
      status: "skipped",
      messageId: existing.id,
      skipReason: "duplicate_idempotency",
    };
  }

  const metadata = bookletSmsMetadata({
    event: input.event,
    role: input.role,
    builderName: input.builderName,
    correlationId: input.correlationId,
    ctx: input.ctx,
    idempotencyBase: input.idempotencyBase,
  });

  logBookletSms({
    step: "SAVE_SMS",
    phase: "start",
    correlationId: input.correlationId,
    event: input.event,
    organizationId: input.organizationId,
    orderId: input.orderId,
    recipientRole: input.role,
    mobile: mobile.normalized,
  });

  let messageId: string;
  try {
    const created = await db.smsMessage.create({
      data: {
        organizationId: input.organizationId,
        toMobile: mobile.normalized,
        body: input.body,
        status: SmsMessageStatus.PROCESSING,
        provider: readSmsProviderName(),
        purpose: input.purpose,
        relatedType: "CommerceOrder",
        relatedId: input.orderId,
        attemptCount: 1,
        maxAttempts: 1,
        idempotencyKey: input.idempotencyKey,
        metadata: metadata as unknown as Prisma.InputJsonValue,
      },
      select: { id: true },
    });
    messageId = created.id;
  } catch (error) {
    if (isUniqueConflict(error)) {
      logBookletSms({
        step: "SAVE_SMS",
        phase: "skipped",
        correlationId: input.correlationId,
        event: input.event,
        organizationId: input.organizationId,
        orderId: input.orderId,
        recipientRole: input.role,
        mobile: mobile.normalized,
        skipReason: "duplicate_idempotency",
      });
      return {
        role: input.role,
        status: "skipped",
        messageId: null,
        skipReason: "duplicate_idempotency",
      };
    }
    logBookletSms({
      step: "SAVE_SMS",
      phase: "failed",
      correlationId: input.correlationId,
      event: input.event,
      organizationId: input.organizationId,
      orderId: input.orderId,
      recipientRole: input.role,
      mobile: mobile.normalized,
      errorCode: "SAVE_FAILED",
      message: error instanceof Error ? error.name : "SAVE_FAILED",
    });
    return {
      role: input.role,
      status: "failed",
      messageId: null,
      error: bookletSmsError("SAVE_FAILED"),
    };
  }

  logBookletSms({
    step: "SAVE_SMS",
    phase: "success",
    correlationId: input.correlationId,
    event: input.event,
    organizationId: input.organizationId,
    orderId: input.orderId,
    messageId,
    recipientRole: input.role,
    mobile: mobile.normalized,
  });

  logBookletSms({
    step: "SEND",
    phase: "start",
    correlationId: input.correlationId,
    event: input.event,
    organizationId: input.organizationId,
    orderId: input.orderId,
    messageId,
    recipientRole: input.role,
    mobile: mobile.normalized,
  });

  let textResult: SmsSendResult;
  try {
    textResult = await send({
      toMobile: mobile.normalized,
      body: input.body,
      correlationId: input.correlationId,
    });
  } catch (error) {
    logBookletSms({
      step: "SEND",
      phase: "failed",
      correlationId: input.correlationId,
      event: input.event,
      organizationId: input.organizationId,
      orderId: input.orderId,
      messageId,
      recipientRole: input.role,
      mobile: mobile.normalized,
      errorCode: "SEND_FAILED",
      message: error instanceof Error ? error.name : "SEND_FAILED",
    });
    try {
      await db.smsMessage.update({
        where: { id: messageId },
        data: {
          status: SmsMessageStatus.FAILED,
          lastError: bookletSmsError("SEND_FAILED").message,
        },
      });
    } catch {
      logBookletSms({
        step: "UPDATE_SMS",
        phase: "failed",
        correlationId: input.correlationId,
        event: input.event,
        organizationId: input.organizationId,
        orderId: input.orderId,
        messageId,
        recipientRole: input.role,
        errorCode: "UPDATE_FAILED",
      });
    }
    return {
      role: input.role,
      status: "failed",
      messageId,
      error: bookletSmsError("SEND_FAILED"),
    };
  }

  logBookletSms({
    step: "SEND",
    phase: textResult.ok ? "success" : "failed",
    correlationId: input.correlationId,
    event: input.event,
    organizationId: input.organizationId,
    orderId: input.orderId,
    messageId,
    recipientRole: input.role,
    mobile: mobile.normalized,
    errorCode: textResult.ok ? null : textResult.errorCode,
  });

  logBookletSms({
    step: "PROVIDER_RESPONSE",
    phase: textResult.ok ? "success" : "failed",
    correlationId: input.correlationId,
    event: input.event,
    organizationId: input.organizationId,
    orderId: input.orderId,
    messageId,
    recipientRole: input.role,
    mobile: mobile.normalized,
    providerMessageId: textResult.providerMessageId,
    errorCode: textResult.ok ? null : textResult.errorCode,
    message: textResult.ok ? null : textResult.safeMessage,
  });

  logBookletSms({
    step: "UPDATE_SMS",
    phase: "start",
    correlationId: input.correlationId,
    event: input.event,
    organizationId: input.organizationId,
    orderId: input.orderId,
    messageId,
    recipientRole: input.role,
    mobile: mobile.normalized,
  });

  try {
    await db.smsMessage.update({
      where: { id: messageId },
      data: textResult.ok
        ? {
            status: SmsMessageStatus.SENT,
            sentAt: new Date(),
            providerMessageId: textResult.providerMessageId,
            lastError: null,
            metadata: metadata as unknown as Prisma.InputJsonValue,
          }
        : {
            status: SmsMessageStatus.FAILED,
            lastError: textResult.safeMessage,
            attemptCount: 1,
            metadata: metadata as unknown as Prisma.InputJsonValue,
          },
    });
  } catch (error) {
    logBookletSms({
      step: "UPDATE_SMS",
      phase: "failed",
      correlationId: input.correlationId,
      event: input.event,
      organizationId: input.organizationId,
      orderId: input.orderId,
      messageId,
      recipientRole: input.role,
      mobile: mobile.normalized,
      errorCode: "UPDATE_FAILED",
      message: error instanceof Error ? error.name : "UPDATE_FAILED",
    });
    return {
      role: input.role,
      status: "failed",
      messageId,
      error: bookletSmsError("UPDATE_FAILED"),
    };
  }

  logBookletSms({
    step: "UPDATE_SMS",
    phase: "success",
    correlationId: input.correlationId,
    event: input.event,
    organizationId: input.organizationId,
    orderId: input.orderId,
    messageId,
    recipientRole: input.role,
    mobile: mobile.normalized,
  });

  if (!textResult.ok) {
    return {
      role: input.role,
      status: "failed",
      messageId,
      error: bookletSmsError("PROVIDER_FAILED"),
    };
  }

  return {
    role: input.role,
    status: "sent",
    messageId,
  };
}

export async function sendBuyerSms(params: {
  organizationId: string;
  orderId: string;
  buyerMobile: string | null;
  body: string;
  event: BookletSmsEvent;
  correlationId: string;
  ctx: BookletSmsContext;
  idempotencySuffix?: string;
  send?: BookletSmsDeliverInput["send"];
  db?: typeof prisma;
}): Promise<BookletSmsMessageOutcome> {
  if (!params.buyerMobile) {
    logBookletSms({
      step: "BUILD_BUYER",
      phase: "skipped",
      correlationId: params.correlationId,
      event: params.event,
      organizationId: params.organizationId,
      orderId: params.orderId,
      recipientRole: "buyer",
      skipReason: "no_mobile",
    });
    return {
      role: "buyer",
      status: "skipped",
      messageId: null,
      skipReason: "no_mobile",
      error: bookletSmsError("NO_BUYER_MOBILE"),
    };
  }

  const idempotencyBase = `commerce_order_sms:${params.orderId}:${params.event}`;
  return deliverPlainTextSms({
    organizationId: params.organizationId,
    orderId: params.orderId,
    toMobile: params.buyerMobile,
    body: params.body,
    purpose: `commerce_order_${params.event.toLowerCase()}`,
    idempotencyKey: `${idempotencyBase}${params.idempotencySuffix ?? ""}`,
    idempotencyBase,
    event: params.event,
    role: "buyer",
    builderName:
      params.event === "READY_FOR_PICKUP"
        ? "ready_buyer"
        : params.event === "DELIVERED_TO_STUDENT"
          ? "delivered_buyer"
          : "paid_buyer",
    correlationId: params.correlationId,
    ctx: params.ctx,
    send: params.send,
    db: params.db,
  });
}
