/**
 * Paid-order admin booklet SMS. Sent via SMS.ir Verify (approved admin
 * notification template) — same sendPatternTemplate() -> sendVerify() path
 * OTP already uses. No approved template = hard failure, never falls back
 * to plain sendText (that was the bug: the advertising line was used).
 */

import { listEnabledCommerceAdminSmsRecipients } from "@/lib/commerce/notification-settings";
import { normalizeIranianMobile } from "@/lib/forms/normalize-mobile";
import { prisma } from "@/lib/prisma";
import { deliverBookletSms } from "@/lib/commerce/booklet-sms/buyer";
import {
  buildBookletAdminSmsBody,
  buildBookletAdminVerifyParameters,
} from "@/lib/commerce/booklet-sms/builder";
import { logBookletSms } from "@/lib/commerce/booklet-sms/logger";
import { readBookletVerifyTemplateId } from "@/lib/commerce/booklet-sms/verify-config";
import type { BookletSmsDeliverInput } from "@/lib/commerce/booklet-sms/buyer";
import {
  bookletSmsError,
  type BookletSmsContext,
  type BookletSmsMessageOutcome,
} from "@/lib/commerce/booklet-sms/types";

export async function sendAdminPaidSms(params: {
  organizationId: string;
  orderId: string;
  buyerMobile: string | null;
  correlationId: string;
  ctx: BookletSmsContext;
  idempotencySuffix?: string;
  onlyMobile?: string;
  send?: BookletSmsDeliverInput["send"];
  sendVerify?: BookletSmsDeliverInput["sendVerify"];
  db?: typeof prisma;
  listRecipients?: (organizationId: string) => Promise<string[]>;
}): Promise<BookletSmsMessageOutcome[]> {
  logBookletSms({
    step: "BUILD_ADMIN",
    phase: "start",
    correlationId: params.correlationId,
    event: "PAID",
    organizationId: params.organizationId,
    orderId: params.orderId,
    recipientRole: "admin",
  });

  const listRecipients =
    params.listRecipients ?? listEnabledCommerceAdminSmsRecipients;
  const recipients = params.onlyMobile
    ? [params.onlyMobile]
    : await listRecipients(params.organizationId);

  if (recipients.length === 0) {
    logBookletSms({
      step: "BUILD_ADMIN",
      phase: "skipped",
      correlationId: params.correlationId,
      event: "PAID",
      organizationId: params.organizationId,
      orderId: params.orderId,
      recipientRole: "admin",
      skipReason: params.onlyMobile ? "no_recipients" : "admin_disabled",
    });
    return [
      {
        role: "admin",
        status: "skipped",
        messageId: null,
        skipReason: params.onlyMobile ? "no_recipients" : "admin_disabled",
        error: bookletSmsError("ADMIN_DISABLED"),
      },
    ];
  }

  const templateCode = readBookletVerifyTemplateId("admin");
  if (!templateCode) {
    logBookletSms({
      step: "BUILD_ADMIN",
      phase: "failed",
      correlationId: params.correlationId,
      event: "PAID",
      organizationId: params.organizationId,
      orderId: params.orderId,
      recipientRole: "admin",
      errorCode: "VERIFY_NOT_CONFIGURED",
    });
    return [
      {
        role: "admin",
        status: "failed",
        messageId: null,
        error: bookletSmsError("VERIFY_NOT_CONFIGURED"),
      },
    ];
  }
  const verifyParameters = buildBookletAdminVerifyParameters(params.ctx);

  const buyerNormalized = params.buyerMobile
    ? normalizeIranianMobile(params.buyerMobile)
    : null;
  // Kept only as the readable SmsMessage.body for admin history — the
  // actual transmitted content is the approved Verify template text.
  const renderedBody = buildBookletAdminSmsBody(
    params.ctx,
    buyerNormalized?.ok ? buyerNormalized.normalized : null,
  );

  logBookletSms({
    step: "BUILD_ADMIN",
    phase: "success",
    correlationId: params.correlationId,
    event: "PAID",
    organizationId: params.organizationId,
    orderId: params.orderId,
    recipientRole: "admin",
  });

  const outcomes: BookletSmsMessageOutcome[] = [];
  for (const recipient of recipients) {
    const adminMobile = normalizeIranianMobile(recipient);
    if (!adminMobile.ok) {
      outcomes.push({
        role: "admin",
        status: "skipped",
        messageId: null,
        skipReason: "invalid_mobile",
        error: bookletSmsError("INVALID_MOBILE"),
      });
      continue;
    }
    if (
      buyerNormalized?.ok &&
      adminMobile.normalized === buyerNormalized.normalized
    ) {
      logBookletSms({
        step: "SEND",
        phase: "skipped",
        correlationId: params.correlationId,
        event: "PAID",
        organizationId: params.organizationId,
        orderId: params.orderId,
        recipientRole: "admin",
        mobile: adminMobile.normalized,
        skipReason: "same_as_buyer",
      });
      outcomes.push({
        role: "admin",
        status: "skipped",
        messageId: null,
        skipReason: "same_as_buyer",
      });
      continue;
    }

    const idempotencyBase = `commerce_order_paid:${params.orderId}:admin:${adminMobile.normalized}`;
    outcomes.push(
      await deliverBookletSms({
        organizationId: params.organizationId,
        orderId: params.orderId,
        toMobile: adminMobile.normalized,
        renderedBody,
        dispatch: { mode: "verify", templateCode, parameters: verifyParameters },
        purpose: "commerce_order_paid_admin",
        idempotencyKey: `${idempotencyBase}${params.idempotencySuffix ?? ""}`,
        idempotencyBase,
        event: "PAID",
        role: "admin",
        builderName: "paid_admin",
        correlationId: params.correlationId,
        ctx: params.ctx,
        send: params.send,
        sendVerify: params.sendVerify,
        db: params.db,
      }),
    );
  }

  return outcomes;
}
