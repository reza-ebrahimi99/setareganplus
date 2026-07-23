import { randomBytes } from "node:crypto";
import type {
  RequestPaymentInput,
  RequestPaymentResult,
  VerifyPaymentInput,
  VerifyPaymentResult,
  PaymentProvider,
} from "@/lib/payment/provider";

/**
 * Local mock PSP for Sprint 4A.
 * Checkout UI posts outcome; verify reads outcome from callback payload.
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly id = "mock" as const;

  async requestPayment(
    input: RequestPaymentInput,
  ): Promise<RequestPaymentResult> {
    if (input.amountRials < 0) {
      return { ok: false, error: "مبلغ پرداخت نامعتبر است." };
    }

    const providerSessionId = `mock_${randomBytes(12).toString("hex")}`;
    const trackingCode = `TRK-MOCK-${randomBytes(4).toString("hex").toUpperCase()}`;
    const checkoutUrl = `/payments/mock/checkout/${encodeURIComponent(providerSessionId)}?token=${encodeURIComponent(input.callbackToken)}`;

    return {
      ok: true,
      provider: this.id,
      providerSessionId,
      checkoutUrl,
      trackingCode,
      raw: {
        amountRials: input.amountRials,
        currency: input.currency,
        description: input.description,
        callbackPath: input.callbackPath,
      },
    };
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    const outcomeRaw = String(input.callbackPayload.outcome ?? "")
      .trim()
      .toLowerCase();

    if (
      outcomeRaw !== "paid" &&
      outcomeRaw !== "failed" &&
      outcomeRaw !== "cancelled"
    ) {
      return {
        ok: false,
        error: "نتیجه پرداخت شبیه‌سازی‌شده نامعتبر است.",
      };
    }

    const trackingCode =
      typeof input.callbackPayload.trackingCode === "string"
        ? input.callbackPayload.trackingCode
        : null;

    return {
      ok: true,
      outcome: outcomeRaw,
      providerRef: `mock-ref-${input.providerSessionId}`,
      trackingCode,
      raw: { ...input.callbackPayload },
    };
  }
}
