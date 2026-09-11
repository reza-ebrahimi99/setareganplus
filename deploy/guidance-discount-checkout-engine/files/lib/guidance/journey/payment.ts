/**
 * Guidance Journey Engine — dedicated payment flow.
 *
 * WHY A SEPARATE FLOW (not lib/payment/service.ts):
 * startCheckoutForRegistration/startCheckoutForCommerceOrder and
 * verifyPaymentCallback() are large, production-critical, and hard-coded to
 * the Registration/Commerce domains. This module reuses PaymentIntent /
 * PaymentSession, the PaymentProvider abstraction, and Zibal safety guards,
 * but owns start/verify and /payments/callback/guidance.
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
  buildZibalCallbackUrl,
  isZibalCallbackForPath,
} from "@/lib/payment/providers/zibal";
import {
  assertPaymentTransition,
  isRetryablePaymentStatus,
  isTerminalPaymentStatus,
} from "@/lib/payment/status-machine";
import { prisma } from "@/lib/prisma";
import { advanceGuidanceJourneyStep } from "@/lib/guidance/journey/advance";
import { advanceGuidanceJourneyV2Step } from "@/lib/guidance/journey-v2/advance";
import { guidanceJourneyV2StepPath } from "@/lib/guidance/journey-v2/catalog";
import { parseV2CompletedSteps } from "@/lib/guidance/journey-v2/plan";
import {
  consumeGuidanceDiscountUse,
  releaseGuidanceDiscountUse,
} from "@/lib/guidance/discounts/quote";
import { resolveGuidanceCheckoutDiscount } from "@/lib/guidance/discounts/student";
import {
  assertGuidanceGatewayHandoff,
  buildGuidanceCheckoutIdempotencyKey,
  buildGuidancePaymentSnapshot,
} from "@/lib/guidance/checkout/financials";
import { resolveGuidancePayablePackage } from "@/lib/guidance/packages/resolve-payable";

const INTENT_TTL_MS = 60 * 60 * 1000;
const GUIDANCE_CALLBACK_PATH = "/payments/callback/guidance";

function newCallbackToken(): string {
  return randomBytes(24).toString("hex");
}

function newReceiptNumber(): string {
  return `RCP-GD-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

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

function logGuidanceCheckout(
  stage: string,
  extra: Record<string, string | number | boolean | null | undefined>,
) {
  console.info("[guidance.checkout]", { stage, ...extra });
}

function asMetadataRecord(value: Prisma.JsonValue | null): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return { ...value };
  }
  return {};
}

function readDiscountMeta(metadata: Prisma.JsonValue | null): {
  discountId: string | null;
  discountCode: string | null;
  reserved: boolean;
} {
  const meta = asMetadataRecord(metadata);
  const discountId =
    typeof meta.guidanceDiscountId === "string" && meta.guidanceDiscountId
      ? meta.guidanceDiscountId
      : null;
  const discountCode =
    typeof meta.guidanceDiscountCode === "string" && meta.guidanceDiscountCode
      ? meta.guidanceDiscountCode
      : null;
  const reserved =
    meta.guidanceDiscountReserved === false
      ? false
      : Boolean(discountId);
  return { discountId, discountCode, reserved };
}

export type StartGuidanceCheckoutResult =
  | { ok: true; checkoutUrl: string; paymentIntentId: string; path: "gateway" | "zero-pay" }
  | { ok: false; error: string };

function postPaymentPath(params: {
  journeyVersion: number;
  outcome: "success" | "failed" | "cancelled";
}): string {
  if (params.journeyVersion === 2) {
    return `${guidanceJourneyV2StepPath(params.outcome === "success" ? 11 : 10)}?payment=${params.outcome}`;
  }
  return "/portal/student/services/guidance/steps/3";
}

async function continueJourneyAfterPackagePayment(params: {
  organizationId: string;
  actorUserId: string;
  studentId: string;
  planId: string;
  planPublicId: string;
  journeyVersion: number;
  currentStep: number;
  completedSteps: unknown;
  paymentIntentId: string;
  receiptNumber: string | null;
}) {
  if (params.journeyVersion === 2) {
    const completed = parseV2CompletedSteps(params.completedSteps);
    if (params.currentStep === 10 && !completed.includes(10)) {
      await advanceGuidanceJourneyV2Step({
        organizationId: params.organizationId,
        actorUserId: params.actorUserId,
        studentId: params.studentId,
        stepId: 10,
        metadata: {
          paymentIntentId: params.paymentIntentId,
          receiptNumber: params.receiptNumber,
        },
      });
    }
  } else {
    await advanceGuidanceJourneyStep({
      organizationId: params.organizationId,
      actorUserId: params.actorUserId,
      studentId: params.studentId,
      stepId: 3,
      metadata: {
        paymentIntentId: params.paymentIntentId,
        receiptNumber: params.receiptNumber,
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      organizationId: params.organizationId,
      actorUserId: params.actorUserId,
      action: AuditAction.GUIDANCE_PAYMENT_COMPLETED,
      entityType: "GuidancePlan",
      entityId: params.planId,
      metadata: {
        publicId: params.planPublicId,
        paymentIntentId: params.paymentIntentId,
        receiptNumber: params.receiptNumber,
      },
    },
  });
}

export async function startGuidancePackageCheckout(params: {
  organizationId: string;
  planId: string;
  planPublicId: string;
  packageCode: string;
  discountCode?: string | null;
}): Promise<StartGuidanceCheckoutResult> {
  const plan = await prisma.guidancePlan.findFirst({
    where: { id: params.planId, organizationId: params.organizationId, deletedAt: null },
    select: {
      id: true,
      publicId: true,
      packagePaidAt: true,
      journeyVersion: true,
      currentStep: true,
      completedSteps: true,
      studentId: true,
      userId: true,
    },
  });
  if (!plan) {
    return { ok: false, error: "پرونده انتخاب رشته یافت نشد." };
  }
  if (plan.packagePaidAt) {
    return { ok: false, error: "بسته مشاوره قبلاً پرداخت شده است." };
  }

  const pkg = resolveGuidancePayablePackage(params.packageCode, {
    journeyVersion: plan.journeyVersion,
  });
  if (!pkg || !pkg.requiresPayment) {
    logGuidanceCheckout("package_invalid", { packageCode: params.packageCode });
    return { ok: false, error: "بسته انتخاب‌شده معتبر نیست." };
  }

  const quoted = await resolveGuidanceCheckoutDiscount({
    organizationId: params.organizationId,
    packageCode: pkg.code,
    packagePriceRials: pkg.priceRials,
    discountCode: params.discountCode,
  });
  if (!quoted.ok) {
    logGuidanceCheckout("discount_rejected", {
      packageCode: pkg.code,
      discountCode: params.discountCode ?? null,
    });
    return { ok: false, error: quoted.error };
  }

  const quotedDiscountId = quoted.discountId;
  const quotedDiscountCode = quoted.discountCode;
  const quotedDiscountRials = quoted.discountRials;
  const quotedOriginalRials = quoted.originalAmountRials;
  const quotedFinalRials = quoted.finalAmountRials;

  if (quotedOriginalRials !== pkg.priceRials) {
    logGuidanceCheckout("price_mismatch", {
      packageCode: pkg.code,
      catalogRials: pkg.priceRials,
      quotedRials: quotedOriginalRials,
    });
    return { ok: false, error: "محاسبه مالی بسته هم‌خوان نیست." };
  }

  const built = buildGuidancePaymentSnapshot({
    packageCode: pkg.code,
    originalAmountRials: pkg.priceRials,
    discountAmountRials: quotedDiscountRials,
    finalAmountRials: quotedFinalRials,
  });
  if (!built.ok) {
    logGuidanceCheckout("invariant_failed", { packageCode: pkg.code });
    return { ok: false, error: built.error };
  }
  const snapshot = built.snapshot;

  const provider = getPaymentProvider();
  const idempotencyKey = buildGuidanceCheckoutIdempotencyKey({
    planId: plan.id,
    packageCode: pkg.code,
    originalAmountRials: snapshot.originalAmountRials,
    discountAmountRials: snapshot.discountAmountRials,
    finalAmountRials: snapshot.finalAmountRials,
    discountCode: quotedDiscountCode,
  });
  const description = `ثبت‌نام بسته «${pkg.title}» — سامانه انتخاب رشته`;

  const financialMetadata: Record<string, unknown> = {
    packageCode: pkg.code,
    originalAmountRials: snapshot.originalAmountRials,
    discountAmountRials: snapshot.discountAmountRials,
    finalAmountRials: snapshot.finalAmountRials,
    calculation: "guidance-discount-engine-v1",
    ...(quotedDiscountCode
      ? {
          guidanceDiscountCode: quotedDiscountCode,
          guidanceDiscountId: quotedDiscountId,
        }
      : {}),
  };

  logGuidanceCheckout("quoted", {
    packageCode: pkg.code,
    discountCode: quotedDiscountCode,
    originalAmountRials: snapshot.originalAmountRials,
    discountAmountRials: snapshot.discountAmountRials,
    finalAmountRials: snapshot.finalAmountRials,
    path: snapshot.path,
  });

  let intent = await prisma.paymentIntent.findFirst({
    where: { organizationId: params.organizationId, idempotencyKey },
  });

  if (intent && intent.status === PaymentStatus.PAID) {
    return { ok: false, error: "بسته مشاوره قبلاً پرداخت شده است." };
  }

  if (
    intent &&
    (intent.amountRials !== snapshot.originalAmountRials ||
      intent.discountRials !== snapshot.discountAmountRials ||
      intent.finalAmountRials !== snapshot.finalAmountRials)
  ) {
    logGuidanceCheckout("intent_amount_mismatch", {
      paymentIntentId: intent.id,
      packageCode: pkg.code,
    });
    return { ok: false, error: "مبلغ پرداخت ذخیره‌شده با محاسبه فعلی هم‌خوان نیست." };
  }

  let consumedNow = false;

  if (!intent) {
    try {
      intent = await prisma.$transaction(async (tx) => {
        if (quotedDiscountId) {
          const consumed = await consumeGuidanceDiscountUse({
            organizationId: params.organizationId,
            discountId: quotedDiscountId,
            tx,
          });
          if (!consumed) {
            throw new Error("DISCOUNT_CAPACITY");
          }
        }
        return tx.paymentIntent.create({
          data: {
            organizationId: params.organizationId,
            payableType: "GUIDANCE_PACKAGE",
            payableId: plan.id,
            idempotencyKey,
            status: PaymentStatus.PENDING,
            provider: snapshot.path === "zero-pay" ? "internal-zero" : provider.id,
            amountRials: snapshot.originalAmountRials,
            discountRials: snapshot.discountAmountRials,
            finalAmountRials: snapshot.finalAmountRials,
            metadata: {
              ...financialMetadata,
              guidanceDiscountReserved: Boolean(quotedDiscountId),
            },
            currency: "IRR",
            description,
            expiresAt: new Date(Date.now() + INTENT_TTL_MS),
          },
        });
      });
      consumedNow = Boolean(quotedDiscountId);
      await logPaymentEvent({
        organizationId: params.organizationId,
        paymentIntentId: intent.id,
        fromStatus: null,
        toStatus: PaymentStatus.PENDING,
        event: "intent.created",
        message: "Guidance package payment intent created",
      });
    } catch (error) {
      if (error instanceof Error && error.message === "DISCOUNT_CAPACITY") {
        return { ok: false, error: "ظرفیت استفاده از این کد تکمیل شده است." };
      }
      const raced = await prisma.paymentIntent.findFirst({
        where: { organizationId: params.organizationId, idempotencyKey },
      });
      if (raced) {
        intent = raced;
      } else {
        logGuidanceCheckout("intent_create_failed", {
          packageCode: pkg.code,
          discountCode: quotedDiscountCode,
        });
        return {
          ok: false,
          error: "در اتصال به درگاه پرداخت مشکلی رخ داد. دوباره تلاش کنید.",
        };
      }
    }
  }

  if (!intent) {
    return { ok: false, error: "در اتصال به درگاه پرداخت مشکلی رخ داد. دوباره تلاش کنید." };
  }

  if (!consumedNow) {
    const meta = readDiscountMeta(intent.metadata);
    if (meta.discountId && !meta.reserved) {
      const consumed = await consumeGuidanceDiscountUse({
        organizationId: params.organizationId,
        discountId: meta.discountId,
      });
      if (!consumed) {
        return { ok: false, error: "ظرفیت استفاده از این کد تکمیل شده است." };
      }
      consumedNow = true;
      await prisma.paymentIntent.update({
        where: { id: intent.id },
        data: {
          metadata: {
            ...asMetadataRecord(intent.metadata),
            guidanceDiscountReserved: true,
          },
        },
      });
    }
  }

  async function releaseIfNeeded() {
    const discountId = quotedDiscountId ?? readDiscountMeta(intent!.metadata).discountId;
    if (!consumedNow || !discountId) return;
    await releaseGuidanceDiscountUse({
      organizationId: params.organizationId,
      discountId,
    });
    await prisma.paymentIntent.update({
      where: { id: intent!.id },
      data: {
        metadata: {
          ...asMetadataRecord(intent!.metadata),
          guidanceDiscountReserved: false,
        },
      },
    });
  }

  if (snapshot.path === "zero-pay") {
    return finalizeZeroPayableGuidanceCheckout({
      organizationId: params.organizationId,
      plan,
      pkgCode: pkg.code,
      intent: intent!,
      description,
      snapshotFinal: snapshot.finalAmountRials,
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

  const handoff = assertGuidanceGatewayHandoff({
    intentFinalAmountRials: intent.finalAmountRials,
    gatewayAmountRials: snapshot.finalAmountRials,
  });
  if (!handoff.ok) {
    await releaseIfNeeded();
    return { ok: false, error: handoff.error };
  }

  const reusableSession = await prisma.paymentSession.findFirst({
    where: {
      organizationId: params.organizationId,
      paymentIntentId: intent.id,
      status: PaymentStatus.PROCESSING,
      checkoutUrl: { not: null },
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { createdAt: "desc" },
    select: { checkoutUrl: true },
  });
  if (reusableSession?.checkoutUrl) {
    logGuidanceCheckout("gateway_session_reused", {
      paymentIntentId: intent.id,
      packageCode: pkg.code,
      gatewayAmountRials: intent.finalAmountRials,
    });
    return {
      ok: true,
      checkoutUrl: reusableSession.checkoutUrl,
      paymentIntentId: intent.id,
      path: "gateway",
    };
  }

  const callbackToken = newCallbackToken();
  if (provider.id === "zibal") {
    const previewCallback = buildZibalCallbackUrl({
      callbackPath: GUIDANCE_CALLBACK_PATH,
      callbackToken,
    });
    if (
      !previewCallback ||
      !isZibalCallbackForPath(previewCallback, GUIDANCE_CALLBACK_PATH)
    ) {
      await releaseIfNeeded();
      return {
        ok: false,
        error: "آدرس بازگشت پرداخت انتخاب رشته نامعتبر است. پرداخت شروع نشد.",
      };
    }
  }

  const gatewayAmountRials = intent.finalAmountRials;
  logGuidanceCheckout("gateway_request", {
    paymentIntentId: intent.id,
    packageCode: pkg.code,
    discountCode: quotedDiscountCode,
    gatewayAmountRials,
  });

  let requested;
  try {
    requested = await provider.requestPayment({
      organizationId: params.organizationId,
      paymentIntentId: intent.id,
      amountRials: gatewayAmountRials,
      currency: intent.currency,
      description: intent.description ?? description,
      callbackPath: GUIDANCE_CALLBACK_PATH,
      callbackToken,
      metadata: { guidancePlanPublicId: plan.publicId, packageCode: pkg.code },
    });
  } catch {
    logGuidanceCheckout("gateway_threw", {
      paymentIntentId: intent.id,
      packageCode: pkg.code,
    });
    await releaseIfNeeded();
    return {
      ok: false,
      error: "در اتصال به درگاه پرداخت مشکلی رخ داد. دوباره تلاش کنید.",
    };
  }

  if (!requested.ok) {
    logGuidanceCheckout("gateway_rejected", {
      paymentIntentId: intent.id,
      packageCode: pkg.code,
    });
    await releaseIfNeeded();
    return {
      ok: false,
      error: "در اتصال به درگاه پرداخت مشکلی رخ داد. دوباره تلاش کنید.",
    };
  }

  let checkoutUrl = requested.checkoutUrl?.trim() ?? "";
  if (!checkoutUrl) {
    await releaseIfNeeded();
    return {
      ok: false,
      error: "لینک درگاه پرداخت دریافت نشد. لطفاً دوباره تلاش کنید.",
    };
  }

  if (provider.id === "zibal") {
    if (!isAllowedZibalCheckoutUrl(checkoutUrl)) {
      await releaseIfNeeded();
      return { ok: false, error: "آدرس درگاه پرداخت نامعتبر است." };
    }
    const usedPath =
      typeof requested.raw.callbackPath === "string"
        ? requested.raw.callbackPath
        : "";
    if (usedPath !== GUIDANCE_CALLBACK_PATH) {
      await releaseIfNeeded();
      return {
        ok: false,
        error: "آدرس بازگشت پرداخت انتخاب رشته نامعتبر است. پرداخت شروع نشد.",
      };
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

  logGuidanceCheckout("gateway_ready", {
    paymentIntentId: intent.id,
    packageCode: pkg.code,
    gatewayAmountRials,
  });

  return {
    ok: true,
    checkoutUrl,
    paymentIntentId: intent.id,
    path: "gateway",
  };
}

async function finalizeZeroPayableGuidanceCheckout(params: {
  organizationId: string;
  plan: {
    id: string;
    publicId: string;
    journeyVersion: number;
    currentStep: number;
    completedSteps: unknown;
    studentId: string;
    userId: string;
  };
  pkgCode: string;
  intent: {
    id: string;
    status: PaymentStatus;
    finalAmountRials: number;
    trackingCode: string | null;
  };
  description: string;
  snapshotFinal: number;
}): Promise<StartGuidanceCheckoutResult> {
  if (params.snapshotFinal !== 0 || params.intent.finalAmountRials !== 0) {
    return { ok: false, error: "مبلغ نهایی پرداخت نامعتبر است." };
  }

  if (params.intent.status === PaymentStatus.PAID) {
    return {
      ok: true,
      checkoutUrl: postPaymentPath({
        journeyVersion: params.plan.journeyVersion,
        outcome: "success",
      }),
      paymentIntentId: params.intent.id,
      path: "zero-pay",
    };
  }

  const receiptNumber = newReceiptNumber();
  const fromStatus = params.intent.status;
  if (fromStatus !== PaymentStatus.PROCESSING) {
    assertPaymentTransition(fromStatus, PaymentStatus.PROCESSING);
  }
  assertPaymentTransition(PaymentStatus.PROCESSING, PaymentStatus.PAID);

  await prisma.$transaction(async (tx) => {
    await tx.paymentIntent.update({
      where: { id: params.intent.id },
      data: {
        status: PaymentStatus.PROCESSING,
        provider: "internal-zero",
        failedAt: null,
        cancelledAt: null,
      },
    });
    await tx.paymentIntent.update({
      where: { id: params.intent.id },
      data: {
        status: PaymentStatus.PAID,
        paidAt: new Date(),
        receiptNumber,
        trackingCode: params.intent.trackingCode ?? `ZERO-${params.intent.id.slice(-8)}`,
        description: params.description,
      },
    });
    await tx.guidancePlan.update({
      where: { id: params.plan.id },
      data: {
        guidancePackageCode: params.pkgCode,
        packagePaidAt: new Date(),
      },
    });
    await logPaymentEvent({
      organizationId: params.organizationId,
      paymentIntentId: params.intent.id,
      fromStatus,
      toStatus: PaymentStatus.PAID,
      event: "zero_pay.completed",
      message: "Guidance zero-payable checkout completed without gateway",
      tx,
    });
  });

  await continueJourneyAfterPackagePayment({
    organizationId: params.organizationId,
    actorUserId: params.plan.userId,
    studentId: params.plan.studentId,
    planId: params.plan.id,
    planPublicId: params.plan.publicId,
    journeyVersion: params.plan.journeyVersion,
    currentStep: params.plan.currentStep,
    completedSteps: params.plan.completedSteps,
    paymentIntentId: params.intent.id,
    receiptNumber,
  });

  logGuidanceCheckout("zero_pay_completed", {
    paymentIntentId: params.intent.id,
    packageCode: params.pkgCode,
    finalAmountRials: 0,
  });

  return {
    ok: true,
    checkoutUrl: postPaymentPath({
      journeyVersion: params.plan.journeyVersion,
      outcome: "success",
    }),
    paymentIntentId: params.intent.id,
    path: "zero-pay",
  };
}

export type VerifyGuidancePaymentResult =
  | {
      ok: true;
      status: PaymentStatus;
      alreadyFinalized: boolean;
      planPublicId: string;
      continuePath: string;
    }
  | { ok: false; error: string; continuePath: string };

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

  const v1Fail = "/portal/student/services/guidance/steps/3";

  if (!session) {
    return { ok: false, error: "نشست پرداخت یافت نشد.", continuePath: v1Fail };
  }

  const intent = session.paymentIntent;
  if (intent.payableType !== "GUIDANCE_PACKAGE") {
    return {
      ok: false,
      error: "این پرداخت متعلق به سامانه انتخاب رشته نیست.",
      continuePath: v1Fail,
    };
  }

  const plan = await prisma.guidancePlan.findFirst({
    where: { id: intent.payableId, organizationId: params.organizationId, deletedAt: null },
    select: {
      id: true,
      publicId: true,
      studentId: true,
      userId: true,
      journeyVersion: true,
      currentStep: true,
      completedSteps: true,
    },
  });
  if (!plan) {
    return { ok: false, error: "پرونده مرتبط با این پرداخت یافت نشد.", continuePath: v1Fail };
  }

  const continueFor = (outcome: "success" | "failed" | "cancelled") =>
    postPaymentPath({ journeyVersion: plan.journeyVersion, outcome });

  if (isTerminalPaymentStatus(intent.status) || intent.status === PaymentStatus.PAID) {
    return {
      ok: true,
      status: intent.status,
      alreadyFinalized: true,
      planPublicId: plan.publicId,
      continuePath: continueFor(intent.status === PaymentStatus.PAID ? "success" : "failed"),
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
      continuePath: continueFor(
        intent.status === PaymentStatus.CANCELLED ? "cancelled" : "failed",
      ),
    };
  }

  const provider = getPaymentProvider();
  if (provider.id !== params.provider) {
    return {
      ok: false,
      error: "درگاه پرداخت با نشست هم‌خوانی ندارد.",
      continuePath: continueFor("failed"),
    };
  }

  const verified = await provider.verifyPayment({
    organizationId: params.organizationId,
    providerSessionId: session.providerSessionId,
    callbackToken: params.callbackToken,
    callbackPayload: params.callbackPayload,
  });

  if (!verified.ok) {
    return { ok: false, error: verified.error, continuePath: continueFor("failed") };
  }

  if (verified.outcome === "paid") {
    const amountCheck = checkVerifiedAmountAgainstIntent({
      providerId: provider.id,
      verifiedAmountRials: verified.amountRials,
      expectedFinalAmountRials: intent.finalAmountRials,
    });
    if (!amountCheck.ok) {
      return { ok: false, error: amountCheck.error, continuePath: continueFor("failed") };
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

  if (nextStatus === PaymentStatus.FAILED || nextStatus === PaymentStatus.CANCELLED) {
    const meta = readDiscountMeta(intent.metadata);
    if (meta.discountId && meta.reserved) {
      await releaseGuidanceDiscountUse({
        organizationId: params.organizationId,
        discountId: meta.discountId,
      });
      await prisma.paymentIntent.update({
        where: { id: intent.id },
        data: {
          metadata: {
            ...asMetadataRecord(intent.metadata),
            guidanceDiscountReserved: false,
          },
        },
      });
    }
  }

  const fresh = await prisma.paymentIntent.findFirst({
    where: { id: intent.id, organizationId: params.organizationId },
    select: { status: true },
  });
  const finalStatus = fresh?.status ?? nextStatus;

  if (finalStatus === PaymentStatus.PAID) {
    await continueJourneyAfterPackagePayment({
      organizationId: params.organizationId,
      actorUserId: plan.userId,
      studentId: plan.studentId,
      planId: plan.id,
      planPublicId: plan.publicId,
      journeyVersion: plan.journeyVersion,
      currentStep: plan.currentStep,
      completedSteps: plan.completedSteps,
      paymentIntentId: intent.id,
      receiptNumber,
    });
  }

  const outcome =
    finalStatus === PaymentStatus.PAID
      ? "success"
      : finalStatus === PaymentStatus.CANCELLED
        ? "cancelled"
        : "failed";

  return {
    ok: true,
    status: finalStatus,
    alreadyFinalized: false,
    planPublicId: plan.publicId,
    continuePath: continueFor(outcome),
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
      amountRials: true,
      discountRials: true,
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
