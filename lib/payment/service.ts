/**
 * Payment domain service — intents, sessions, verify (idempotent).
 * Provider-agnostic; only talks to PaymentProvider interface.
 */

import { randomBytes } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import {
  CommerceFulfillmentStatus,
  CommerceOpsStage,
  CommerceOrderPaymentStatus,
  CommerceOrderStatus,
  CrmActivityType,

  PaymentPayableType,

  DomainEventType,
  PaymentStatus,
  RegistrationActivityType,
  RegistrationPaymentStatus,
  RegistrationStatus,
} from "@/generated/prisma/enums";

import { enqueueCommerceOrderPaidSms } from "@/lib/commerce/commerce-sms";
import { decrementCommerceItemStock } from "@/lib/commerce/inventory";
import { recordCommerceOrderEvent, stageChangedEventInput } from "@/lib/commerce/orders/timeline";

import { enqueueDomainEvent } from "@/lib/automation/enqueue";

import { recordCrmActivity } from "@/lib/crm/activity";
import {
  createAttributionSnapshotForRevenueEvent,
  paymentIntentRevenueKey,
} from "@/lib/crm/attribution-snapshot";
import { getPaymentProvider } from "@/lib/payment/get-provider";
import { logPaymentEvent } from "@/lib/payment/logger";
import {
  buildSafePaymentRedirectPath,
  checkVerifiedAmountAgainstIntent,
  isAllowedZibalCheckoutUrl,
} from "@/lib/payment/payment-guards";
import {
  commerceOrderPayableTarget,
  registrationPayableTarget,
} from "@/lib/payment/payable";
import {
  assertPaymentTransition,
  isRetryablePaymentStatus,
  isTerminalPaymentStatus,
} from "@/lib/payment/status-machine";
import { prisma } from "@/lib/prisma";
import { recordRegistrationActivity } from "@/lib/registration/activity";

const INTENT_TTL_MS = 60 * 60 * 1000;

function buildIdempotencyKey(
  registrationId: string,
  finalAmountRials: number,
): string {
  return `${registrationId}:${finalAmountRials}`;
}

function newCallbackToken(): string {
  return randomBytes(24).toString("hex");
}

function newReceiptNumber(): string {
  return `RCP-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export type StartCheckoutResult =
  | {
      ok: true;
      paymentIntentId: string;
      paymentSessionId: string;
      checkoutUrl: string;
      trackingCode: string | null;
      provider: string;
    }
  | { ok: false; error: string };

export type VerifyCallbackResult =
  | {
      ok: true;
      alreadyFinalized: boolean;
      paymentIntentId: string;
      status: PaymentStatus;
      /** Registration number when payable is REGISTRATION; otherwise null. */
      registrationNumber: string | null;
      redirectPath: string;
    }
  | { ok: false; error: string };

async function recordPaymentCrm(params: {
  organizationId: string;
  leadId: string | null | undefined;
  activityType:
    | typeof CrmActivityType.PAYMENT_STARTED
    | typeof CrmActivityType.PAYMENT_SUCCEEDED
    | typeof CrmActivityType.PAYMENT_FAILED
    | typeof CrmActivityType.PAYMENT_CANCELLED;
  title: string;
  summary: string;
  metadata: Record<string, unknown>;
  tx?: Prisma.TransactionClient;
}): Promise<void> {
  if (!params.leadId) return;
  await recordCrmActivity({
    organizationId: params.organizationId,
    leadId: params.leadId,
    activityType: params.activityType,
    title: params.title,
    summary: params.summary,
    metadata: params.metadata,
    tx: params.tx,
  });
}

/**
 * Create or reuse unpaid PaymentIntent and open a provider checkout session.
 */
export async function startCheckoutForRegistration(params: {
  organizationId: string;
  registrationId: string;
}): Promise<StartCheckoutResult> {
  const registration = await prisma.registration.findFirst({
    where: {
      id: params.registrationId,
      organizationId: params.organizationId,
      deletedAt: null,
    },
    select: {
      id: true,
      leadId: true,
      registrationNumber: true,
      status: true,
      amountRials: true,
      discountRials: true,
      finalAmountRials: true,
      currency: true,
      productTitle: true,
      parentMobileNormalized: true,
    },
  });

  if (!registration) {
    return { ok: false, error: "ثبت‌نام یافت نشد." };
  }

  if (
    registration.status === RegistrationStatus.APPROVED ||
    registration.status === RegistrationStatus.UNDER_REVIEW
  ) {
    return { ok: false, error: "این ثبت‌نام قبلاً پرداخت شده است." };
  }

  if (registration.status === RegistrationStatus.CANCELLED) {
    return { ok: false, error: "این ثبت‌نام لغو شده است." };
  }

  const provider = getPaymentProvider();
  const idempotencyKey = buildIdempotencyKey(
    registration.id,
    registration.finalAmountRials,
  );
  const description = `ثبت‌نام ${registration.productTitle} — ${registration.registrationNumber}`;

  let intent = await prisma.paymentIntent.findFirst({
    where: {
      organizationId: params.organizationId,
      idempotencyKey,
    },
  });

  if (intent && intent.status === PaymentStatus.PAID) {
    return { ok: false, error: "پرداخت این ثبت‌نام قبلاً انجام شده است." };
  }

  if (!intent) {
    const payable = registrationPayableTarget(registration.id);
    intent = await prisma.paymentIntent.create({
      data: {
        organizationId: params.organizationId,
        registrationId: payable.registrationId,
        payableType: payable.payableType,
        payableId: payable.payableId,
        idempotencyKey,
        status: PaymentStatus.PENDING,
        provider: provider.id,
        amountRials: registration.amountRials,
        discountRials: registration.discountRials,
        finalAmountRials: registration.finalAmountRials,
        currency: registration.currency,
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
      message: "Payment intent created",
    });
  }

  if (
    intent.status !== PaymentStatus.PENDING &&
    !isRetryablePaymentStatus(intent.status) &&
    intent.status !== PaymentStatus.PROCESSING
  ) {
    return {
      ok: false,
      error: "امکان شروع پرداخت برای این وضعیت وجود ندارد.",
    };
  }

  const fromStatus = intent.status;
  if (fromStatus !== PaymentStatus.PROCESSING) {
    assertPaymentTransition(fromStatus, PaymentStatus.PROCESSING);
  }

  const callbackToken = newCallbackToken();
  const callbackPath = `/payments/callback/${provider.id}`;

  const requested = await provider.requestPayment({
    organizationId: params.organizationId,
    paymentIntentId: intent.id,
    amountRials: intent.finalAmountRials,
    currency: intent.currency,
    description: intent.description ?? description,
    callbackPath,
    callbackToken,
    metadata: {
      registrationId: registration.id,
      registrationNumber: registration.registrationNumber,
      ...(registration.parentMobileNormalized
        ? { mobile: registration.parentMobileNormalized }
        : {}),
    },
  });

  if (!requested.ok) {
    return { ok: false, error: requested.error };
  }

  const checkoutUrl = requested.checkoutUrl?.trim() ?? "";
  if (!checkoutUrl) {
    console.error("[payment] provider returned empty checkoutUrl", {
      provider: provider.id,
      paymentIntentId: intent.id,
      registrationId: registration.id,
    });
    return {
      ok: false,
      error:
        "لینک درگاه پرداخت دریافت نشد. لطفاً دوباره تلاش کنید یا با پشتیبانی تماس بگیرید.",
    };
  }

  if (provider.id === "zibal" && !isAllowedZibalCheckoutUrl(checkoutUrl)) {
    console.error("[payment] rejected non-Zibal checkout URL", {
      paymentIntentId: intent.id,
      registrationId: registration.id,
    });
    return {
      ok: false,
      error: "آدرس درگاه پرداخت نامعتبر است.",
    };
  }

  const session = await prisma.$transaction(async (tx) => {
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
      message: "Checkout session opened",
      metadata: { providerSessionId: requested.providerSessionId },
      tx,
    });

    const createdSession = await tx.paymentSession.create({
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

    await tx.registration.update({
      where: { id: registration.id },
      data: {
        paymentProvider: provider.id,
        trackingCode: requested.trackingCode,
        paymentRef: requested.providerSessionId,
        status: RegistrationStatus.WAITING_PAYMENT,
        paymentStatus: RegistrationPaymentStatus.AWAITING,
      },
    });

    return createdSession;
  });

  await recordRegistrationActivity({
    organizationId: params.organizationId,
    registrationId: registration.id,
    activityType: RegistrationActivityType.PAYMENT_STARTED,
    title: "شروع پرداخت",
    summary: `${registration.registrationNumber} · ${intent.finalAmountRials} ریال`,
    metadata: {
      paymentIntentId: intent.id,
      paymentSessionId: session.id,
      amountRials: intent.finalAmountRials,
      provider: provider.id,
    },
  });

  await recordPaymentCrm({
    organizationId: params.organizationId,
    leadId: registration.leadId,
    activityType: CrmActivityType.PAYMENT_STARTED,
    title: "Payment Started",
    summary: `${registration.registrationNumber} · ${intent.finalAmountRials} ریال`,
    metadata: {
      registrationId: registration.id,
      paymentIntentId: intent.id,
      paymentSessionId: session.id,
      amountRials: intent.finalAmountRials,
      provider: provider.id,
    },
  });

  return {
    ok: true,
    paymentIntentId: intent.id,
    paymentSessionId: session.id,
    checkoutUrl: requested.checkoutUrl,
    trackingCode: requested.trackingCode,
    provider: provider.id,
  };
}

/**
 * Create or reuse unpaid PaymentIntent for a commerce order and open checkout.
 */
export async function startCheckoutForCommerceOrder(params: {
  organizationId: string;
  orderId: string;
}): Promise<StartCheckoutResult> {
  const order = await prisma.commerceOrder.findFirst({
    where: {
      id: params.orderId,
      organizationId: params.organizationId,
    },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      paymentStatus: true,
      grandTotalRials: true,
      currency: true,
      buyerMobile: true,
      items: {
        take: 1,
        select: { titleSnapshot: true },
      },
    },
  });

  if (!order) {
    return { ok: false, error: "سفارش یافت نشد." };
  }

  if (order.paymentStatus === CommerceOrderPaymentStatus.PAID) {
    return { ok: false, error: "این سفارش قبلاً پرداخت شده است." };
  }

  if (order.status === CommerceOrderStatus.CANCELLED) {
    return { ok: false, error: "این سفارش لغو شده است." };
  }

  const provider = getPaymentProvider();
  const idempotencyKey = `commerce-order:${order.id}:${order.grandTotalRials}`;
  const productTitle = order.items[0]?.titleSnapshot ?? "محصول";
  const description = `خرید ${productTitle} — ${order.orderNumber}`;

  let intent = await prisma.paymentIntent.findFirst({
    where: {
      organizationId: params.organizationId,
      idempotencyKey,
    },
  });

  if (intent && intent.status === PaymentStatus.PAID) {
    return { ok: false, error: "پرداخت این سفارش قبلاً انجام شده است." };
  }

  if (!intent) {
    const payable = commerceOrderPayableTarget(order.id);
    intent = await prisma.paymentIntent.create({
      data: {
        organizationId: params.organizationId,
        registrationId: payable.registrationId,
        payableType: payable.payableType,
        payableId: payable.payableId,
        idempotencyKey,
        status: PaymentStatus.PENDING,
        provider: provider.id,
        amountRials: order.grandTotalRials,
        discountRials: 0,
        finalAmountRials: order.grandTotalRials,
        currency: order.currency,
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
      message: "Commerce payment intent created",
    });
  }

  if (
    intent.status !== PaymentStatus.PENDING &&
    !isRetryablePaymentStatus(intent.status) &&
    intent.status !== PaymentStatus.PROCESSING
  ) {
    return {
      ok: false,
      error: "امکان شروع پرداخت برای این وضعیت وجود ندارد.",
    };
  }

  const fromStatus = intent.status;
  if (fromStatus !== PaymentStatus.PROCESSING) {
    assertPaymentTransition(fromStatus, PaymentStatus.PROCESSING);
  }

  const callbackToken = newCallbackToken();
  const callbackPath = `/payments/callback/${provider.id}`;

  const requested = await provider.requestPayment({
    organizationId: params.organizationId,
    paymentIntentId: intent.id,
    amountRials: intent.finalAmountRials,
    currency: intent.currency,
    description: intent.description ?? description,
    callbackPath,
    callbackToken,
    metadata: {
      commerceOrderId: order.id,
      orderNumber: order.orderNumber,
      ...(order.buyerMobile ? { mobile: order.buyerMobile } : {}),
    },
  });

  if (!requested.ok) {
    return { ok: false, error: requested.error };
  }

  const checkoutUrl = requested.checkoutUrl?.trim() ?? "";
  if (!checkoutUrl) {
    return {
      ok: false,
      error:
        "لینک درگاه پرداخت دریافت نشد. لطفاً دوباره تلاش کنید یا با پشتیبانی تماس بگیرید.",
    };
  }

  if (provider.id === "zibal" && !isAllowedZibalCheckoutUrl(checkoutUrl)) {
    return { ok: false, error: "آدرس درگاه پرداخت نامعتبر است." };
  }

  const session = await prisma.$transaction(async (tx) => {
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
      message: "Commerce checkout session opened",
      metadata: { providerSessionId: requested.providerSessionId },
      tx,
    });

    const createdSession = await tx.paymentSession.create({
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

    await tx.commerceOrder.update({
      where: { id: order.id },
      data: {
        status: CommerceOrderStatus.AWAITING_PAYMENT,
        paymentStatus: CommerceOrderPaymentStatus.PENDING,
      },
    });

    return createdSession;
  });

  return {
    ok: true,
    paymentIntentId: intent.id,
    paymentSessionId: session.id,
    checkoutUrl: requested.checkoutUrl,
    trackingCode: requested.trackingCode,
    provider: provider.id,
  };
}

/**
 * Idempotent callback verification.
 * Duplicate / refresh safe: terminal intents return the same redirect without re-CRM.
 */
export async function verifyPaymentCallback(params: {
  organizationId: string;
  provider: string;
  callbackToken: string;
  callbackPayload: Record<string, unknown>;
}): Promise<VerifyCallbackResult> {
  const session = await prisma.paymentSession.findFirst({
    where: {
      organizationId: params.organizationId,
      callbackToken: params.callbackToken,
      provider: params.provider,
    },
    include: {
      paymentIntent: {
        include: {
          registration: {
            select: {
              id: true,
              branchId: true,
              leadId: true,
              registrationNumber: true,
              status: true,
            },
          },
        },
      },
    },
  });

  if (!session) {
    return { ok: false, error: "نشست پرداخت یافت نشد." };
  }

  const intent = session.paymentIntent;
  const registration = intent.registration;
  const isCommerce =
    intent.payableType === PaymentPayableType.COMMERCE_ORDER;

  if (!isCommerce && !registration) {
    console.error("[payment] missing registration on payment intent", {
      paymentIntentId: intent.id,
      payableType: intent.payableType,
      payableId: intent.payableId,
    });
    return {
      ok: false,
      error: "هدف پرداخت برای این نشست یافت نشد.",
    };
  }

  if (isCommerce) {
    const orderExists = await prisma.commerceOrder.findFirst({
      where: {
        id: intent.payableId,
        organizationId: params.organizationId,
      },
      select: { id: true, orderNumber: true },
    });
    if (!orderExists) {
      return { ok: false, error: "سفارش مرتبط با پرداخت یافت نشد." };
    }
  }

  if (isTerminalPaymentStatus(intent.status) || intent.status === PaymentStatus.PAID) {


    // Heal missing snapshots on idempotent retries (create-once by revenueKey).
    if (intent.status === PaymentStatus.PAID && registration) {
      await createAttributionSnapshotForRevenueEvent({
        organizationId: params.organizationId,
        revenueKey: paymentIntentRevenueKey(intent.id),
        leadId: registration.leadId,
        registrationId: registration.id,
        paymentIntentId: intent.id,
        amountRials: intent.finalAmountRials,
        attributedAt: intent.paidAt ?? undefined,
      });
    }
    return {
      ok: true,
      alreadyFinalized: true,
      paymentIntentId: intent.id,
      status: intent.status,
      registrationNumber: registration?.registrationNumber ?? null,
      redirectPath: buildSafePaymentRedirectPath(intent.status, intent.id),
    };
  }

  if (
    intent.status === PaymentStatus.FAILED ||
    intent.status === PaymentStatus.CANCELLED
  ) {
    return {
      ok: true,
      alreadyFinalized: true,
      paymentIntentId: intent.id,
      status: intent.status,
      registrationNumber: registration?.registrationNumber ?? null,
      redirectPath: buildSafePaymentRedirectPath(intent.status, intent.id),
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
      console.error("[payment] verified amount rejected", {
        paymentIntentId: intent.id,
        expectedRials: intent.finalAmountRials,
        verifiedRials: verified.amountRials ?? null,
        provider: provider.id,
      });
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

  const receiptNumber =
    nextStatus === PaymentStatus.PAID ? newReceiptNumber() : null;
  const trackingCode = verified.trackingCode ?? intent.trackingCode;

  await prisma.$transaction(async (tx) => {
    // Optimistic lock: only transition from PROCESSING
    const locked = await tx.paymentIntent.updateMany({
      where: {
        id: intent.id,
        organizationId: params.organizationId,
        status: PaymentStatus.PROCESSING,
      },
      data: {
        status: nextStatus,
        trackingCode,
        receiptNumber:
          nextStatus === PaymentStatus.PAID ? receiptNumber : undefined,
        paidAt: nextStatus === PaymentStatus.PAID ? new Date() : undefined,
        failedAt: nextStatus === PaymentStatus.FAILED ? new Date() : undefined,
        cancelledAt:
          nextStatus === PaymentStatus.CANCELLED ? new Date() : undefined,
      },
    });

    if (locked.count === 0) {
      // Another concurrent verify won — treat as already finalized below.
      return;
    }

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
      message: `Provider verify outcome: ${verified.outcome}`,
      metadata: {
        providerRef: verified.providerRef,
        providerSessionId: session.providerSessionId,
      },
      tx,
    });


    if (isCommerce) {
      if (nextStatus === PaymentStatus.PAID) {
        const paidOnce = await tx.commerceOrder.updateMany({
          where: {
            id: intent.payableId,
            organizationId: params.organizationId,
            paymentStatus: { not: CommerceOrderPaymentStatus.PAID },
          },
          data: {
            status: CommerceOrderStatus.PAID,
            paymentStatus: CommerceOrderPaymentStatus.PAID,
            opsStage: CommerceOpsStage.PAID,
            fulfillmentStatus: CommerceFulfillmentStatus.AWAITING_PICKUP,
          },
        });

        // Inventory decrements exactly once — gated by first PAID transition.
        if (paidOnce.count === 1) {
          await recordCommerceOrderEvent(
            tx,
            stageChangedEventInput({
              organizationId: params.organizationId,
              orderId: intent.payableId,
              stage: "PAID",
            }),
          );

          const lines = await tx.commerceOrderItem.findMany({
            where: {
              organizationId: params.organizationId,
              orderId: intent.payableId,
              itemId: { not: null },
            },
            select: { itemId: true, quantity: true },
          });

          for (const line of lines) {
            if (!line.itemId) continue;
            const stock = await decrementCommerceItemStock({
              tx,
              organizationId: params.organizationId,
              itemId: line.itemId,
              quantity: line.quantity,
            });
            if (!stock.ok) {
              console.error("[payment] commerce stock decrement failed", {
                orderId: intent.payableId,
                itemId: line.itemId,
                error: stock.error,
              });
            }
          }
        }
      } else {
        await tx.commerceOrder.updateMany({
          where: {
            id: intent.payableId,
            organizationId: params.organizationId,
            paymentStatus: { not: CommerceOrderPaymentStatus.PAID },
          },
          data: {
            status: CommerceOrderStatus.AWAITING_PAYMENT,
            paymentStatus: CommerceOrderPaymentStatus.FAILED,
          },
        });
      } 
  } else if (registration) {
    if (nextStatus === PaymentStatus.PAID) {
      await tx.registration.update({
        where: { id: registration.id },
        data: {
          status: RegistrationStatus.APPROVED,
          paymentStatus: RegistrationPaymentStatus.PAID,
          trackingCode,
          paymentRef: verified.providerRef,
          paymentProvider: provider.id,
        },
      });
      await createAttributionSnapshotForRevenueEvent({
        organizationId: params.organizationId,
        revenueKey: paymentIntentRevenueKey(intent.id),
        leadId: registration.leadId,
        registrationId: registration.id,
        paymentIntentId: intent.id,
        amountRials: intent.finalAmountRials,
        tx,
      });
    } else {
      await tx.registration.update({
        where: { id: registration.id },
        data: {
          status: RegistrationStatus.WAITING_PAYMENT,
          paymentStatus: RegistrationPaymentStatus.FAILED,
          trackingCode,
          paymentRef: verified.providerRef,
        }
      });
     }
    }
  });

  // Re-read after transaction for concurrent-safe redirect
  const fresh = await prisma.paymentIntent.findFirst({
    where: { id: intent.id, organizationId: params.organizationId },
    select: { id: true, status: true },
  });

  if (!fresh) {
    return { ok: false, error: "پرداخت یافت نشد." };
  }


  if (isCommerce) {
    if (fresh.status === PaymentStatus.PAID) {
      // Provider send (form verify template) — never block payment.
      void enqueueCommerceOrderPaidSms({
        organizationId: params.organizationId,
        orderId: intent.payableId,
      }).catch((error) => {
        console.error("[payment] commerce SMS notify failed", {
          orderId: intent.payableId,
          error: error instanceof Error ? error.message : error,
        });
      });
    }

    return {
      ok: true,
      alreadyFinalized: false,
      paymentIntentId: fresh.id,
      status: fresh.status,
      registrationNumber: null,
      redirectPath: buildSafePaymentRedirectPath(fresh.status, fresh.id),
    };
  }

  if (!registration) {
    return { ok: false, error: "هدف پرداخت یافت نشد." };
  }
  // Idempotent snapshot (covers concurrent verify where this tx lost the lock).
  if (fresh.status === PaymentStatus.PAID) {
    await createAttributionSnapshotForRevenueEvent({
      organizationId: params.organizationId,
      revenueKey: paymentIntentRevenueKey(intent.id),
      leadId: registration.leadId,
      registrationId: registration.id,
      paymentIntentId: intent.id,
      amountRials: intent.finalAmountRials,
    });

  }

  // CRM only when we actually transitioned (status matches expected outcome)
  const crmAlready = await prisma.crmActivity.findFirst({
    where: {
      organizationId: params.organizationId,
      leadId: registration.leadId ?? undefined,
      activityType: {
        in: [
          CrmActivityType.PAYMENT_SUCCEEDED,
          CrmActivityType.PAYMENT_FAILED,
          CrmActivityType.PAYMENT_CANCELLED,
        ],
      },
      metadata: {
        string_contains: intent.id,
      },
    },
    select: { id: true },
  });

  if (!crmAlready) {
    if (fresh.status === PaymentStatus.PAID) {
      if (registration.leadId) {
        await recordPaymentCrm({
          organizationId: params.organizationId,
          leadId: registration.leadId,
          activityType: CrmActivityType.PAYMENT_SUCCEEDED,
          title: "Payment Succeeded",
          summary: `${registration.registrationNumber} · پرداخت موفق`,
          metadata: {
            registrationId: registration.id,
            paymentIntentId: intent.id,
            amountRials: intent.finalAmountRials,
            provider: provider.id,
            receiptNumber,
            trackingCode,
          },
        });
      }
      await recordRegistrationActivity({
        organizationId: params.organizationId,
        registrationId: registration.id,
        activityType: RegistrationActivityType.SYSTEM,
        title: "پرداخت موفق",
        summary: receiptNumber
          ? `رسید ${receiptNumber}`
          : registration.registrationNumber,
        metadata: {
          paymentIntentId: intent.id,
          trackingCode: trackingCode ?? null,
          amountRials: intent.finalAmountRials,
        },
      });
      await enqueueDomainEvent({
        organizationId: params.organizationId,
        branchId: registration.branchId,
        eventType: DomainEventType.PAYMENT_SUCCESS,
        aggregateType: "PaymentIntent",
        aggregateId: intent.id,
        dedupeKey: `PAYMENT_SUCCESS:${intent.id}`,
        payload: {
          paymentIntentId: intent.id,
          registrationId: registration.id,
          leadId: registration.leadId,
          paymentStatus: PaymentStatus.PAID,
          amountRials: intent.finalAmountRials,
        },
      }).catch(() => undefined);
    } else if (fresh.status === PaymentStatus.CANCELLED) {
      if (registration.leadId) {
        await recordPaymentCrm({
          organizationId: params.organizationId,
          leadId: registration.leadId,
          activityType: CrmActivityType.PAYMENT_CANCELLED,
          title: "Payment Cancelled",
          summary: `${registration.registrationNumber} · پرداخت لغو شد`,
          metadata: {
            registrationId: registration.id,
            paymentIntentId: intent.id,
            amountRials: intent.finalAmountRials,
            provider: provider.id,
          },
        });
      }
      await recordRegistrationActivity({
        organizationId: params.organizationId,
        registrationId: registration.id,
        activityType: RegistrationActivityType.SYSTEM,
        title: "پرداخت لغو شد",
        summary: "ثبت‌نام قابل ادامه است؛ می‌توانید دوباره پرداخت کنید.",
        metadata: {
          paymentIntentId: intent.id,
          status: fresh.status,
        },
      });
    } else if (fresh.status === PaymentStatus.FAILED) {
      if (registration.leadId) {
        await recordPaymentCrm({
          organizationId: params.organizationId,
          leadId: registration.leadId,
          activityType: CrmActivityType.PAYMENT_FAILED,
          title: "Payment Failed",
          summary: `${registration.registrationNumber} · پرداخت ناموفق`,
          metadata: {
            registrationId: registration.id,
            paymentIntentId: intent.id,
            amountRials: intent.finalAmountRials,
            provider: provider.id,
          },
        });
      }
      await recordRegistrationActivity({
        organizationId: params.organizationId,
        registrationId: registration.id,
        activityType: RegistrationActivityType.SYSTEM,
        title: "پرداخت ناموفق",
        summary: "ثبت‌نام قابل ادامه است؛ می‌توانید دوباره پرداخت کنید.",
        metadata: {
          paymentIntentId: intent.id,
          status: fresh.status,
        },
      });
      await enqueueDomainEvent({
        organizationId: params.organizationId,
        branchId: registration.branchId,
        eventType: DomainEventType.PAYMENT_FAILED,
        aggregateType: "PaymentIntent",
        aggregateId: intent.id,
        dedupeKey: `PAYMENT_FAILED:${intent.id}`,
        payload: {
          paymentIntentId: intent.id,
          registrationId: registration.id,
          leadId: registration.leadId,
          paymentStatus: PaymentStatus.FAILED,
        },
      }).catch(() => undefined);
    }
  }

  return {
    ok: true,
    alreadyFinalized: false,
    paymentIntentId: fresh.id,
    status: fresh.status,
    registrationNumber: registration.registrationNumber,
    redirectPath: buildSafePaymentRedirectPath(fresh.status, fresh.id),
  };
}

export async function getPaymentIntentPublicView(
  organizationId: string,
  intentId: string,
) {
  const intent = await prisma.paymentIntent.findFirst({
    where: {
      id: intentId,
      organizationId,
    },
    include: {
      registration: {
        select: {
          id: true,
          registrationNumber: true,
          status: true,
          studentFirstName: true,
          studentLastName: true,
          productTitle: true,
          sessionTitle: true,
          packageTitle: true,
          venueBranchTitle: true,
          gradeLabel: true,
          parentName: true,
        },
      },
    },
  });

  if (!intent) return null;

  if (intent.payableType === PaymentPayableType.COMMERCE_ORDER) {
    const commerceOrder = await prisma.commerceOrder.findFirst({
      where: {
        id: intent.payableId,
        organizationId,
      },
      include: {
        items: {
          orderBy: { createdAt: "asc" },
          select: {
            titleSnapshot: true,
            quantity: true,
            unitPriceRials: true,
            totalRials: true,
          },
        },
      },
    });
    return { ...intent, commerceOrder };
  }

  return { ...intent, commerceOrder: null };
}

export async function getMockCheckoutSession(
  organizationId: string,
  providerSessionId: string,
  callbackToken: string,
) {
  return prisma.paymentSession.findFirst({
    where: {
      organizationId,
      provider: "mock",
      providerSessionId,
      callbackToken,
    },
    include: {
      paymentIntent: {
        select: {
          id: true,
          finalAmountRials: true,
          currency: true,
          description: true,
          status: true,
          trackingCode: true,
          registration: {
            select: {
              registrationNumber: true,
              productTitle: true,
              studentFirstName: true,
              studentLastName: true,
            },
          },
        },
      },
    },
  });
}
