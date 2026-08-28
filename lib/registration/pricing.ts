/**
 * Server-authoritative registration pricing.
 * Client may preview; createRegistration always re-resolves with DB flow config + now.
 * Timed-discount math lives in `timed-discount.ts` (single source of truth).
 */

import { getRegistrationCatalog } from "@/lib/registration/catalog-registry";
import type { RegistrationFlowConfig } from "@/lib/registration/flow-config-shared";
import {
  resolveTimedDiscountPricing,
} from "@/lib/registration/timed-discount";
import type { DetailsStepInput } from "@/lib/registration/types";

export type ResolvedRegistrationPricing = {
  ok: true;
  amountRials: number;
  discountRials: number;
  finalAmountRials: number;
  productTitle: string;
  sessionTitle: string;
  packageTitle: string;
  venueBranchTitle: string;
  discountCode: string | null;
  pricingBadge: string | null;
  isFree: boolean;
  discountActive: boolean;
  discountEndsAt: Date | null;
  savingsRials: number;
  discountPercent: number | null;
};

export type ResolvePricingFailure = { ok: false; error: string };

function trim(value: string): string {
  return value.trim();
}

export function resolveRegistrationPricing(params: {
  flowKey: string;
  details: DetailsStepInput;
  flow: RegistrationFlowConfig | null;
  now?: Date;
}): ResolvedRegistrationPricing | ResolvePricingFailure {
  const catalog = getRegistrationCatalog(params.flowKey);
  if (!catalog) return { ok: false, error: "جریان ثبت‌نام یافت نشد." };

  const product = catalog.products.find(
    (item) => item.key === params.details.productKey,
  );
  const session = catalog.sessions.find(
    (item) => item.key === params.details.sessionKey,
  );
  const pkg = catalog.packages.find(
    (item) => item.key === params.details.packageKey,
  );
  const venue = catalog.venueBranches.find(
    (item) => item.key === params.details.venueBranchKey,
  );

  if (!product || !session || !pkg || !venue) {
    return { ok: false, error: "جزئیات ثبت‌نام ناقص است." };
  }

  const now = params.now ?? new Date();
  const flow = params.flow;
  const packageOverride =
    flow?.settings.packagePricing[params.details.packageKey] ?? null;

  const catalogBase = pkg.amountRials;
  const amountRials =
    packageOverride?.baseAmountRials ??
    flow?.baseAmountRials ??
    catalogBase;

  if (!Number.isInteger(amountRials) || amountRials < 0) {
    return { ok: false, error: "مبلغ پایه نامعتبر است." };
  }

  const saleCandidate =
    packageOverride?.saleAmountRials ?? flow?.saleAmountRials ?? null;

  const isFree = Boolean(flow?.isFree);

  // Free flow: pay nothing (not a timed-sale window).
  if (isFree) {
    return {
      ok: true,
      amountRials,
      discountRials: amountRials,
      finalAmountRials: 0,
      productTitle: product.title,
      sessionTitle: session.title,
      packageTitle: pkg.title,
      venueBranchTitle: venue.title,
      discountCode: null,
      pricingBadge: null,
      isFree: true,
      discountActive: false,
      discountEndsAt: null,
      savingsRials: amountRials,
      discountPercent:
        amountRials > 0 ? 100 : null,
    };
  }

  const timed = resolveTimedDiscountPricing(
    {
      paymentAmountRials: amountRials,
      saleAmountRials: saleCandidate,
      discountStartsAt: flow?.discountStartsAt ?? null,
      discountEndsAt: flow?.discountEndsAt ?? null,
      pricingBadge: flow?.pricingBadge ?? null,
      showDiscountCountdown: flow?.showDiscountCountdown ?? true,
      isFree: false,
    },
    now,
  );

  let discountRials = timed.discountRials;
  let discountCode: string | null = null;
  let discountActive = timed.discountActive;
  let finalAmountRials = timed.finalAmountRials;
  let pricingBadge = timed.pricingBadge;
  let discountEndsAt = timed.discountActive
    ? (flow?.discountEndsAt ?? null)
    : null;
  let discountPercent = timed.discountPercent;

  // Promo codes only when timed sale is not active.
  if (!timed.discountActive) {
    const code = trim(params.details.discountCode).toUpperCase();
    if (code && code in catalog.discountCodes) {
      discountRials = Math.min(catalog.discountCodes[code]!, amountRials);
      discountCode = discountRials > 0 ? code : null;
      finalAmountRials = Math.max(0, amountRials - discountRials);
      discountActive = discountRials > 0;
      pricingBadge = null;
      discountEndsAt = null;
      discountPercent =
        amountRials > 0 && discountRials > 0
          ? Math.round((discountRials / amountRials) * 100)
          : null;
    }
  }

  return {
    ok: true,
    amountRials,
    discountRials,
    finalAmountRials,
    productTitle: product.title,
    sessionTitle: session.title,
    packageTitle: pkg.title,
    venueBranchTitle: venue.title,
    discountCode,
    pricingBadge,
    isFree: finalAmountRials === 0,
    discountActive,
    discountEndsAt,
    savingsRials: discountRials,
    discountPercent,
  };
}
