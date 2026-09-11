/**
 * Student-facing discount preview/apply helpers for Step 10.
 * Does not talk to Zibal. Checkout still uses existing PaymentIntent flow.
 */

import { getGuidancePackage } from "@/lib/guidance/journey/packages";
import { requireGuidanceV2StepAccess } from "@/lib/guidance/journey-v2/guard";
import { quoteGuidancePackageDiscount } from "@/lib/guidance/discounts/quote";

/**
 * Step 10 package codes. This module must not import the production
 * step10-packages catalog (prices stay there). Production Step 10
 * re-validates the returned code against GUIDANCE_V2_PACKAGES /
 * GuidanceV2PackageCode before constructing the UI preview object.
 */
export const GUIDANCE_V2_PREVIEW_PACKAGE_CODES = [
  "START",
  "SMART",
  "SPECIALIZED",
  "PREMIUM",
] as const;

export type GuidanceV2PreviewPackageCode =
  (typeof GUIDANCE_V2_PREVIEW_PACKAGE_CODES)[number];

export function parseGuidanceV2PreviewPackageCode(
  value: string,
): GuidanceV2PreviewPackageCode | null {
  switch (value) {
    case "START":
    case "SMART":
    case "SPECIALIZED":
    case "PREMIUM":
      return value;
    default:
      return null;
  }
}

function discountPreviewLabel(code: string, source: "db" | "legacy"): string {
  if (source === "legacy") return "تخفیف همراهان قدیمی";
  return `کد تخفیف ${code}`;
}

export type GuidanceDiscountPreviewState =
  | {
      ok: true;
      code: string;
      label: string;
      discountRials: number;
      finalAmountRials: number;
      packageCode: GuidanceV2PreviewPackageCode;
      source: "db" | "legacy";
    }
  | { ok: false; error: string };

export function lookupKnownGuidancePackagePriceRials(
  packageCode: string,
  fallbackPriceRials?: number,
): number | null {
  if (
    typeof fallbackPriceRials === "number" &&
    Number.isInteger(fallbackPriceRials) &&
    fallbackPriceRials > 0
  ) {
    return fallbackPriceRials;
  }
  return getGuidancePackage(packageCode)?.priceRials ?? null;
}

export async function previewManagedGuidanceDiscountForStudent(
  packageCode: string,
  discountCode: string,
  packagePriceRials?: number,
): Promise<{ resolved: boolean; result: GuidanceDiscountPreviewState }> {
  const { plan } = await requireGuidanceV2StepAccess(10);
  const normalizedPackage = parseGuidanceV2PreviewPackageCode(packageCode);
  if (!normalizedPackage) {
    return {
      resolved: false,
      result: { ok: false, error: "بسته انتخاب‌شده معتبر نیست." },
    };
  }
  const priceRials = lookupKnownGuidancePackagePriceRials(
    normalizedPackage,
    packagePriceRials,
  );
  if (priceRials == null) {
    return {
      resolved: false,
      result: { ok: false, error: "بسته انتخاب‌شده معتبر نیست." },
    };
  }
  const quote = await quoteGuidancePackageDiscount({
    organizationId: plan.organizationId,
    packageCode: normalizedPackage,
    packagePriceRials: priceRials,
    discountCode,
  });
  if (!quote.ok) {
    return {
      resolved: quote.error !== "کد تخفیف معتبر نیست.",
      result: quote,
    };
  }
  return {
    resolved: true,
    result: {
      ok: true,
      code: quote.code,
      label: discountPreviewLabel(quote.code, quote.source),
      discountRials: quote.discountRials,
      finalAmountRials: quote.finalAmountRials,
      packageCode: normalizedPackage,
      source: quote.source,
    },
  };
}

export async function resolveGuidanceCheckoutDiscount(params: {
  organizationId: string;
  packageCode: string;
  packagePriceRials: number;
  discountCode?: string | null;
}) {
  const raw = params.discountCode?.trim() ?? "";
  if (!raw) {
    return {
      ok: true as const,
      discountCode: null as string | null,
      discountId: null as string | null,
      discountRials: 0,
      finalAmountRials: params.packagePriceRials,
      source: "none" as const,
    };
  }
  const quote = await quoteGuidancePackageDiscount({
    organizationId: params.organizationId,
    packageCode: params.packageCode,
    packagePriceRials: params.packagePriceRials,
    discountCode: raw,
  });
  if (!quote.ok) return quote;
  return {
    ok: true as const,
    discountCode: quote.code,
    discountId: quote.discountId,
    discountRials: quote.discountRials,
    finalAmountRials: quote.finalAmountRials,
    source: quote.source,
  };
}
