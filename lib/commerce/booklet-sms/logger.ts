/**
 * Structured booklet SMS logger.
 * Never logs OTP, API keys, full mobiles, or message bodies.
 */

import { maskMobileForDisplay } from "@/lib/communication/sms-params";
import type {
  BookletSmsEvent,
  BookletSmsRecipientRole,
  BookletSmsStep,
  BookletSmsStepPhase,
} from "@/lib/commerce/booklet-sms/types";

export type BookletSmsLogFields = {
  step: BookletSmsStep;
  phase: BookletSmsStepPhase;
  correlationId: string;
  event?: BookletSmsEvent | "UNKNOWN";
  organizationId?: string;
  orderId?: string | null;
  messageId?: string | null;
  recipientRole?: BookletSmsRecipientRole;
  mobile?: string | null;
  errorCode?: string | null;
  message?: string | null;
  providerMessageId?: string | null;
  skipReason?: string | null;
};

function maskIfMobile(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed.length < 6) return trimmed;
  return maskMobileForDisplay(trimmed);
}

function serialize(fields: BookletSmsLogFields, level: "info" | "warn" | "error") {
  return JSON.stringify({
    ts: new Date().toISOString(),
    level,
    module: "booklet-sms",
    step: fields.step,
    phase: fields.phase,
    correlationId: fields.correlationId,
    event: fields.event ?? null,
    organizationId: fields.organizationId ?? null,
    orderId: fields.orderId ?? null,
    messageId: fields.messageId ?? null,
    recipientRole: fields.recipientRole ?? null,
    maskedMobile: maskIfMobile(fields.mobile),
    errorCode: fields.errorCode ?? null,
    message: fields.message ?? null,
    providerMessageId: fields.providerMessageId ?? null,
    skipReason: fields.skipReason ?? null,
  });
}

export function logBookletSms(fields: BookletSmsLogFields): void {
  const line = serialize(
    fields,
    fields.phase === "failed" ? "error" : fields.phase === "skipped" ? "warn" : "info",
  );
  if (fields.phase === "failed") {
    console.error(line);
    return;
  }
  if (fields.phase === "skipped") {
    console.warn(line);
    return;
  }
  console.info(line);
}

export function logPaymentBookletSmsReaction(params: {
  correlationId: string;
  organizationId: string;
  orderId: string;
  paymentIntentId?: string;
  ok: boolean;
  status: string;
}): void {
  console.info(
    JSON.stringify({
      ts: new Date().toISOString(),
      level: "info",
      module: "payment",
      action: "booklet_sms_reaction",
      correlationId: params.correlationId,
      organizationId: params.organizationId,
      orderId: params.orderId,
      paymentIntentId: params.paymentIntentId ?? null,
      ok: params.ok,
      status: params.status,
    }),
  );
}

export function logOpsBookletSmsReaction(params: {
  correlationId: string;
  organizationId: string;
  orderId: string;
  ok: boolean;
  status: string;
  event: string;
}): void {
  console.info(
    JSON.stringify({
      ts: new Date().toISOString(),
      level: "info",
      module: "commerce-ops",
      action: "booklet_sms_reaction",
      correlationId: params.correlationId,
      organizationId: params.organizationId,
      orderId: params.orderId,
      ok: params.ok,
      status: params.status,
      event: params.event,
    }),
  );
}
