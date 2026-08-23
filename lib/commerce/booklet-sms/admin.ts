/**
 * Paid-order admin booklet SMS. Plain text only.
 */

import { listEnabledCommerceAdminSmsRecipients } from "@/lib/commerce/notification-settings";
import { normalizeIranianMobile } from "@/lib/forms/normalize-mobile";
import { prisma } from "@/lib/prisma";
import { deliverPlainTextSms } from "@/lib/commerce/booklet-sms/buyer";
import { buildBookletAdminSmsBody } from "@/lib/commerce/booklet-sms/builder";
import { logBookletSms } from "@/lib/commerce/booklet-sms/logger";
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

  const buyerNormalized = params.buyerMobile
    ? normalizeIranianMobile(params.buyerMobile)
    : null;
  const body = buildBookletAdminSmsBody(
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
      await deliverPlainTextSms({
        organizationId: params.organizationId,
        orderId: params.orderId,
        toMobile: adminMobile.normalized,
        body,
        purpose: "commerce_order_paid_admin",
        idempotencyKey: `${idempotencyBase}${params.idempotencySuffix ?? ""}`,
        idempotencyBase,
        event: "PAID",
        role: "admin",
        builderName: "paid_admin",
        correlationId: params.correlationId,
        ctx: params.ctx,
        send: params.send,
        db: params.db,
      }),
    );
  }

  return outcomes;
}
