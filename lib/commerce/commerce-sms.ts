/**
 * Commerce order paid SMS — production provider path (same as Registration delivery).
 *
 * Root cause of prior failure: free-text sendText is unsupported by SMS.ir.
 * Registration/Booking succeed because they use sendTemplateMessage (form/booking
 * verify templates), not free text.
 *
 * This module calls sendTemplateMessage({ kind: "form" }) directly via
 * lib/communication/send.ts, with sms_messages used only for idempotency/audit
 * (CRM-style). No worker dependency. Payment must never fail because of SMS.
 */

import { SmsMessageStatus } from "@/generated/prisma/enums";
import { sendTemplateMessage } from "@/lib/communication/send";
import { truncateSmsParam } from "@/lib/communication/sms-params";
import { readSmsProviderName } from "@/lib/communication/sms-provider";
import { listEnabledCommerceAdminSmsRecipients } from "@/lib/commerce/notification-settings";
import { normalizeIranianMobile } from "@/lib/forms/normalize-mobile";
import { formatRials } from "@/lib/registration/format";
import { prisma } from "@/lib/prisma";

function buildBuyerAuditBody(params: {
  orderNumber: string;
  amount: string;
}): string {
  return [
    "خرید شما از فروشگاه ستارگان با موفقیت ثبت شد.",
    "",
    "شماره سفارش:",
    params.orderNumber,
    "",
    "مبلغ:",
    params.amount,
    "",
    "از خرید شما سپاسگزاریم.",
  ].join("\n");
}

function buildAdminAuditBody(params: {
  customerName: string;
  mobile: string;
  products: string;
  amount: string;
  orderNumber: string;
}): string {
  return [
    "🛒 سفارش جدید فروشگاه",
    "",
    "نام:",
    params.customerName,
    "",
    "موبایل:",
    params.mobile,
    "",
    "محصول:",
    params.products,
    "",
    "مبلغ:",
    params.amount,
    "",
    "شماره سفارش:",
    params.orderNumber,
  ].join("\n");
}

/**
 * Idempotent immediate send via SMS.ir form verify template (Registration path).
 */
async function sendCommerceFormSms(params: {
  organizationId: string;
  toMobile: string;
  body: string;
  purpose: string;
  idempotencyKey: string;
  relatedId: string;
  name: string;
  tracking: string;
  metadata?: Record<string, string | number | boolean | null>;
}): Promise<void> {
  const mobile = normalizeIranianMobile(params.toMobile);
  if (!mobile.ok) {
    console.error("[commerce-sms] invalid mobile", {
      purpose: params.purpose,
      error: mobile.error,
    });
    return;
  }

  const name = truncateSmsParam(params.name);
  const tracking = truncateSmsParam(params.tracking);
  if (!name || !tracking) {
    console.error("[commerce-sms] missing template params", {
      purpose: params.purpose,
    });
    return;
  }

  const existing = await prisma.smsMessage.findFirst({
    where: {
      organizationId: params.organizationId,
      idempotencyKey: params.idempotencyKey,
    },
    select: { id: true, status: true },
  });
  if (existing) {
    // Already attempted for this order+recipient — avoid duplicate send.
    return;
  }

  let messageId: string;
  try {
    const created = await prisma.smsMessage.create({
      data: {
        organizationId: params.organizationId,
        toMobile: mobile.normalized,
        body: params.body,
        status: SmsMessageStatus.PROCESSING,
        provider: readSmsProviderName(),
        purpose: params.purpose,
        relatedType: "CommerceOrder",
        relatedId: params.relatedId,
        attemptCount: 1,
        maxAttempts: 1,
        idempotencyKey: params.idempotencyKey,
        metadata: {
          ...(params.metadata ?? {}),
          templateDelivery: {
            version: 1,
            kind: "form",
            variables: { name, tracking },
          },
        },
      },
      select: { id: true },
    });
    messageId = created.id;
  } catch {
    // Unique race on idempotencyKey — treat as already handled.
    return;
  }

  const result = await sendTemplateMessage({
    kind: "form",
    toMobile: mobile.normalized,
    variables: { name, tracking },
    correlationId: messageId,
  });

  const sentAt = new Date();
  await prisma.smsMessage.update({
    where: { id: messageId },
    data: result.ok
      ? {
          status: SmsMessageStatus.SENT,
          sentAt,
          providerMessageId: result.providerMessageId,
          lastError: null,
        }
      : {
          status: SmsMessageStatus.FAILED,
          lastError: result.safeMessage,
        },
  });

  if (!result.ok) {
    console.error("[commerce-sms] provider send failed", {
      messageId,
      purpose: params.purpose,
      error: result.safeMessage,
    });
  }
}

/**
 * Buyer + manager SMS after commerce payment PAID.
 * Safe to fire-and-forget from payment callback.
 */
export async function enqueueCommerceOrderPaidSms(params: {
  organizationId: string;
  orderId: string;
}): Promise<void> {
  try {
    const order = await prisma.commerceOrder.findFirst({
      where: {
        id: params.orderId,
        organizationId: params.organizationId,
      },
      select: {
        id: true,
        orderNumber: true,
        buyerMobile: true,
        buyerName: true,
        grandTotalRials: true,
        items: {
          orderBy: { createdAt: "asc" },
          select: {
            titleSnapshot: true,
            quantity: true,
          },
        },
      },
    });
    if (!order) return;

    const orderNumber = order.orderNumber;
    const customerName = (order.buyerName ?? "خریدار").trim() || "خریدار";
    const mobileDisplay = (order.buyerMobile ?? "—").trim() || "—";
    const products =
      order.items.length > 0
        ? order.items
            .map((item) => `${item.titleSnapshot} × ${item.quantity}`)
            .join("، ")
        : "—";
    const amount = formatRials(order.grandTotalRials);

    const jobs: Array<Promise<void>> = [];

    if (order.buyerMobile) {
      jobs.push(
        sendCommerceFormSms({
          organizationId: params.organizationId,
          toMobile: order.buyerMobile,
          body: buildBuyerAuditBody({ orderNumber, amount }),
          purpose: "commerce_order_paid",
          idempotencyKey: `commerce_order_paid:${order.id}:user`,
          relatedId: order.id,
          name: customerName,
          tracking: orderNumber,
          metadata: {
            orderNumber,
            amount,
            recipientRole: "buyer",
          },
        }),
      );
    }

    const adminRecipients = await listEnabledCommerceAdminSmsRecipients(
      params.organizationId,
    );
    const adminBody = buildAdminAuditBody({
      customerName,
      mobile: mobileDisplay,
      products,
      amount,
      orderNumber,
    });

    for (const recipient of adminRecipients) {
      jobs.push(
        sendCommerceFormSms({
          organizationId: params.organizationId,
          toMobile: recipient,
          body: adminBody,
          purpose: "commerce_order_paid_admin",
          idempotencyKey: `commerce_order_paid:${order.id}:admin:${recipient}`,
          relatedId: order.id,
          name: customerName,
          tracking: orderNumber,
          metadata: {
            orderNumber,
            amount,
            products,
            buyerMobile: mobileDisplay,
            recipientRole: "admin",
          },
        }),
      );
    }

    if (jobs.length === 0) return;

    const settled = await Promise.allSettled(jobs);
    for (const result of settled) {
      if (result.status === "rejected") {
        console.error("[commerce-sms] job rejected", {
          orderId: params.orderId,
          reason:
            result.reason instanceof Error
              ? result.reason.message
              : String(result.reason),
        });
      }
    }
  } catch (error) {
    console.error("[commerce-sms] failed", {
      orderId: params.orderId,
      error: error instanceof Error ? error.message : error,
    });
  }
}
