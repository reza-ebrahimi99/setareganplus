/**
 * Package feature entitlements — re-exports commercial matrix + arrangement steps.
 */

import { packageIncludesArrangement } from "@/lib/guidance/commerce/access";

export {
  packageIncludesArrangement,
  hasValidGuidanceCommercialPurchase,
  assertGuidanceCommercialAccess,
  assertGuidanceCounselorBookingAccess,
  GUIDANCE_COMMERCIAL_PAYWALL_MESSAGE,
  GUIDANCE_COMMERCIAL_PAYWALL_CTA,
  type GuidanceCommercialProfile,
  parseGuidancePackageAddons,
} from "@/lib/guidance/commerce/access";

/** Premium-track packages that unlock arrangement (legacy + new PREMIUM). */
export const GUIDANCE_ARRANGEMENT_PACKAGE_CODES = [
  "SMART",
  "SPECIALIZED",
  "PREMIUM",
] as const;

export type GuidanceArrangementPackageCode =
  (typeof GUIDANCE_ARRANGEMENT_PACKAGE_CODES)[number];

export const GUIDANCE_ARRANGEMENT_STEPS = [13, 14, 16, 17, 18] as const;

export function isArrangementStep(stepId: number): boolean {
  return (GUIDANCE_ARRANGEMENT_STEPS as readonly number[]).includes(stepId);
}

export function assertArrangementEntitlement(params: {
  packageCode: string | null | undefined;
  packageAddons?: readonly string[];
  stepId: number;
}): { ok: true } | { ok: false; error: string } {
  if (!isArrangementStep(params.stepId)) return { ok: true };
  if (packageIncludesArrangement(params.packageCode, params.packageAddons ?? [])) {
    return { ok: true };
  }
  return {
    ok: false,
    error:
      "چیدمان مشاور و فهرست ۱۵۰ انتخاب در این بسته فعال نیست. برای ادامه بسته ممتاز (یا بسته پولی معادل) را تهیه کنید.",
  };
}
