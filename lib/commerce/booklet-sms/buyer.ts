/**
 * Booklet SMS delivery to the buyer — shared persist/send/update core.
 *
 * PAID and READY_FOR_PICKUP dispatch through SMS.ir Verify (the approved
 * purchase/ready templates), reusing the same sendPatternTemplate() ->
 * sendVerify() path OTP already uses. DELIVERED_TO_STUDENT has no approved
 * Verify template and keeps using plain sendText().
 */

import type { Prisma } from "@/generated/prisma/client";
import { SmsMessageStatus } from "@/generated/prisma/enums";
import { sendPatternTemplate, sendText } from "@/lib/communication/send";
import type { SmsSendResult } from "@/lib/communication/types";
import { readSmsProviderName } from "@/lib/communication/sms-provider";
import { normalizeIranianMobile } from "@/lib/forms/normalize-mobile";
import { prisma } from "@/lib/prisma";
import {
  buildBookletPurchaseVerifyParameters,
  buildBookletReadyVerifyParameters,
} from "@/lib/commerce/booklet-sms/builder";
import { logBookletSms } from "@/lib/commerce/booklet-sms/logger";
import { readBookletVerifyTemplateId } from "@/lib/commerce/booklet-sms/verify-config";
import {
  bookletSmsError,
  bookletSmsMetadata,
  type BookletSmsBuilderName,
  type BookletSmsContext,
  type BookletSmsErrorCode,
  type BookletSmsEvent,
  type BookletSmsMessageOutcome,
  type BookletSmsRecipientRole,
} from "@/lib/commerce/booklet-sms/types";

export type BookletSmsDispatch =
  | { mode: "text" }
  | { mode: "verify"; templateCode: string; parameters: Record<string, string> };

export type BookletSmsSendTextFn = (request: {
  toMobile: string;
  body: string;
  correlationId: string;
}) => Promise<SmsSendResult>;

export type BookletSmsSendVerifyFn = (request: {
  toMobile: string;
  templateCode: string;
  parameters: Record<string, string>;
  correlationId: string;
}) => Promise<SmsSendResult>;

export type BookletSmsDeliverInput = {
  organizationId: string;
  orderId: string;
  toMobile: string;
  /** Always stored on SmsMessage.body for history/audit, regardless of dispatch mode. */
  renderedBody: string;
  dispatch: BookletSmsDispatch;
  purpose: string;
  idempotencyKey: string;
  idempotencyBase: string;
  event: BookletSmsEvent;
  role: BookletSmsRecipientRole;
  builderName: BookletSmsBuilderName;
  correlationId: string;
  ctx: BookletSmsContext;
  /** Text-channel override (tests only). Defaults to sendText. */
  send?: BookletSmsSendTextFn;
  /** Verify-channel override (tests only). Defaults to sendPatternTemplate. */
  sendVerify?: BookletSmsSendVerifyFn;
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

export async function deliverBookletSms(
  input: BookletSmsDeliverInput,
): Promise<BookletSmsMessageOutcome> {
  const db = input.db ?? prisma;
  const send = input.send ?? sendText;
  const sendVerify = input.sendVerify ?? sendPatternTemplate;
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
    verify:
      input.dispatch.mode === "verify"
        ? { templateCode: input.dispatch.templateCode }
        : undefined,
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
        body: input.renderedBody,
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

  let sendResult: SmsSendResult;
  try {
    sendResult =
      input.dispatch.mode === "verify"
        ? await sendVerify({
            toMobile: mobile.normalized,
            templateCode: input.dispatch.templateCode,
            parameters: input.dispatch.parameters,
            correlationId: input.correlationId,
          })
        : await send({
            toMobile: mobile.normalized,
            body: input.renderedBody,
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
    phase: sendResult.ok ? "success" : "failed",
    correlationId: input.correlationId,
    event: input.event,
    organizationId: input.organizationId,
    orderId: input.orderId,
    messageId,
    recipientRole: input.role,
    mobile: mobile.normalized,
    errorCode: sendResult.ok ? null : sendResult.errorCode,
  });

  logBookletSms({
    step: "PROVIDER_RESPONSE",
    phase: sendResult.ok ? "success" : "failed",
    correlationId: input.correlationId,
    event: input.event,
    organizationId: input.organizationId,
    orderId: input.orderId,
    messageId,
    recipientRole: input.role,
    mobile: mobile.normalized,
    providerMessageId: sendResult.providerMessageId,
    errorCode: sendResult.ok ? null : sendResult.errorCode,
    message: sendResult.ok ? null : sendResult.safeMessage,
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
      data: sendResult.ok
        ? {
            status: SmsMessageStatus.SENT,
            sentAt: new Date(),
            providerMessageId: sendResult.providerMessageId,
            lastError: null,
            metadata: metadata as unknown as Prisma.InputJsonValue,
          }
        : {
            status: SmsMessageStatus.FAILED,
            lastError: sendResult.safeMessage,
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

  if (!sendResult.ok) {
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

export type BookletBuyerDispatchResolution =
  | { ok: true; dispatch: BookletSmsDispatch }
  | { ok: false; code: Extract<BookletSmsErrorCode, "VERIFY_NOT_CONFIGURED"> };

/**
 * Decides text-vs-Verify for a buyer message and builds the Verify
 * parameters when applicable. Single source of truth reused by the real
 * send path, the admin test-send path, and the admin preview.
 */
export function resolveBuyerDispatch(
  event: BookletSmsEvent,
  ctx: BookletSmsContext,
): BookletBuyerDispatchResolution {
  if (event === "PAID") {
    const templateCode = readBookletVerifyTemplateId("purchase");
    if (!templateCode) return { ok: false, code: "VERIFY_NOT_CONFIGURED" };
    return {
      ok: true,
      dispatch: {
        mode: "verify",
        templateCode,
        parameters: buildBookletPurchaseVerifyParameters(ctx),
      },
    };
  }
  if (event === "READY_FOR_PICKUP") {
    const templateCode = readBookletVerifyTemplateId("ready");
    if (!templateCode) return { ok: false, code: "VERIFY_NOT_CONFIGURED" };
    return {
      ok: true,
      dispatch: {
        mode: "verify",
        templateCode,
        parameters: buildBookletReadyVerifyParameters(ctx),
      },
    };
  }
  // DELIVERED_TO_STUDENT has no approved Verify template — stays plain text.
  return { ok: true, dispatch: { mode: "text" } };
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
  sendVerify?: BookletSmsDeliverInput["sendVerify"];
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

  const resolution = resolveBuyerDispatch(params.event, params.ctx);
  if (!resolution.ok) {
    logBookletSms({
      step: "SEND",
      phase: "failed",
      correlationId: params.correlationId,
      event: params.event,
      organizationId: params.organizationId,
      orderId: params.orderId,
      recipientRole: "buyer",
      errorCode: resolution.code,
    });
    return {
      role: "buyer",
      status: "failed",
      messageId: null,
      error: bookletSmsError(resolution.code),
    };
  }

  const idempotencyBase = `commerce_order_sms:${params.orderId}:${params.event}`;
  return deliverBookletSms({
    organizationId: params.organizationId,
    orderId: params.orderId,
    toMobile: params.buyerMobile,
    renderedBody: params.body,
    dispatch: resolution.dispatch,
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
    sendVerify: params.sendVerify,
    db: params.db,
  });
}
