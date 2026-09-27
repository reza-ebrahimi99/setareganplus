/**
 * Star Academy dedicated payment flow (ACADEMY_ORDER payable type).
 */

import { randomBytes } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import {
  AcademyOrderStatus,
  PaymentPayableType,
  PaymentStatus,
} from "@/generated/prisma/enums";
import { grantEntitlementsForPaidOrder } from "@/lib/academy/entitlements";
import { getAcademyPublicOrigin } from "@/lib/academy/host";
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

const INTENT_TTL_MS = 60 * 60 * 1000;
export const ACADEMY_CALLBACK_PATH = "/payments/callback/academy";

function newCallbackToken(): string {
  return randomBytes(24).toString("hex");
}

function newReceiptNumber(): string {
  return `RCP-AC-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

function rewriteMockCheckoutUrl(rawUrl: string, fallbackToken: string): string {
  try {
    const url = new URL(rawUrl, "https://internal.local");
    const sessionId = url.pathname.split("/").filter(Boolean).pop() ?? "";
    const token = url.searchParams.get("token") ?? fallbackToken;
    return `/payments/mock/academy-checkout/${encodeURIComponent(sessionId)}?token=${encodeURIComponent(token)}`;
  } catch {
    return rawUrl;
  }
}

export type StartAcademyCheckoutResult =
  | { ok: true; checkoutUrl: string; paymentIntentId: string; orderNumber: string }
  | { ok: false; error: string };

async function finalizeAcademyOrderPaid(params: {
  organizationId: string;
  orderId: string;
  paymentIntentId: string | null;
}) {
  const paidAt = new Date();
  await prisma.$transaction(async (tx) => {
    const order = await tx.academyOrder.findFirst({
      where: {
        id: params.orderId,
        organizationId: params.organizationId,
      },
      select: { id: true, status: true, discountCodeId: true, userId: true },
    });
    if (!order) return;
    if (order.status === AcademyOrderStatus.PAID) return;

    await tx.academyOrder.update({
      where: { id: order.id },
      data: { status: AcademyOrderStatus.PAID, paidAt },
    });

    if (order.discountCodeId) {
      await tx.academyDiscountCode.update({
        where: { id: order.discountCodeId },
        data: { usageCount: { increment: 1 } },
      });
      await tx.academyDiscountRedemption.create({
        data: {
          organizationId: params.organizationId,
          discountCodeId: order.discountCodeId,
          userId: order.userId,
          orderId: order.id,
        },
      });
    }

    await grantEntitlementsForPaidOrder(tx, {
      organizationId: params.organizationId,
      orderId: order.id,
      paidAt,
    });
  });

  if (params.paymentIntentId) {
    await logPaymentEvent({
      organizationId: params.organizationId,
      paymentIntentId: params.paymentIntentId,
      fromStatus: PaymentStatus.PROCESSING,
      toStatus: PaymentStatus.PAID,
      event: "academy.order.paid",
      metadata: { orderId: params.orderId },
    });
  }
}

export async function startAcademyCheckout(params: {
  organizationId: string;
  orderId: string;
  userId: string;
}): Promise<StartAcademyCheckoutResult> {
  const order = await prisma.academyOrder.findFirst({
    where: {
      id: params.orderId,
      organizationId: params.organizationId,
      userId: params.userId,
      status: AcademyOrderStatus.PENDING,
    },
    select: {
      id: true,
      orderNumber: true,
      totalRials: true,
      discountCodeId: true,
    },
  });
  if (!order) return { ok: false, error: "سفارش یافت نشد." };

  if (order.totalRials === 0) {
    await finalizeAcademyOrderPaid({
      organizationId: params.organizationId,
      orderId: order.id,
      paymentIntentId: null,
    });
    return {
      ok: true,
      checkoutUrl: `${getAcademyPublicOrigin()}/payment/success?order=${encodeURIComponent(order.orderNumber)}`,
      paymentIntentId: "",
      orderNumber: order.orderNumber,
    };
  }

  const provider = getPaymentProvider();
  const description = `آکادمی ستارگان — ${order.orderNumber}`;

  let intent = await prisma.paymentIntent.findFirst({
    where: {
      organizationId: params.organizationId,
      payableType: PaymentPayableType.ACADEMY_ORDER,
      payableId: order.id,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!intent) {
    intent = await prisma.paymentIntent.create({
      data: {
        organizationId: params.organizationId,
        payableType: PaymentPayableType.ACADEMY_ORDER,
        payableId: order.id,
        idempotencyKey: `academy:${order.id}:${order.totalRials}`,
        status: PaymentStatus.PENDING,
        provider: provider.id,
        amountRials: order.totalRials,
        finalAmountRials: order.totalRials,
        currency: "IRR",
        description,
        expiresAt: new Date(Date.now() + INTENT_TTL_MS),
        metadata: {
          academyOrderNumber: order.orderNumber,
          academyDiscountCodeId: order.discountCodeId,
        },
      },
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
    return {
      ok: true,
      checkoutUrl: reusableSession.checkoutUrl,
      paymentIntentId: intent.id,
      orderNumber: order.orderNumber,
    };
  }

  const callbackToken = newCallbackToken();
  if (provider.id === "zibal") {
    const previewCallback = buildZibalCallbackUrl({
      callbackPath: ACADEMY_CALLBACK_PATH,
      callbackToken,
    });
    if (
      !previewCallback ||
      !isZibalCallbackForPath(previewCallback, ACADEMY_CALLBACK_PATH)
    ) {
      return {
        ok: false,
        error: "آدرس بازگشت پرداخت آکادمی نامعتبر است.",
      };
    }
  }

  let requested;
  try {
    requested = await provider.requestPayment({
      organizationId: params.organizationId,
      paymentIntentId: intent.id,
      amountRials: intent.finalAmountRials,
      currency: intent.currency,
      description: intent.description ?? description,
      callbackPath: ACADEMY_CALLBACK_PATH,
      callbackToken,
      metadata: { academyOrderNumber: order.orderNumber },
    });
  } catch {
    return { ok: false, error: "در اتصال به درگاه پرداخت مشکلی رخ داد." };
  }

  if (!requested.ok) {
    return { ok: false, error: "در اتصال به درگاه پرداخت مشکلی رخ داد." };
  }

  let checkoutUrl = requested.checkoutUrl?.trim() ?? "";
  if (!checkoutUrl) {
    return { ok: false, error: "لینک درگاه پرداخت دریافت نشد." };
  }

  if (provider.id === "zibal") {
    if (!isAllowedZibalCheckoutUrl(checkoutUrl)) {
      return { ok: false, error: "آدرس درگاه پرداخت نامعتبر است." };
    }
  } else if (provider.id === "mock") {
    checkoutUrl = rewriteMockCheckoutUrl(checkoutUrl, callbackToken);
  }

  await prisma.$transaction(async (tx) => {
    await tx.paymentIntent.update({
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
      paymentIntentId: intent!.id,
      fromStatus,
      toStatus: PaymentStatus.PROCESSING,
      event: "academy.checkout.started",
      tx,
    });

    await tx.paymentSession.create({
      data: {
        organizationId: params.organizationId,
        paymentIntentId: intent!.id,
        provider: provider.id,
        providerSessionId: requested.providerSessionId,
        status: PaymentStatus.PROCESSING,
        checkoutUrl,
        callbackToken,
        rawRequestJson: requested.raw as Prisma.InputJsonValue,
        expiresAt: new Date(Date.now() + INTENT_TTL_MS),
      },
    });
  });

  return {
    ok: true,
    checkoutUrl,
    paymentIntentId: intent.id,
    orderNumber: order.orderNumber,
  };
}

export type VerifyAcademyPaymentResult =
  | {
      ok: true;
      alreadyFinalized: boolean;
      orderNumber: string;
      redirectPath: string;
    }
  | { ok: false; error: string; redirectPath: string };

export async function verifyAcademyPaymentCallback(params: {
  organizationId: string;
  provider: string;
  callbackToken: string;
  callbackPayload: Record<string, unknown>;
}): Promise<VerifyAcademyPaymentResult> {
  const failPath = "/payment/failed";

  const session = await prisma.paymentSession.findFirst({
    where: {
      organizationId: params.organizationId,
      callbackToken: params.callbackToken,
      provider: params.provider,
    },
    include: { paymentIntent: true },
  });

  if (!session) {
    return { ok: false, error: "نشست پرداخت یافت نشد.", redirectPath: failPath };
  }

  const intent = session.paymentIntent;
  if (intent.payableType !== PaymentPayableType.ACADEMY_ORDER) {
    return {
      ok: false,
      error: "این پرداخت متعلق به آکادمی نیست.",
      redirectPath: failPath,
    };
  }

  const order = await prisma.academyOrder.findFirst({
    where: { id: intent.payableId, organizationId: params.organizationId },
    select: { id: true, orderNumber: true, status: true },
  });
  if (!order) {
    return { ok: false, error: "سفارش یافت نشد.", redirectPath: failPath };
  }

  const successPath = `/payment/success?order=${encodeURIComponent(order.orderNumber)}`;

  if (order.status === AcademyOrderStatus.PAID || intent.status === PaymentStatus.PAID) {
    return {
      ok: true,
      alreadyFinalized: true,
      orderNumber: order.orderNumber,
      redirectPath: successPath,
    };
  }

  if (isTerminalPaymentStatus(intent.status)) {
    return {
      ok: false,
      error: "پرداخت ناموفق بود.",
      redirectPath: failPath,
    };
  }

  const provider = getPaymentProvider();
  if (provider.id !== params.provider) {
    return {
      ok: false,
      error: "درگاه پرداخت با نشست هم‌خوانی ندارد.",
      redirectPath: failPath,
    };
  }

  const verified = await provider.verifyPayment({
    organizationId: params.organizationId,
    providerSessionId: session.providerSessionId,
    callbackToken: params.callbackToken,
    callbackPayload: params.callbackPayload,
  });

  if (!verified.ok) {
    return { ok: false, error: verified.error, redirectPath: failPath };
  }

  if (verified.outcome === "paid") {
    const amountCheck = checkVerifiedAmountAgainstIntent({
      providerId: provider.id,
      verifiedAmountRials: verified.amountRials,
      expectedFinalAmountRials: intent.finalAmountRials,
    });
    if (!amountCheck.ok) {
      return { ok: false, error: amountCheck.error, redirectPath: failPath };
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

  await prisma.$transaction(async (tx) => {
    await tx.paymentIntent.updateMany({
      where: {
        id: intent.id,
        organizationId: params.organizationId,
        status: PaymentStatus.PROCESSING,
      },
      data: {
        status: nextStatus,
        trackingCode: verified.trackingCode ?? intent.trackingCode,
        receiptNumber,
        paidAt: nextStatus === PaymentStatus.PAID ? new Date() : null,
        failedAt: nextStatus === PaymentStatus.FAILED ? new Date() : null,
        cancelledAt: nextStatus === PaymentStatus.CANCELLED ? new Date() : null,
      },
    });

    await tx.paymentSession.update({
      where: { id: session.id },
      data: {
        status: nextStatus,
        completedAt: new Date(),
        rawCallbackJson: verified.raw as Prisma.InputJsonValue,
      },
    });

    if (nextStatus !== PaymentStatus.PAID) {
      await tx.academyOrder.update({
        where: { id: order.id },
        data: {
          status:
            nextStatus === PaymentStatus.CANCELLED
              ? AcademyOrderStatus.CANCELLED
              : AcademyOrderStatus.FAILED,
        },
      });
    }
  });

  if (nextStatus !== PaymentStatus.PAID) {
    return {
      ok: false,
      error: "پرداخت تکمیل نشد.",
      redirectPath: failPath,
    };
  }

  await finalizeAcademyOrderPaid({
    organizationId: params.organizationId,
    orderId: order.id,
    paymentIntentId: intent.id,
  });

  return {
    ok: true,
    alreadyFinalized: false,
    orderNumber: order.orderNumber,
    redirectPath: successPath,
  };
}
