/**
 * Canonical payable package resolver for Guidance checkout.
 * V2 Step 10 catalog wins for journeyVersion = 2.
 * Legacy Step-3 ESSENTIAL/PREMIUM remains for V1 only.
 */

import {
  quoteGuidanceCheckoutSelection,
  type GuidanceCheckoutQuote,
} from "@/lib/guidance/commerce/checkout-quote";
import {
  GUIDANCE_COMMERCE_CODES,
  isGuidanceSellableBaseCode,
  legacyPackagePriceRials,
} from "@/lib/guidance/commerce/catalog";
import {
  GUIDANCE_V2_PACKAGES,
  getGuidanceV2Package,
  listGuidanceV2PackagesForNewSale,
} from "@/lib/guidance/journey-v2/steps/step10-packages";
import { getGuidancePackage } from "@/lib/guidance/journey/packages";

export type GuidancePayablePackage = {
  code: string;
  title: string;
  priceRials: number;
  requiresPayment: boolean;
  sellable?: boolean;
};

export function resolveGuidancePayablePackage(
  code: string,
  options?: { journeyVersion?: number | null },
): GuidancePayablePackage | null {
  const normalized = code.trim().toUpperCase();
  const version = options?.journeyVersion ?? null;

  if (version === 1) {
    const legacy = getGuidancePackage(normalized);
    if (!legacy) return null;
    return {
      code: legacy.code,
      title: legacy.title,
      priceRials: legacy.priceRials,
      requiresPayment: legacy.priceRials > 0,
    };
  }

  const v2 = getGuidanceV2Package(normalized);
  if (v2) {
    return {
      code: v2.code,
      title: v2.title,
      priceRials: v2.priceRials,
      requiresPayment: v2.requiresPayment,
      sellable: v2.sellable,
    };
  }

  const legacyPrice = legacyPackagePriceRials(normalized);
  if (legacyPrice != null && version !== 2) {
    return {
      code: normalized,
      title: normalized,
      priceRials: legacyPrice,
      requiresPayment: legacyPrice > 0,
      sellable: false,
    };
  }

  if (version === 2) {
    return null;
  }

  const legacy = getGuidancePackage(normalized);
  if (!legacy) return null;
  return {
    code: legacy.code,
    title: legacy.title,
    priceRials: legacy.priceRials,
    requiresPayment: legacy.priceRials > 0,
  };
}

/** New-sale checkout (server-side). */
export function resolveGuidanceNewSaleCheckout(params: {
  packageCode: string;
  farhangianAddon: boolean;
}):
  | {
      ok: true;
      pkg: GuidancePayablePackage;
      quote: GuidanceCheckoutQuote;
    }
  | { ok: false; error: string } {
  const quoted = quoteGuidanceCheckoutSelection({
    basePackageCode: params.packageCode,
    farhangianAddon: params.farhangianAddon,
  });
  if (!quoted.ok) return quoted;
  const base = getGuidanceV2Package(quoted.quote.planPackageCode);
  if (!base || !base.sellable) {
    return { ok: false, error: "بسته انتخاب‌شده برای خرید جدید فعال نیست." };
  }
  return {
    ok: true,
    pkg: {
      code: base.code,
      title: base.title,
      priceRials: quoted.quote.originalAmountRials,
      requiresPayment: true,
      sellable: true,
    },
    quote: quoted.quote,
  };
}

export function listDiscountPreviewPackages(): GuidancePayablePackage[] {
  return listGuidanceV2PackagesForNewSale().map((item) => ({
    code: item.code,
    title: item.title,
    priceRials: item.priceRials,
    requiresPayment: true,
    sellable: true,
  }));
}

export function isNewSalePackageCode(code: string): boolean {
  return isGuidanceSellableBaseCode(code.trim().toUpperCase());
}

export { GUIDANCE_COMMERCE_CODES };
