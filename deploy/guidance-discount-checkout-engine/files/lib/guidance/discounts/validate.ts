/**
 * Canonical server-side guidance discount validator.
 * Loads package price from the catalog — never from the client.
 */

import { quoteGuidancePackageDiscount } from "@/lib/guidance/discounts/quote";
import { resolveGuidancePayablePackage } from "@/lib/guidance/packages/resolve-payable";

export type GuidanceDiscountValidation =
  | {
      valid: true;
      code: string;
      packageCode: string;
      originalAmountRials: number;
      discountAmountRials: number;
      finalAmountRials: number;
      type: "FIXED_AMOUNT" | "PERCENTAGE";
      source: "db" | "legacy";
      discountId: string | null;
    }
  | { valid: false; error: string };

export async function validateGuidanceDiscount(params: {
  organizationId: string;
  code: string;
  packageCode: string;
  now?: Date;
}): Promise<GuidanceDiscountValidation> {
  const pkg = resolveGuidancePayablePackage(params.packageCode, { journeyVersion: 2 });
  if (!pkg || !pkg.requiresPayment) {
    return { valid: false, error: "بسته انتخاب‌شده معتبر نیست." };
  }

  const quote = await quoteGuidancePackageDiscount({
    organizationId: params.organizationId,
    packageCode: pkg.code,
    packagePriceRials: pkg.priceRials,
    discountCode: params.code,
    now: params.now,
  });
  if (!quote.ok) {
    return { valid: false, error: quote.error };
  }

  return {
    valid: true,
    code: quote.code,
    packageCode: pkg.code,
    originalAmountRials: quote.originalAmountRials,
    discountAmountRials: quote.discountRials,
    finalAmountRials: quote.finalAmountRials,
    type: quote.type,
    source: quote.source,
    discountId: quote.discountId,
  };
}
