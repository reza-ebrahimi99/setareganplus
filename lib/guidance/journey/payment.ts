/**
 * Guidance Journey Engine — Step 3 dedicated payment flow.
 *
 * WHY A SEPARATE FLOW (not lib/payment/service.ts):
 * startCheckoutForRegistration/startCheckoutForCommerceOrder and
 * verifyPaymentCallback() are large, production-critical, and hard-coded to
 * the Registration/Commerce domains (CRM activities, inventory, SMS
 * reactions, receipts). Rather than adding a third branch through that
 * surface (real risk of regressing live payment flows), this module reuses
 * the same underlying primitives — PaymentIntent/PaymentSession schema,
 * the PaymentProvider abstraction, Zibal safety guards, and the payment
 * status machine — but owns its own start/verify functions and its own
 * callback route (/payments/callback/guidance). Registration/Commerce code
 * is never touched.
 */

import { randomBytes } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { PaymentStatus } from "@/generated/prisma/enums";
import { AuditAction } from "@/generated/prisma/enums";
import { getPaymentProvider } from "@/lib/payment/get-provider";
import { logPaymentEvent } from "@/lib/payment/logger";
import {
  checkVerifiedAmountAgainstIntent,
  isAllowedZibalCheckoutUrl,
} from "@/lib/payment/payment-guards";
import {
  assertPaymentTransition,
  isRetryablePaymentStatus,
  isTerminalPaymentStatus,
} from "@/lib/payment/status-machine";
import { prisma } from "@/lib/prisma";
import { advanceGuidanceJourneyStep } from "@/lib/guidance/journey/advance";
import { getGuidancePackage } from "@/lib/guidance/journey/packages";

const INTENT_TTL_MS = 60 * 60 * 1000;
const GUIDANCE_CALLBACK_PATH = "/payments/callback/guidance";

function newCallbackToken(): string {
  return randomBytes(24).toString("hex");
}

function newReceiptNumber(): string {
  return `RCP-GD-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

/** Rewrites the mock provider's generic checkout URL to our own guidance-scoped simulator page. */
function rewriteMockCheckoutUrl(rawUrl: string, fallbackToken: string): string {
  try {
    const url = new URL(rawUrl, "https://internal.local");
    const sessionId = url.pathname.split("/").filter(Boolean).pop() ?? "";
    const token = url.searchParams.get("token") ?? fallbackToken;
    return `/payments/mock/guidance-checkout/${encodeURIComponent(sessionId)}?token=${encodeURIComponent(token)}`;
  } catch {
    return rawUrl;
  }
}

export type StartGuidanceCheckoutResult =
  | { ok: true; checkoutUrl: string; paymentIntentId: string }
  | { ok: false; error: string };

export async function startGuidancePackageCheckout(params: {
  organizationId: string;
  planId: string;
  planPublicId: string;
  packageCode: string;
}): Promise<StartGuidanceCheckoutResult> {
  const pkg = getGuidancePackage(params.packageCode);
  if (!pkg) {
    return { ok: false, error: "بسته انتخاب‌شده معتبر نیست." };
  }

  const plan = await prisma.guidancePlan.findFirst({
    where: { id: params.planId, organizationId: params.organizationId, deletedAt: null },
    select: { id: true, publicId: true, packagePaidAt: true },
  });
  if (!plan) {
    return { ok: false, error: "پرونده انتخاب رشته یافت نشد." };
  }
  if (plan.packagePaidAt) {
    return { ok: false, error: "بسته مشاوره قبلاً پرداخت شده است." };
  }

  const provider = getPaymentProvider();
  const idempotencyKey = `guidance-package:${plan.id}:${pkg.priceRials}`;
  const description = `ثبت‌نام بسته «${pkg.title}» — سامانه انتخاب رشته`;

  let intent = await prisma.paymentIntent.findFirst({
    where: { organizationId: params.organizationId, idempotencyKey },
  });

  if (intent && intent.status === PaymentStatus.PAID) {
    return { ok: false, error: "بسته مشاوره قبلاً پرداخت شده است." };
  }

  if (!intent) {
    intent = await prisma.paymentIntent.create({
      data: {
        organizationId: params.organizationId,
        payableType: "GUIDANCE_PACKAGE",
        payableId: plan.id,
        idempotencyKey,
        status: PaymentStatus.PENDING,
        provider: provider.id,
        amountRials: pkg.priceRials,
        discountRials: 0,
        finalAmountRials: pkg.priceRials,
        currency: "IRR",
        description,
        expiresAt: new Date(Date.now() + INTENT_TTL_MS),
      },
    });
    await logPaymentEvent({
      organizationId: params.organizationId,
      paymentIntentId: intent.id,
      fromStatus: null,
      toStatus: PaymentStatus.PENDING,
      event: "intent.created",
      message: "Guidance package payment intent created",
    });
  }

  if (
    intent.status !== PaymentStatus.PENDING &&
    !isRetryablePaymentStatus(intent.status) &&
    intent.status !== PaymentStatus.PROCESSING
  ) {
    return { ok: false, error: "امکان شروع پرداخت برای این وضعیت وجود ندارد." };
  }

  const fromStatus = intent.status;
  if (fromStatus !== PaymentStatus.PROCESSING) {
    assertPaymentTransition(fromStatus, PaymentStatus.PROCESSING);
  }

  const callbackToken = newCallbackToken();
  const requested = await provider.requestPayment({
    organizationId: params.organizationId,
    paymentIntentId: intent.id,
    amountRials: intent.finalAmountRials,
    currency: intent.currency,
    description: intent.description ?? description,
    callbackPath: GUIDANCE_CALLBACK_PATH,
    callbackToken,
    metadata: { guidancePlanPublicId: plan.publicId, packageCode: pkg.code },
  });

  if (!requested.ok) {
    return { ok: false, error: requested.error };
  }

  let checkoutUrl = requested.checkoutUrl?.trim() ?? "";
  if (!checkoutUrl) {
    return {
      ok: false,
      error: "لینک درگاه پرداخت دریافت نشد. لطفاً دوباره تلاش کنید.",
    };
  }

  if (provider.id === "zibal") {
    if (!isAllowedZibalCheckoutUrl(checkoutUrl)) {
      return { ok: false, error: "آدرس درگاه پرداخت نامعتبر است." };
    }
  } else if (provider.id === "mock") {
    checkoutUrl = rewriteMockCheckoutUrl(checkoutUrl, callbackToken);
  }

  await prisma.$transaction(async (tx) => {
    const updatedIntent = await tx.paymentIntent.update({
      where: { id: intent!.id },
      data: {
        status: PaymentStatus.PROCESSING,
        provider: provider.id,
        trackingCode: requested.trackingCode,
        failedAt: null,
        cancelledAt: null,
      },
    });

    await logPaymentEvent({
      organizationId: params.organizationId,
      paymentIntentId: updatedIntent.id,
      fromStatus,
      toStatus: PaymentStatus.PROCESSING,
      event: "checkout.started",
      message: "Guidance checkout session opened",
      metadata: { providerSessionId: requested.providerSessionId },
      tx,
    });

    await tx.paymentSession.create({
      data: {
        organizationId: params.organizationId,
        paymentIntentId: updatedIntent.id,
        provider: provider.id,
        providerSessionId: requested.providerSessionId,
        status: PaymentStatus.PROCESSING,
        checkoutUrl,
        callbackToken,
        rawRequestJson: requested.raw as Prisma.InputJsonValue,
        expiresAt: new Date(Date.now() + INTENT_TTL_MS),
      },
    });

    await tx.guidancePlan.update({
      where: { id: plan.id },
      data: { guidancePackageCode: pkg.code },
    });
  });

  return { ok: true, checkoutUrl, paymentIntentId: intent.id };
}

export type VerifyGuidancePaymentResult =
  | {
      ok: true;
      status: PaymentStatus;
      alreadyFinalized: boolean;
      planPublicId: string;
    }
  | { ok: false; error: string };

export async function verifyGuidancePaymentCallback(params: {
  organizationId: string;
  provider: string;
  callbackToken: string;
  callbackPayload: Record<string, unknown>;
}): Promise<VerifyGuidancePaymentResult> {
  const session = await prisma.paymentSession.findFirst({
    where: {
      organizationId: params.organizationId,
      callbackToken: params.callbackToken,
      provider: params.provider,
    },
    include: { paymentIntent: true },
  });

  if (!session) {
    return { ok: false, error: "نشست پرداخت یافت نشد." };
  }

  const intent = session.paymentIntent;
  if (intent.payableType !== "GUIDANCE_PACKAGE") {
    return { ok: false, error: "این پرداخت متعلق به سامانه انتخاب رشته نیست." };
  }

  const plan = await prisma.guidancePlan.findFirst({
    where: { id: intent.payableId, organizationId: params.organizationId, deletedAt: null },
    select: { id: true, publicId: true, studentId: true, userId: true },
  });
  if (!plan) {
    return { ok: false, error: "پرونده مرتبط با این پرداخت یافت نشد." };
  }

  if (isTerminalPaymentStatus(intent.status) || intent.status === PaymentStatus.PAID) {
    return {
      ok: true,
      status: intent.status,
      alreadyFinalized: true,
      planPublicId: plan.publicId,
    };
  }

  if (
    intent.status === PaymentStatus.FAILED ||
    intent.status === PaymentStatus.CANCELLED
  ) {
    return {
      ok: true,
      status: intent.status,
      alreadyFinalized: true,
      planPublicId: plan.publicId,
    };
  }

  const provider = getPaymentProvider();
  if (provider.id !== params.provider) {
    return { ok: false, error: "درگاه پرداخت با نشست هم‌خوانی ندارد." };
  }

  const verified = await provider.verifyPayment({
    organizationId: params.organizationId,
    providerSessionId: session.providerSessionId,
    callbackToken: params.callbackToken,
    callbackPayload: params.callbackPayload,
  });

  if (!verified.ok) {
    return { ok: false, error: verified.error };
  }

  if (verified.outcome === "paid") {
    const amountCheck = checkVerifiedAmountAgainstIntent({
      providerId: provider.id,
      verifiedAmountRials: verified.amountRials,
      expectedFinalAmountRials: intent.finalAmountRials,
    });
    if (!amountCheck.ok) {
      return { ok: false, error: amountCheck.error };
    }
  }

  const nextStatus: PaymentStatus =
    verified.outcome === "paid"
      ? PaymentStatus.PAID
      : verified.outcome === "cancelled"
        ? PaymentStatus.CANCELLED
        : PaymentStatus.FAILED;

  assertPaymentTransition(intent.status, nextStatus);

  const receiptNumber = nextStatus === PaymentStatus.PAID ? newReceiptNumber() : null;
  const trackingCode = verified.trackingCode ?? intent.trackingCode;

  await prisma.$transaction(async (tx) => {
    const locked = await tx.paymentIntent.updateMany({
      where: {
        id: intent.id,
        organizationId: params.organizationId,
        status: PaymentStatus.PROCESSING,
      },
      data: {
        status: nextStatus,
        trackingCode,
        receiptNumber: nextStatus === PaymentStatus.PAID ? receiptNumber : undefined,
        paidAt: nextStatus === PaymentStatus.PAID ? new Date() : undefined,
        failedAt: nextStatus === PaymentStatus.FAILED ? new Date() : undefined,
        cancelledAt: nextStatus === PaymentStatus.CANCELLED ? new Date() : undefined,
      },
    });

    if (locked.count === 0) return;

    await tx.paymentSession.update({
      where: { id: session.id },
      data: {
        status: nextStatus,
        completedAt: new Date(),
        rawCallbackJson: verified.raw as Prisma.InputJsonValue,
      },
    });

    await logPaymentEvent({
      organizationId: params.organizationId,
      paymentIntentId: intent.id,
      fromStatus: PaymentStatus.PROCESSING,
      toStatus: nextStatus,
      event: `callback.${verified.outcome}`,
      message: "Guidance package payment outcome",
      metadata: { providerRef: verified.providerRef },
      tx,
    });

    if (nextStatus === PaymentStatus.PAID) {
      await tx.guidancePlan.update({
        where: { id: plan.id },
        data: { packagePaidAt: new Date() },
      });
    }
  });

  const fresh = await prisma.paymentIntent.findFirst({
    where: { id: intent.id, organizationId: params.organizationId },
    select: { status: true },
  });
  const finalStatus = fresh?.status ?? nextStatus;

  if (finalStatus === PaymentStatus.PAID) {
    await advanceGuidanceJourneyStep({
      organizationId: params.organizationId,
      actorUserId: plan.userId,
      studentId: plan.studentId,
      stepId: 3,
      metadata: { paymentIntentId: intent.id, receiptNumber },
    });
    await prisma.auditLog.create({
      data: {
        organizationId: params.organizationId,
        actorUserId: plan.userId,
        action: AuditAction.GUIDANCE_PAYMENT_COMPLETED,
        entityType: "GuidancePlan",
        entityId: plan.id,
        metadata: {
          publicId: plan.publicId,
          paymentIntentId: intent.id,
          receiptNumber,
        },
      },
    });
  }

  return {
    ok: true,
    status: finalStatus,
    alreadyFinalized: false,
    planPublicId: plan.publicId,
  };
}

export async function getGuidancePaymentIntentSummary(params: {
  organizationId: string;
  planId: string;
}) {
  return prisma.paymentIntent.findFirst({
    where: {
      organizationId: params.organizationId,
      payableType: "GUIDANCE_PACKAGE",
      payableId: params.planId,
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      finalAmountRials: true,
      trackingCode: true,
      receiptNumber: true,
      paidAt: true,
    },
  });
}

export async function getMockGuidanceCheckoutSession(params: {
  organizationId: string;
  providerSessionId: string;
  callbackToken: string;
}) {
  const session = await prisma.paymentSession.findFirst({
    where: {
      organizationId: params.organizationId,
      provider: "mock",
      providerSessionId: params.providerSessionId,
      callbackToken: params.callbackToken,
    },
    include: { paymentIntent: true },
  });
  if (!session || session.paymentIntent.payableType !== "GUIDANCE_PACKAGE") {
    return null;
  }

  const plan = await prisma.guidancePlan.findFirst({
    where: { id: session.paymentIntent.payableId, organizationId: params.organizationId },
    select: {
      publicId: true,
      guidancePackageCode: true,
      student: { select: { fullName: true } },
    },
  });

  return { session, plan };
}
