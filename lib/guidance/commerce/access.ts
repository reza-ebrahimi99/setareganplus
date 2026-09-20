/**
 * Central commercial entitlement matrix for Guidance V2.
 */

import {
  GUIDANCE_COMMERCE_CODES,
  isGuidanceLegacyFreePackageCode,
  isGuidanceLegacyPaidPackageCode,
} from "@/lib/guidance/commerce/catalog";
const GUIDANCE_ARRANGEMENT_STEPS = [13, 14, 16, 17, 18] as const;

function isArrangementStep(stepId: number): boolean {
  return (GUIDANCE_ARRANGEMENT_STEPS as readonly number[]).includes(stepId);
}

export const GUIDANCE_COMMERCIAL_PAYWALL_MESSAGE =
  "برای ادامه این مرحله و رزرو جلسه، ابتدا یکی از بسته‌های خدمات انتخاب رشته را تهیه و پرداخت کنید.";

export const GUIDANCE_COMMERCIAL_PAYWALL_CTA = "مشاهده و خرید بسته‌ها";

export type GuidanceCommercialProfile = {
  packageCode: string | null;
  packageAddons: readonly string[];
  packagePaidAtIso: string | null;
};

export function parseGuidancePackageAddons(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .map((v) => v.trim().toUpperCase());
}

export function profileHasFarhangianAddon(profile: GuidanceCommercialProfile): boolean {
  if (profile.packageCode === GUIDANCE_COMMERCE_CODES.FARHANGIAN) return true;
  return profile.packageAddons.includes(GUIDANCE_COMMERCE_CODES.FARHANGIAN_ADDON);
}

export function profileHasPremiumTrack(profile: GuidanceCommercialProfile): boolean {
  const code = (profile.packageCode ?? "").trim().toUpperCase();
  if (!code) return false;
  if (code === GUIDANCE_COMMERCE_CODES.PREMIUM) return true;
  if (code === "SMART" || code === "SPECIALIZED") return true;
  return false;
}

export function hasValidGuidanceCommercialPurchase(
  profile: GuidanceCommercialProfile,
): boolean {
  if (!profile.packagePaidAtIso) return false;
  const code = (profile.packageCode ?? "").trim().toUpperCase();
  if (!code || isGuidanceLegacyFreePackageCode(code)) return false;
  if (isGuidanceLegacyPaidPackageCode(code)) return true;
  if (code === GUIDANCE_COMMERCE_CODES.PREMIUM) return true;
  if (code === GUIDANCE_COMMERCE_CODES.FARHANGIAN) return true;
  return false;
}

/** 150-choice / counselor arrangement workflow (premium track). */
export function packageIncludesArrangement(
  packageCode: string | null | undefined,
  packageAddons: readonly string[] = [],
): boolean {
  const profile: GuidanceCommercialProfile = {
    packageCode: packageCode ?? null,
    packageAddons,
    packagePaidAtIso: "legacy-check",
  };
  return profileHasPremiumTrack(profile);
}

export function assertGuidanceCommercialAccess(params: {
  profile: GuidanceCommercialProfile;
  stepId?: number;
}): { ok: true } | { ok: false; error: string } {
  if (!hasValidGuidanceCommercialPurchase(params.profile)) {
    return { ok: false, error: GUIDANCE_COMMERCIAL_PAYWALL_MESSAGE };
  }
  if (params.stepId != null && isArrangementStep(params.stepId)) {
    if (!packageIncludesArrangement(params.profile.packageCode, params.profile.packageAddons)) {
      return {
        ok: false,
        error:
          "این بخش از مسیر فقط برای بسته ممتاز (یا بسته‌های پولی معادل قبلی) فعال است.",
      };
    }
  }
  return { ok: true };
}

export function assertGuidanceCounselorBookingAccess(params: {
  profile: GuidanceCommercialProfile;
}): { ok: true } | { ok: false; error: string } {
  return assertGuidanceCommercialAccess({ profile: params.profile });
}
