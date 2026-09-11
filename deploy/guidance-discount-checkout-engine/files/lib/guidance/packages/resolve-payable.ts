/**
 * Canonical payable package resolver for Guidance checkout.
 * V2 Step 10 catalog wins for journeyVersion = 2.
 * Legacy Step-3 ESSENTIAL/PREMIUM remains for V1 only.
 */

import { GUIDANCE_V2_PACKAGES } from "@/lib/guidance/journey-v2/steps/step10-packages";
import { getGuidancePackage } from "@/lib/guidance/journey/packages";

export type GuidancePayablePackage = {
  code: string;
  title: string;
  priceRials: number;
  requiresPayment: boolean;
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

  const v2 = GUIDANCE_V2_PACKAGES.find((item) => item.code === normalized);
  if (version === 2) {
    if (!v2) return null;
    return {
      code: v2.code,
      title: v2.title,
      priceRials: v2.priceRials,
      requiresPayment: v2.requiresPayment,
    };
  }

  if (v2) {
    return {
      code: v2.code,
      title: v2.title,
      priceRials: v2.priceRials,
      requiresPayment: v2.requiresPayment,
    };
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

export function listDiscountPreviewPackages(): GuidancePayablePackage[] {
  return GUIDANCE_V2_PACKAGES.filter((item) => item.requiresPayment).map((item) => ({
    code: item.code,
    title: item.title,
    priceRials: item.priceRials,
    requiresPayment: true,
  }));
}
