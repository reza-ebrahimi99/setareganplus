/**
 * Domain-level smoke for Sprint 4A payment foundation (mock provider).
 * Run: npx tsx scripts/payment-foundation-smoke.ts
 *
 * Requires DATABASE_URL and applied migration.
 */

import { PaymentStatus } from "../generated/prisma/enums";
import {
  canTransitionPaymentStatus,
  isRetryablePaymentStatus,
  isTerminalPaymentStatus,
} from "../lib/payment/status-machine";
import { MockPaymentProvider } from "../lib/payment/providers/mock";

async function main() {
  const errors: string[] = [];

  // Status machine
  if (!canTransitionPaymentStatus(PaymentStatus.PENDING, PaymentStatus.PROCESSING)) {
    errors.push("PENDING → PROCESSING should be allowed");
  }
  if (canTransitionPaymentStatus(PaymentStatus.PAID, PaymentStatus.FAILED)) {
    errors.push("PAID → FAILED must be blocked");
  }
  if (!isTerminalPaymentStatus(PaymentStatus.PAID)) {
    errors.push("PAID should be terminal");
  }
  if (!isRetryablePaymentStatus(PaymentStatus.FAILED)) {
    errors.push("FAILED should be retryable");
  }

  const provider = new MockPaymentProvider();
  const requested = await provider.requestPayment({
    organizationId: "org_test",
    paymentIntentId: "pi_test",
    amountRials: 1_000_000,
    currency: "IRR",
    description: "smoke",
    callbackPath: "/payments/callback/mock",
    callbackToken: "tok_test",
  });
  if (!requested.ok) {
    errors.push(`requestPayment failed: ${requested.error}`);
  } else {
    for (const outcome of ["paid", "failed", "cancelled"] as const) {
      const verified = await provider.verifyPayment({
        organizationId: "org_test",
        providerSessionId: requested.providerSessionId,
        callbackToken: "tok_test",
        callbackPayload: { outcome, trackingCode: requested.trackingCode },
      });
      if (!verified.ok || verified.outcome !== outcome) {
        errors.push(`verify ${outcome} failed`);
      }
    }
    // Duplicate verify same outcome — provider is stateless; still returns ok
    const again = await provider.verifyPayment({
      organizationId: "org_test",
      providerSessionId: requested.providerSessionId,
      callbackToken: "tok_test",
      callbackPayload: { outcome: "paid" },
    });
    if (!again.ok || again.outcome !== "paid") {
      errors.push("duplicate verify paid failed");
    }
  }

  if (errors.length > 0) {
    console.error("payment-foundation-smoke FAILED:");
    for (const error of errors) console.error(` - ${error}`);
    process.exit(1);
  }

  console.log("payment-foundation-smoke PASS");
  console.log("  status machine OK");
  console.log("  mock request/verify (paid|failed|cancelled|duplicate) OK");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
