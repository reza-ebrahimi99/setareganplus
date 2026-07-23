import type { PaymentStatus } from "@/generated/prisma/enums";

export type PaymentProviderId = "mock";

export type RequestPaymentInput = {
  organizationId: string;
  paymentIntentId: string;
  amountRials: number;
  currency: string;
  description: string;
  /** Absolute or site-relative path the provider should return to after checkout. */
  callbackPath: string;
  /** Opaque token the app embeds so callback can resolve the session. */
  callbackToken: string;
  metadata?: Record<string, string>;
};

export type RequestPaymentResult =
  | {
      ok: true;
      provider: PaymentProviderId;
      providerSessionId: string;
      checkoutUrl: string;
      trackingCode: string | null;
      raw: Record<string, unknown>;
    }
  | { ok: false; error: string };

export type VerifyPaymentInput = {
  organizationId: string;
  providerSessionId: string;
  callbackToken: string;
  /** Provider-specific callback query/body (mock: outcome). */
  callbackPayload: Record<string, unknown>;
};

export type VerifyPaymentOutcome = "paid" | "failed" | "cancelled";

export type VerifyPaymentResult =
  | {
      ok: true;
      outcome: VerifyPaymentOutcome;
      providerRef: string | null;
      trackingCode: string | null;
      raw: Record<string, unknown>;
    }
  | { ok: false; error: string };

/**
 * Gateway-agnostic payment provider contract.
 * Real PSPs implement this later; no gateway logic outside providers.
 */
export interface PaymentProvider {
  readonly id: PaymentProviderId;
  requestPayment(input: RequestPaymentInput): Promise<RequestPaymentResult>;
  verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult>;
}

export type PaymentRedirectTarget =
  | { kind: "success"; intentId: string }
  | { kind: "failed"; intentId: string }
  | { kind: "cancelled"; intentId: string };

export function paymentStatusToRedirect(
  status: PaymentStatus,
  intentId: string,
): PaymentRedirectTarget {
  if (status === "PAID") {
    return { kind: "success", intentId };
  }
  if (status === "CANCELLED") {
    return { kind: "cancelled", intentId };
  }
  return { kind: "failed", intentId };
}
