/**
 * Payment provider selection.
 *
 * Precedence (exact):
 * 1. PAYMENT_PROVIDER — canonical
 * 2. STAROS_PAYMENT_PROVIDER — legacy alias, used only when PAYMENT_PROVIDER is unset/blank
 * 3. default "mock"
 *
 * If both are set and differ, PAYMENT_PROVIDER wins and a warning is logged so an
 * old STAROS_PAYMENT_PROVIDER=mock cannot silently override PAYMENT_PROVIDER=zibal.
 */

import type { PaymentProvider, PaymentProviderId } from "@/lib/payment/provider";
import { MockPaymentProvider } from "@/lib/payment/providers/mock";
import { ZibalPaymentProvider } from "@/lib/payment/providers/zibal";
import { readZibalMerchantId } from "@/lib/payment/providers/zibal-http";

let providerSingleton: PaymentProvider | null = null;

function normalizeProviderRaw(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function toProviderId(raw: string): PaymentProviderId | null {
  if (raw === "zibal") return "zibal";
  if (raw === "mock") return "mock";
  if (raw === "") return null;
  return null;
}

/**
 * Resolve configured provider id from env (no singleton). Exported for unit tests.
 */
export function resolveConfiguredPaymentProviderId(): {
  id: PaymentProviderId;
  source: "PAYMENT_PROVIDER" | "STAROS_PAYMENT_PROVIDER" | "default";
  conflict: boolean;
} {
  const paymentRaw = normalizeProviderRaw(process.env.PAYMENT_PROVIDER);
  const starosRaw = normalizeProviderRaw(process.env.STAROS_PAYMENT_PROVIDER);

  const paymentId = toProviderId(paymentRaw);
  const starosId = toProviderId(starosRaw);

  if (paymentRaw && paymentId == null) {
    console.warn(
      `[payment] Unknown PAYMENT_PROVIDER "${paymentRaw}"; falling back.`,
    );
  }
  if (!paymentRaw && starosRaw && starosId == null) {
    console.warn(
      `[payment] Unknown STAROS_PAYMENT_PROVIDER "${starosRaw}"; falling back.`,
    );
  }

  if (paymentId) {
    const conflict = Boolean(starosId && starosId !== paymentId);
    if (conflict) {
      console.warn(
        `[payment] Env conflict: PAYMENT_PROVIDER=${paymentId} overrides STAROS_PAYMENT_PROVIDER=${starosId}. Canonical is PAYMENT_PROVIDER.`,
      );
    }
    return { id: paymentId, source: "PAYMENT_PROVIDER", conflict };
  }

  if (starosId) {
    return { id: starosId, source: "STAROS_PAYMENT_PROVIDER", conflict: false };
  }

  return { id: "mock", source: "default", conflict: false };
}

/**
 * Resolves the active payment provider.
 * Canonical env: PAYMENT_PROVIDER. Legacy: STAROS_PAYMENT_PROVIDER.
 */
export function getPaymentProvider(): PaymentProvider {
  if (providerSingleton) {
    return providerSingleton;
  }

  const resolved = resolveConfiguredPaymentProviderId();
  const id = resolved.id;

  if (id === "zibal") {
    if (!readZibalMerchantId()) {
      console.error(
        "[payment] Zibal selected but ZIBAL_MERCHANT_ID is missing; requestPayment will fail safely.",
      );
    }
    providerSingleton = new ZibalPaymentProvider();
    return providerSingleton;
  }

  providerSingleton = new MockPaymentProvider();
  return providerSingleton;
}

/** Test/DI hook. */
export function setPaymentProviderForTests(
  provider: PaymentProvider | null,
): void {
  providerSingleton = provider;
}
