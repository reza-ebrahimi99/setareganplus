/**
 * Student-facing discount preview/apply helpers for Step 10.
 * Does not talk to Zibal. Checkout still uses existing PaymentIntent flow.
 * Client-supplied prices are ignored — catalog is the only price source.
 */

import { quoteGuidancePackageDiscount } from "@/lib/guidance/discounts/quote";
import { loadGuidanceV2Entry } from "@/lib/guidance/journey-v2/guard";
import { resolveGuidancePayablePackage } from "@/lib/guidance/packages/resolve-payable";

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
      originalAmountRials: number;
      discountRials: number;
      finalAmountRials: number;
      packageCode: GuidanceV2PreviewPackageCode;
      source: "db" | "legacy";
    }
  | { ok: false; error: string };

export function lookupKnownGuidancePackagePriceRials(
  packageCode: string,
  _ignoredClientPrice?: number,
): number | null {
  const pkg = resolveGuidancePayablePackage(packageCode, { journeyVersion: 2 });
  if (!pkg || !pkg.requiresPayment) return null;
  return pkg.priceRials;
}

export async function previewManagedGuidanceDiscountForStudent(
  packageCode: string,
  discountCode: string,
  _ignoredClientPrice?: number,
): Promise<{ resolved: boolean; result: GuidanceDiscountPreviewState }> {
  const { plan } = await loadGuidanceV2Entry();
  const normalizedPackage = parseGuidanceV2PreviewPackageCode(packageCode);
  if (!normalizedPackage) {
    return {
      resolved: false,
      result: { ok: false, error: "بسته انتخاب‌شده معتبر نیست." },
    };
  }
  const pkg = resolveGuidancePayablePackage(normalizedPackage, { journeyVersion: 2 });
  if (!pkg || !pkg.requiresPayment) {
    return {
      resolved: false,
      result: { ok: false, error: "بسته انتخاب‌شده معتبر نیست." },
    };
  }
  const quote = await quoteGuidancePackageDiscount({
    organizationId: plan.organizationId,
    packageCode: pkg.code,
    packagePriceRials: pkg.priceRials,
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
      originalAmountRials: quote.originalAmountRials,
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
      originalAmountRials: params.packagePriceRials,
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
    originalAmountRials: quote.originalAmountRials,
    finalAmountRials: quote.finalAmountRials,
    source: quote.source,
  };
}
