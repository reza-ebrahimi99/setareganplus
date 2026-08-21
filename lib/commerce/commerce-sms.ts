/**
 * Booklet order SMS — buyer receipt + stage updates.
 * Admin recipients keep the existing form verify template.
 * Payment / stage mutations must never fail because of SMS.
 */

import { SmsMessageStatus } from "@/generated/prisma/enums";
import { sendTemplateMessage, sendText } from "@/lib/communication/send";
import { truncateSmsParam } from "@/lib/communication/sms-params";
import { readSmsProviderName } from "@/lib/communication/sms-provider";
import { listEnabledCommerceAdminSmsRecipients } from "@/lib/commerce/notification-settings";
import {
  BOOKLET_PICKUP_HOURS,
  BOOKLET_PICKUP_INSTRUCTIONS,
} from "@/lib/commerce/booklet-hours";
import {
  commerceOrderQrUrl,
  commerceOrderReceiptUrl,
} from "@/lib/commerce/orders/qr";
import {
  COMMERCE_OPS_STAGE_LABELS,
  isCommerceOpsStage,
  type CommerceOpsStageValue,
} from "@/lib/commerce/orders/ops-stage";
import { normalizeIranianMobile } from "@/lib/forms/normalize-mobile";
import { formatRials } from "@/lib/registration/format";
import { prisma } from "@/lib/prisma";

export type BookletSmsContext = {
  fullName: string;
  booklet: string;
  amount: string;
  orderNumber: string;
  pickupBranch: string;
  statusLabel: string;
  receiptUrl: string;
  pickupUrl: string;
  hours: string;
};

function joinProductTitles(
  items: ReadonlyArray<{ titleSnapshot: string }>,
): string {
  if (items.length === 0) return "—";
  return items.map((item) => item.titleSnapshot.trim()).filter(Boolean).join("، ") || "—";
}

export function buildBookletPaidSmsBody(ctx: BookletSmsContext): string {
  return [
    `سلام ${ctx.fullName} عزیز 🌹`,
    "",
    "خرید شما با موفقیت ثبت شد.",
    "",
    "📚 جزوه:",
    ctx.booklet,
    "",
    "💰 مبلغ:",
    ctx.amount,
    "",
    "🏢 محل دریافت:",
    ctx.pickupBranch,
    "",
    "🧾 شماره سفارش:",
    ctx.orderNumber,
    "",
    "📄 رسید:",
    ctx.receiptUrl,
    "",
    "🎫 QR دریافت:",
    ctx.pickupUrl,
    "",
    BOOKLET_PICKUP_INSTRUCTIONS,
    "",
    "ستارگان پلاس",
    "setareganplus.ir",
  ].join("\n");
}

export function buildBookletStageSmsBody(
  stage: CommerceOpsStageValue,
  ctx: BookletSmsContext,
): string {
  if (stage === "PAID") return buildBookletPaidSmsBody(ctx);
  if (stage === "REGISTERED") {
    return [
      `سلام ${ctx.fullName} عزیز`,
      "",
      "سفارش جزوه شما ثبت شد.",
      "",
      "📚 جزوه:",
      ctx.booklet,
      "",
      "🧾 شماره سفارش:",
      ctx.orderNumber,
      "",
      "🏢 محل دریافت:",
      ctx.pickupBranch,
      "",
      "پس از پرداخت، رسید و QR برای شما پیامک می‌شود.",
      "",
      "ستارگان پلاس",
    ].join("\n");
  }
  if (stage === "IN_PRODUCTION") {
    return [
      `سلام ${ctx.fullName} عزیز`,
      "",
      "جزوه شما وارد مرحله تولید شد.",
      "",
      "📚 جزوه:",
      ctx.booklet,
      "",
      "🧾 شماره سفارش:",
      ctx.orderNumber,
      "",
      "زمان تقریبی آماده شدن: ۱ تا ۲ روز کاری",
      "",
      "📄 رسید:",
      ctx.receiptUrl,
      "",
      "ستارگان پلاس",
    ].join("\n");
  }
  if (stage === "READY_FOR_PICKUP") {
    return [
      `سلام ${ctx.fullName} عزیز`,
      "",
      "جزوه شما آماده تحویل است.",
      "",
      "📚 جزوه:",
      ctx.booklet,
      "",
      "🏢 محل دریافت:",
      ctx.pickupBranch,
      "",
      "🕐 ساعات کاری:",
      ctx.hours,
      "",
      "🎫 QR دریافت:",
      ctx.pickupUrl,
      "",
      BOOKLET_PICKUP_INSTRUCTIONS,
      "",
      "ستارگان پلاس",
      "setareganplus.ir",
    ].join("\n");
  }
  return [
    `سلام ${ctx.fullName} عزیز`,
    "",
    "جزوه شما با موفقیت تحویل داده شد.",
    "",
    "📚 جزوه:",
    ctx.booklet,
    "",
    "🏢 محل دریافت:",
    ctx.pickupBranch,
    "",
    "🧾 شماره سفارش:",
    ctx.orderNumber,
    "",
    "از خرید شما سپاسگزاریم.",
    "",
    "ستارگان پلاس",
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
  if (!mobile.ok) return;

  const name = truncateSmsParam(params.name);
  const tracking = truncateSmsParam(params.tracking);
  if (!name || !tracking) return;

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

  await prisma.smsMessage.update({
    where: { id: messageId },
    data: result.ok
      ? {
          status: SmsMessageStatus.SENT,
          sentAt: new Date(),
          providerMessageId: result.providerMessageId,
          lastError: null,
        }
      : {
          status: SmsMessageStatus.FAILED,
          lastError: result.safeMessage,
        },
  });
}

async function sendCommerceBuyerText(params: {
  organizationId: string;
  toMobile: string;
  body: string;
  purpose: string;
  idempotencyKey: string;
  relatedId: string;
  metadata?: Record<string, string | number | boolean | null>;
  fallbackTemplate?: {
    fullName: string;
    product: string;
    amount: string;
  };
}): Promise<void> {
  const mobile = normalizeIranianMobile(params.toMobile);
  if (!mobile.ok) return;

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
        metadata: params.metadata ?? {},
      },
      select: { id: true },
    });
    messageId = created.id;
  } catch {
    return;
  }

  let result = await sendText({
    toMobile: mobile.normalized,
    body: params.body,
    correlationId: messageId,
  });

  if (!result.ok && params.fallbackTemplate) {
    const fullName = truncateSmsParam(params.fallbackTemplate.fullName);
    const product = truncateSmsParam(params.fallbackTemplate.product);
    const amount = truncateSmsParam(params.fallbackTemplate.amount);
    if (fullName && product && amount) {
      result = await sendTemplateMessage({
        kind: "commerce",
        toMobile: mobile.normalized,
        variables: { fullName, product, amount },
        correlationId: messageId,
      });
    }
  }

  await prisma.smsMessage.update({
    where: { id: messageId },
    data: result.ok
      ? {
          status: SmsMessageStatus.SENT,
          sentAt: new Date(),
          providerMessageId: result.providerMessageId,
          lastError: null,
        }
      : {
          status: SmsMessageStatus.FAILED,
          lastError: result.safeMessage,
        },
  });
}

async function loadBookletSmsContext(params: {
  organizationId: string;
  orderId: string;
}): Promise<
  | {
      orderId: string;
      buyerMobile: string | null;
      opsStage: CommerceOpsStageValue;
      ctx: BookletSmsContext;
    }
  | null
> {
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
      opsStage: true,
      pickupBranch: { select: { name: true } },
      items: {
        orderBy: { createdAt: "asc" },
        select: { titleSnapshot: true },
      },
    },
  });
  if (!order) return null;
  const stage = isCommerceOpsStage(order.opsStage) ? order.opsStage : "REGISTERED";
  const pickupUrl = commerceOrderQrUrl(order.qrToken);
  return {
    orderId: order.id,
    buyerMobile: order.buyerMobile,
    opsStage: stage,
    ctx: {
      fullName: (order.buyerName ?? "دانش‌آموز").trim() || "دانش‌آموز",
      booklet: joinProductTitles(order.items),
      amount: formatRials(order.grandTotalRials),
      orderNumber: order.orderNumber,
      pickupBranch: order.pickupBranch?.name ?? "—",
      statusLabel: COMMERCE_OPS_STAGE_LABELS[stage],
      receiptUrl: commerceOrderReceiptUrl(order.qrToken),
      pickupUrl,
      hours: BOOKLET_PICKUP_HOURS,
    },
  };
}

export async function enqueueCommerceOrderStageSms(params: {
  organizationId: string;
  orderId: string;
  stage: CommerceOpsStageValue;
  resend?: boolean;
}): Promise<void> {
  try {
    const loaded = await loadBookletSmsContext(params);
    if (!loaded?.buyerMobile) return;
    const suffix = params.resend ? `:resend:${Date.now()}` : "";
    await sendCommerceBuyerText({
      organizationId: params.organizationId,
      toMobile: loaded.buyerMobile,
      body: buildBookletStageSmsBody(params.stage, loaded.ctx),
      purpose: `commerce_order_${params.stage.toLowerCase()}`,
      idempotencyKey: `commerce_order_sms:${loaded.orderId}:${params.stage}${suffix}`,
      relatedId: loaded.orderId,
      metadata: {
        orderNumber: loaded.ctx.orderNumber,
        stage: params.stage,
        pickupUrl: loaded.ctx.pickupUrl,
        receiptUrl: loaded.ctx.receiptUrl,
        recipientRole: "buyer",
      },
      fallbackTemplate:
        params.stage === "PAID"
          ? {
              fullName: loaded.ctx.fullName,
              product: loaded.ctx.booklet,
              amount: loaded.ctx.amount,
            }
          : undefined,
    });
  } catch (error) {
    console.error("[commerce-sms] stage failed", {
      orderId: params.orderId,
      stage: params.stage,
      error: error instanceof Error ? error.message : error,
    });
  }
}

/**
 * Buyer + manager SMS after commerce payment PAID.
 * Safe to fire-and-forget from payment callback.
 */
export async function resendCommerceOrderBuyerSms(params: {
  organizationId: string;
  orderId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const loaded = await loadBookletSmsContext(params);
  if (!loaded) return { ok: false, error: "سفارش یافت نشد." };
  if (!loaded.buyerMobile) return { ok: false, error: "شماره موبایل ثبت نشده است." };
  await enqueueCommerceOrderStageSms({
    organizationId: params.organizationId,
    orderId: loaded.orderId,
    stage: loaded.opsStage,
    resend: true,
  });
  return { ok: true };
}

export async function enqueueCommerceOrderPaidSms(params: {
  organizationId: string;
  orderId: string;
}): Promise<void> {
  try {
    const loaded = await loadBookletSmsContext(params);
    if (!loaded) return;

    const jobs: Array<Promise<void>> = [];
    if (loaded.buyerMobile) {
      jobs.push(
        enqueueCommerceOrderStageSms({
          organizationId: params.organizationId,
          orderId: loaded.orderId,
          stage: "PAID",
        }),
      );
    }

    const adminRecipients = await listEnabledCommerceAdminSmsRecipients(
      params.organizationId,
    );
    const adminBody = buildAdminAuditBody({
      customerName: loaded.ctx.fullName,
      mobile: loaded.buyerMobile ?? "—",
      products: loaded.ctx.booklet,
      amount: loaded.ctx.amount,
      orderNumber: loaded.ctx.orderNumber,
    });
    for (const recipient of adminRecipients) {
      jobs.push(
        sendCommerceFormSms({
          organizationId: params.organizationId,
          toMobile: recipient,
          body: adminBody,
          purpose: "commerce_order_paid_admin",
          idempotencyKey: `commerce_order_paid:${loaded.orderId}:admin:${recipient}`,
          relatedId: loaded.orderId,
          name: loaded.ctx.fullName,
          tracking: loaded.ctx.orderNumber,
          metadata: {
            orderNumber: loaded.ctx.orderNumber,
            amount: loaded.ctx.amount,
            products: loaded.ctx.booklet,
            buyerMobile: loaded.buyerMobile,
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
