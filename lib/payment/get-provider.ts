import type { PaymentProvider } from "@/lib/payment/provider";
import { MockPaymentProvider } from "@/lib/payment/providers/mock";

let providerSingleton: PaymentProvider | null = null;

/**
 * Resolves the active payment provider.
 * Default: mock. Real PSPs will be selected via STAROS_PAYMENT_PROVIDER later.
 */
export function getPaymentProvider(): PaymentProvider {
  if (providerSingleton) {
    return providerSingleton;
  }

  const configured = process.env.STAROS_PAYMENT_PROVIDER?.trim().toLowerCase();
  if (configured && configured !== "mock") {
    // Real providers not implemented in Sprint 4A — fall back to mock safely.
    console.warn(
      `[payment] Unknown STAROS_PAYMENT_PROVIDER="${configured}"; using mock.`,
    );
  }

  providerSingleton = new MockPaymentProvider();
  return providerSingleton;
}

/** Test/DI hook. */
export function setPaymentProviderForTests(provider: PaymentProvider | null): void {
  providerSingleton = provider;
}
