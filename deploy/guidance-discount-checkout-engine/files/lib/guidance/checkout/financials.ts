/**
 * Checkout financial handoff — pure, deterministic, no Prisma/Zibal I/O.
 * PaymentIntent.finalAmountRials and the gateway request amount MUST match.
 */

import {
  assertFinancialInvariant,
  assertGatewayAmountMatchesIntent,
  calculateGuidanceDiscount,
  type GuidanceDiscountCalcType,
} from "@/lib/guidance/discounts/engine";
import { resolveGuidancePayablePackage } from "@/lib/guidance/packages/resolve-payable";

/** Zibal requestPayment rejects amounts below 1000 rials. */
export const GUIDANCE_GATEWAY_MIN_RIALS = 1000;

export type GuidanceCheckoutPath = "zero-pay" | "gateway";

export type GuidanceCheckoutSnapshot = {
  packageCode: string;
  originalAmountRials: number;
  discountAmountRials: number;
  finalAmountRials: number;
  path: GuidanceCheckoutPath;
  gatewayAmountRials: number | null;
};

export function decideGuidanceCheckoutPath(
  finalAmountRials: number,
):
  | { ok: true; path: "zero-pay" }
  | { ok: true; path: "gateway" }
  | { ok: false; error: string } {
  if (!Number.isInteger(finalAmountRials) || finalAmountRials < 0) {
    return { ok: false, error: "مبلغ نهایی پرداخت نامعتبر است." };
  }
  if (finalAmountRials === 0) {
    return { ok: true, path: "zero-pay" };
  }
  if (finalAmountRials < GUIDANCE_GATEWAY_MIN_RIALS) {
    return {
      ok: false,
      error: "مبلغ نهایی برای اتصال به درگاه پرداخت معتبر نیست.",
    };
  }
  return { ok: true, path: "gateway" };
}

export function buildGuidanceCheckoutIdempotencyKey(params: {
  planId: string;
  packageCode: string;
  originalAmountRials: number;
  discountAmountRials: number;
  finalAmountRials: number;
  discountCode: string | null;
}): string {
  const code = params.discountCode ?? "-";
  return `guidance-pkg:v2:${params.planId}:${params.packageCode}:${params.originalAmountRials}:${params.discountAmountRials}:${params.finalAmountRials}:d:${code}`;
}

export function buildGuidancePaymentSnapshot(params: {
  packageCode: string;
  originalAmountRials: number;
  discountAmountRials: number;
  finalAmountRials: number;
}):
  | { ok: true; snapshot: GuidanceCheckoutSnapshot }
  | { ok: false; error: string } {
  const invariant = assertFinancialInvariant({
    originalAmountRials: params.originalAmountRials,
    discountAmountRials: params.discountAmountRials,
    finalAmountRials: params.finalAmountRials,
  });
  if (!invariant.ok) return invariant;

  const path = decideGuidanceCheckoutPath(params.finalAmountRials);
  if (!path.ok) return path;

  const gatewayAmountRials =
    path.path === "gateway" ? params.finalAmountRials : null;
  if (gatewayAmountRials != null) {
    const match = assertGatewayAmountMatchesIntent({
      intentFinalAmountRials: params.finalAmountRials,
      gatewayAmountRials,
    });
    if (!match.ok) return match;
  }

  return {
    ok: true,
    snapshot: {
      packageCode: params.packageCode,
      originalAmountRials: params.originalAmountRials,
      discountAmountRials: params.discountAmountRials,
      finalAmountRials: params.finalAmountRials,
      path: path.path,
      gatewayAmountRials,
    },
  };
}

/**
 * Server/catalog calculation used by checkout tests and admin preview.
 * Never accepts a client-supplied price.
 */
export function prepareGuidanceCheckoutHandoff(params: {
  packageCode: string;
  discount?: { type: GuidanceDiscountCalcType; value: number } | null;
}):
  | { ok: true; snapshot: GuidanceCheckoutSnapshot }
  | { ok: false; error: string } {
  const pkg = resolveGuidancePayablePackage(params.packageCode, { journeyVersion: 2 });
  if (!pkg || !pkg.requiresPayment) {
    return { ok: false, error: "بسته انتخاب‌شده معتبر نیست." };
  }

  let discountAmountRials = 0;
  let finalAmountRials = pkg.priceRials;
  if (params.discount) {
    const calc = calculateGuidanceDiscount({
      originalAmountRials: pkg.priceRials,
      type: params.discount.type,
      value: params.discount.value,
    });
    if (!calc.ok) return calc;
    discountAmountRials = calc.result.discountAmountRials;
    finalAmountRials = calc.result.finalAmountRials;
  }

  return buildGuidancePaymentSnapshot({
    packageCode: pkg.code,
    originalAmountRials: pkg.priceRials,
    discountAmountRials,
    finalAmountRials,
  });
}

export function assertGuidanceGatewayHandoff(params: {
  intentFinalAmountRials: number;
  gatewayAmountRials: number;
}): { ok: true } | { ok: false; error: string } {
  if (params.intentFinalAmountRials < GUIDANCE_GATEWAY_MIN_RIALS) {
    return { ok: false, error: "مبلغ نهایی برای اتصال به درگاه پرداخت معتبر نیست." };
  }
  return assertGatewayAmountMatchesIntent(params);
}
