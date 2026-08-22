/**
 * Booklet order SMS — buyer receipt + stage updates.
 * Admin recipients keep the existing form verify template.
 * Payment / stage mutations must never fail because of SMS.
 *
 * Buyer channel is exclusive: premium text OR legacy commerce template, never both.
 */

import { SmsMessageStatus } from "@/generated/prisma/enums";
import { sendTemplateMessage, sendText } from "@/lib/communication/send";
import { truncateSmsParam } from "@/lib/communication/sms-params";
import { hasSmsIrLineNumber } from "@/lib/communication/providers/smsir-provider";
import { readSmsProviderName } from "@/lib/communication/sms-provider";
import { listEnabledCommerceAdminSmsRecipients } from "@/lib/commerce/notification-settings";
import {
  BOOKLET_READY_NOTICE_LINES,
} from "@/lib/commerce/booklet-hours";
import { commerceOrderQrUrl } from "@/lib/commerce/orders/qr";
import {
  COMMERCE_OPS_STAGE_LABELS,
  isCommerceOpsStage,
  type CommerceOpsStageValue,
} from "@/lib/commerce/orders/ops-stage";
import { normalizeIranianMobile } from "@/lib/forms/normalize-mobile";
import { formatJalaliDateTimeShort } from "@/lib/datetime/jalali";
import { formatRials } from "@/lib/registration/format";
import { prisma } from "@/lib/prisma";

export type BookletSmsContext = {
  fullName: string;
  booklet: string;
  amount: string;
  orderNumber: string;
  pickupBranch: string;
  statusLabel: string;
  bookletUrl: string;
};

export type BookletBuyerSmsChannel = "premium" | "legacy";

export const BOOKLET_STUDENT_SMS_STAGES = [
  "PAID",
  "READY_FOR_PICKUP",
  "DELIVERED_TO_STUDENT",
] as const;

export type BookletStudentSmsStage = (typeof BOOKLET_STUDENT_SMS_STAGES)[number];

export function isBookletStudentSmsStage(
  value: string | null | undefined,
): value is BookletStudentSmsStage {
  return (
    value === "PAID" ||
    value === "READY_FOR_PICKUP" ||
    value === "DELIVERED_TO_STUDENT"
  );
}

export function chooseBookletBuyerSmsChannel(): BookletBuyerSmsChannel {
  return hasSmsIrLineNumber() ? "premium" : "legacy";
}

export function compactSmsLines(lines: readonly string[]): string {
  return lines
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n");
}

function joinProductTitles(
  items: ReadonlyArray<{ titleSnapshot: string }>,
): string {
  if (items.length === 0) return "—";
  return items.map((item) => item.titleSnapshot.trim()).filter(Boolean).join("، ") || "—";
}

export function buildBookletPaidSmsBody(ctx: BookletSmsContext): string {
  return compactSmsLines([
    `سلام ${ctx.fullName} عزیز 🌹`,
    "✅ خرید شما ثبت شد.",
    `📚 ${ctx.booklet}`,
    `💰 ${ctx.amount}`,
    "🏢 محل دریافت:",
    ctx.pickupBranch,
    `🧾 ${ctx.orderNumber}`,
    "🎫 رسید و QR:",
    ctx.bookletUrl,
    ...BOOKLET_READY_NOTICE_LINES,
    "ستارگان پلاس",
  ]);
}

export function buildBookletStageSmsBody(
  stage: CommerceOpsStageValue,
  ctx: BookletSmsContext,
): string {
  if (stage === "PAID") return buildBookletPaidSmsBody(ctx);
  if (stage === "READY_FOR_PICKUP") {
    return compactSmsLines([
      `سلام ${ctx.fullName} عزیز 🌹`,
      "📚 جزوه شما آماده تحویل است.",
      "🏢 محل دریافت:",
      ctx.pickupBranch,
      "🎫 QR دریافت:",
      ctx.bookletUrl,
      "لطفاً هنگام مراجعه",
      "QR را به مسئول تحویل نشان دهید.",
      "ستارگان پلاس",
    ]);
  }
  if (stage === "DELIVERED_TO_STUDENT") {
    return compactSmsLines([
      `سلام ${ctx.fullName} عزیز 🌹`,
      "✅ جزوه",
      ctx.booklet,
      "با موفقیت تحویل شما شد.",
      "از اعتماد شما سپاسگزاریم.",
      ctx.bookletUrl,
      "ستارگان پلاس",
    ]);
  }
  return compactSmsLines([
    `سلام ${ctx.fullName} عزیز 🌹`,
    `📚 ${ctx.booklet}`,
    `🧾 ${ctx.orderNumber}`,
    ctx.bookletUrl,
    "ستارگان پلاس",
  ]);
}

function buildAdminAuditBody(params: {
  customerName: string;
  mobile: string;
  products: string;
  amount: string;
  orderNumber: string;
}): string {
  return compactSmsLines([
    "🛒 سفارش جدید فروشگاه",
    `نام: ${params.customerName}`,
    `موبایل: ${params.mobile}`,
    `محصول: ${params.products}`,
    `مبلغ: ${params.amount}`,
    `شماره سفارش: ${params.orderNumber}`,
  ]);
}

const SMS_STATUS_LABELS: Record<string, string> = {
  PENDING: "در صف",
  PROCESSING: "در حال ارسال",
  SENT: "ارسال شد",
  FAILED: "ناموفق",
  CANCELLED: "لغو",
};

const STAGE_TEMPLATE_LABELS: Record<string, string> = {
  PAID: "رسید خرید",
  READY_FOR_PICKUP: "آماده تحویل",
  DELIVERED_TO_STUDENT: "تحویل شد",
  REGISTERED: "ثبت سفارش",
  IN_PRODUCTION: "تولید",
};

export type CommerceOrderSmsHistoryItem = {
  id: string;
  templateLabel: string;
  stageLabel: string;
  sentAtLabel: string;
  status: string;
  statusLabel: string;
  providerResponse: string;
  canRetry: boolean;
};

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

async function sendCommerceBuyerExclusive(params: {
  organizationId: string;
  toMobile: string;
  body: string;
  purpose: string;
  idempotencyKey: string;
  relatedId: string;
  stage: CommerceOpsStageValue;
  ctx: BookletSmsContext;
  metadata?: Record<string, string | number | boolean | null>;
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

  const channel = chooseBookletBuyerSmsChannel();
  const fullName = truncateSmsParam(params.ctx.fullName);
  const product = truncateSmsParam(params.ctx.booklet);
  const amount = truncateSmsParam(params.ctx.amount);
  const useLegacy = channel === "legacy" && params.stage === "PAID";
  if (useLegacy && (!fullName || !product || !amount)) return;
  if (channel === "legacy" && params.stage !== "PAID") {
    console.error("[commerce-sms] premium channel required", {
      stage: params.stage,
    });
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
          channel,
          stage: params.stage,
          bookletUrl: params.ctx.bookletUrl,
          templateKind: useLegacy ? "commerce" : "premium",
        },
      },
      select: { id: true },
    });
    messageId = created.id;
  } catch {
    return;
  }

  const result = useLegacy
    ? await sendTemplateMessage({
        kind: "commerce",
        toMobile: mobile.normalized,
        variables: { fullName: fullName!, product: product!, amount: amount! },
        correlationId: messageId,
      })
    : await sendText({
        toMobile: mobile.normalized,
        body: params.body,
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
  const bookletUrl = commerceOrderQrUrl(order.qrToken);
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
      bookletUrl,
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
    if (!isBookletStudentSmsStage(params.stage) && !params.resend) return;
    const loaded = await loadBookletSmsContext(params);
    if (!loaded?.buyerMobile) return;
    const suffix = params.resend ? `:resend:${Date.now()}` : "";
    await sendCommerceBuyerExclusive({
      organizationId: params.organizationId,
      toMobile: loaded.buyerMobile,
      body: buildBookletStageSmsBody(params.stage, loaded.ctx),
      purpose: `commerce_order_${params.stage.toLowerCase()}`,
      idempotencyKey: `commerce_order_sms:${loaded.orderId}:${params.stage}${suffix}`,
      relatedId: loaded.orderId,
      stage: params.stage,
      ctx: loaded.ctx,
      metadata: {
        orderNumber: loaded.ctx.orderNumber,
        recipientRole: "buyer",
      },
    });
  } catch (error) {
    console.error("[commerce-sms] stage failed", {
      orderId: params.orderId,
      stage: params.stage,
      error: error instanceof Error ? error.message : error,
    });
  }
}

export async function resendCommerceOrderBuyerSms(params: {
  organizationId: string;
  orderId: string;
  stage?: CommerceOpsStageValue;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const loaded = await loadBookletSmsContext(params);
  if (!loaded) return { ok: false, error: "سفارش یافت نشد." };
  if (!loaded.buyerMobile) return { ok: false, error: "شماره موبایل ثبت نشده است." };
  const stage = params.stage ?? loaded.opsStage;
  if (!isBookletStudentSmsStage(stage)) {
    return { ok: false, error: "برای این مرحله پیامک دانش‌آموز تعریف نشده است." };
  }
  await enqueueCommerceOrderStageSms({
    organizationId: params.organizationId,
    orderId: loaded.orderId,
    stage,
    resend: true,
  });
  return { ok: true };
}

export async function retryCommerceOrderSms(params: {
  organizationId: string;
  messageId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const message = await prisma.smsMessage.findFirst({
    where: {
      id: params.messageId,
      organizationId: params.organizationId,
      relatedType: "CommerceOrder",
    },
    select: {
      relatedId: true,
      status: true,
      metadata: true,
    },
  });
  if (!message?.relatedId) return { ok: false, error: "پیامک یافت نشد." };
  if (message.status !== SmsMessageStatus.FAILED) {
    return { ok: false, error: "فقط پیامک ناموفق قابل تلاش مجدد است." };
  }
  const meta =
    message.metadata && typeof message.metadata === "object" && !Array.isArray(message.metadata)
      ? (message.metadata as Record<string, unknown>)
      : {};
  const stageRaw = typeof meta.stage === "string" ? meta.stage : "PAID";
  const stage = isBookletStudentSmsStage(stageRaw) ? stageRaw : "PAID";
  return resendCommerceOrderBuyerSms({
    organizationId: params.organizationId,
    orderId: message.relatedId,
    stage,
  });
}

export async function listCommerceOrderSmsHistory(params: {
  organizationId: string;
  orderId: string;
}): Promise<CommerceOrderSmsHistoryItem[]> {
  const rows = await prisma.smsMessage.findMany({
    where: {
      organizationId: params.organizationId,
      relatedType: "CommerceOrder",
      relatedId: params.orderId,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      purpose: true,
      status: true,
      sentAt: true,
      createdAt: true,
      lastError: true,
      providerMessageId: true,
      metadata: true,
    },
  });
  return rows.map((row) => {
    const meta =
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {};
    const stage = typeof meta.stage === "string" ? meta.stage : "";
    const templateKind = typeof meta.templateKind === "string" ? meta.templateKind : "";
    const templateLabel =
      templateKind === "commerce"
        ? "قالب فروشگاه"
        : templateKind === "form"
          ? "قالب ثبت‌نام"
          : templateKind === "premium"
            ? "پیامک جزوه"
            : row.purpose.includes("admin")
              ? "قالب ثبت‌نام"
              : "پیامک جزوه";
    return {
      id: row.id,
      templateLabel,
      stageLabel: STAGE_TEMPLATE_LABELS[stage] ?? row.purpose,
      sentAtLabel: formatJalaliDateTimeShort(row.sentAt ?? row.createdAt),
      status: row.status,
      statusLabel: SMS_STATUS_LABELS[row.status] ?? row.status,
      providerResponse: row.lastError ?? row.providerMessageId ?? "—",
      canRetry: row.status === SmsMessageStatus.FAILED,
    };
  });
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
    const buyerNormalized = loaded.buyerMobile
      ? normalizeIranianMobile(loaded.buyerMobile)
      : null;
    const adminBody = buildAdminAuditBody({
      customerName: loaded.ctx.fullName,
      mobile: loaded.buyerMobile ?? "—",
      products: loaded.ctx.booklet,
      amount: loaded.ctx.amount,
      orderNumber: loaded.ctx.orderNumber,
    });
    for (const recipient of adminRecipients) {
      const adminMobile = normalizeIranianMobile(recipient);
      if (
        adminMobile.ok &&
        buyerNormalized?.ok &&
        adminMobile.normalized === buyerNormalized.normalized
      ) {
        continue;
      }
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
            templateKind: "form",
            stage: "PAID",
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
