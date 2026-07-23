/**
 * Payment domain service — intents, sessions, verify (idempotent).
 * Provider-agnostic; only talks to PaymentProvider interface.
 */

import { randomBytes } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import {
  CrmActivityType,
  PaymentStatus,
  RegistrationActivityType,
  RegistrationPaymentStatus,
  RegistrationStatus,
} from "@/generated/prisma/enums";
import { recordCrmActivity } from "@/lib/crm/activity";
import { getPaymentProvider } from "@/lib/payment/get-provider";
import { logPaymentEvent } from "@/lib/payment/logger";
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
      registrationNumber: string;
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
    intent = await prisma.paymentIntent.create({
      data: {
        organizationId: params.organizationId,
        registrationId: registration.id,
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
    },
  });

  if (!requested.ok) {
    return { ok: false, error: requested.error };
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
        checkoutUrl: requested.checkoutUrl,
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

  if (isTerminalPaymentStatus(intent.status) || intent.status === PaymentStatus.PAID) {
    const redirectPath =
      intent.status === PaymentStatus.PAID
        ? `/payments/success?intent=${encodeURIComponent(intent.id)}`
        : `/payments/failed?intent=${encodeURIComponent(intent.id)}`;
    return {
      ok: true,
      alreadyFinalized: true,
      paymentIntentId: intent.id,
      status: intent.status,
      registrationNumber: registration.registrationNumber,
      redirectPath,
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
      registrationNumber: registration.registrationNumber,
      redirectPath: `/payments/failed?intent=${encodeURIComponent(intent.id)}`,
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
    } else {
      await tx.registration.update({
        where: { id: registration.id },
        data: {
          status: RegistrationStatus.WAITING_PAYMENT,
          paymentStatus: RegistrationPaymentStatus.FAILED,
          trackingCode,
          paymentRef: verified.providerRef,
        },
      });
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
    }
  }

  const redirectPath =
    fresh.status === PaymentStatus.PAID
      ? `/payments/success?intent=${encodeURIComponent(fresh.id)}`
      : `/payments/failed?intent=${encodeURIComponent(fresh.id)}`;

  return {
    ok: true,
    alreadyFinalized: false,
    paymentIntentId: fresh.id,
    status: fresh.status,
    registrationNumber: registration.registrationNumber,
    redirectPath,
  };
}

export async function getPaymentIntentPublicView(
  organizationId: string,
  intentId: string,
) {
  return prisma.paymentIntent.findFirst({
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
