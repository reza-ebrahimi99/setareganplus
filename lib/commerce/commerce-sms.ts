/**
 * Commerce order paid SMS.
 *
 * Buyer: dedicated Commerce verify pattern (FULLNAME / PRODUCT / AMOUNT).
 * Manager: unchanged form verify template path.
 *
 * Payment must never fail because of SMS.
 */

import { SmsMessageStatus } from "@/generated/prisma/enums";
import { sendTemplateMessage } from "@/lib/communication/send";
import { truncateSmsParam } from "@/lib/communication/sms-params";
import { readSmsProviderName } from "@/lib/communication/sms-provider";
import { listEnabledCommerceAdminSmsRecipients } from "@/lib/commerce/notification-settings";
import { commerceOrderQrUrl } from "@/lib/commerce/orders/qr";
import { normalizeIranianMobile } from "@/lib/forms/normalize-mobile";
import { formatRials } from "@/lib/registration/format";
import { prisma } from "@/lib/prisma";

function buildBuyerAuditBody(params: {
  fullName: string;
  product: string;
  amount: string;
  orderNumber: string;
  qrUrl: string;
}): string {
  return [
    "سفارش شما ثبت شد.",
    "شماره سفارش:",
    params.orderNumber,
    "",
    `${params.fullName} عزیز، خرید شما با موفقیت انجام شد.`,
    "",
    "📚 محصول:",
    params.product,
    "",
    "💰 مبلغ:",
    params.amount,
    "",
    "برای دریافت جزوه این لینک را نگه دارید.",
    params.qrUrl,
    "",
    "ستارگان پلاس",
    "setareganplus.ir",
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

function joinProductTitles(
  items: ReadonlyArray<{ titleSnapshot: string }>,
): string {
  if (items.length === 0) return "—";
  return items.map((item) => item.titleSnapshot.trim()).filter(Boolean).join("، ") || "—";
}

/**
 * Manager SMS — unchanged Registration/form verify path.
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
    select: { id: true },
  });
  if (existing) return;

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
 * Buyer SMS — dedicated Commerce verify pattern (FULLNAME / PRODUCT / AMOUNT).
 */
async function sendCommercePurchaseSms(params: {
  organizationId: string;
  toMobile: string;
  body: string;
  idempotencyKey: string;
  relatedId: string;
  fullName: string;
  product: string;
  amount: string;
  metadata?: Record<string, string | number | boolean | null>;
}): Promise<void> {
  const mobile = normalizeIranianMobile(params.toMobile);
  if (!mobile.ok) {
    console.error("[commerce-sms] invalid buyer mobile", {
      error: mobile.error,
    });
    return;
  }

  const fullName = truncateSmsParam(params.fullName);
  const product = truncateSmsParam(params.product);
  const amount = truncateSmsParam(params.amount);
  if (!fullName || !product || !amount) {
    console.error("[commerce-sms] missing commerce template params");
    return;
  }

  const existing = await prisma.smsMessage.findFirst({
    where: {
      organizationId: params.organizationId,
      idempotencyKey: params.idempotencyKey,
    },
    select: { id: true },
  });
  if (existing) return;

  let messageId: string;
  try {
    const created = await prisma.smsMessage.create({
      data: {
        organizationId: params.organizationId,
        toMobile: mobile.normalized,
        body: params.body,
        status: SmsMessageStatus.PROCESSING,
        provider: readSmsProviderName(),
        purpose: "commerce_order_paid",
        relatedType: "CommerceOrder",
        relatedId: params.relatedId,
        attemptCount: 1,
        maxAttempts: 1,
        idempotencyKey: params.idempotencyKey,
        metadata: {
          ...(params.metadata ?? {}),
          templateDelivery: {
            version: 1,
            kind: "commerce",
            variables: { fullName, product, amount },
          },
        },
      },
      select: { id: true },
    });
    messageId = created.id;
  } catch {
    return;
  }

  const result = await sendTemplateMessage({
    kind: "commerce",
    toMobile: mobile.normalized,
    variables: { fullName, product, amount },
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
    console.error("[commerce-sms] buyer send failed", {
      messageId,
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
        qrToken: true,
        items: {
          orderBy: { createdAt: "asc" },
          select: {
            titleSnapshot: true,
          },
        },
      },
    });
    if (!order) return;

    const orderNumber = order.orderNumber;
    const customerName = (order.buyerName ?? "خریدار").trim() || "خریدار";
    const mobileDisplay = (order.buyerMobile ?? "—").trim() || "—";
    const products = joinProductTitles(order.items);
    const amount = formatRials(order.grandTotalRials);

    const jobs: Array<Promise<void>> = [];

    if (order.buyerMobile) {
      jobs.push(
        sendCommercePurchaseSms({
          organizationId: params.organizationId,
          toMobile: order.buyerMobile,
          body: buildBuyerAuditBody({
            fullName: customerName,
            product: products,
            amount,
            orderNumber,
            qrUrl: commerceOrderQrUrl(order.qrToken),
          }),
          idempotencyKey: `commerce_order_paid:${order.id}:user`,
          relatedId: order.id,
          fullName: customerName,
          product: products,
          amount,
          metadata: {
            orderNumber,
            amount,
            products,
            qrUrl: commerceOrderQrUrl(order.qrToken),
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
