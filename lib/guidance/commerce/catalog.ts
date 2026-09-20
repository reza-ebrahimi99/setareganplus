/**
 * Guidance commerce catalog — canonical prices in RIALS (UI shows Toman via rialToToman).
 * Legacy package codes remain resolvable for historical orders; not sold on new checkout.
 */

export const GUIDANCE_COMMERCE_CODES = {
  PREMIUM: "PREMIUM",
  FARHANGIAN: "FARHANGIAN",
  FARHANGIAN_ADDON: "FARHANGIAN_ADDON",
} as const;

export type GuidanceSellableBaseCode =
  | typeof GUIDANCE_COMMERCE_CODES.PREMIUM
  | typeof GUIDANCE_COMMERCE_CODES.FARHANGIAN;

export const GUIDANCE_PRICE_RIALS = {
  PREMIUM: 79_000_000,
  FARHANGIAN: 47_000_000,
  FARHANGIAN_ADDON: 23_000_000,
} as const;

/** Legacy V2 codes — keep IDs stable; hidden from new-sale UI. */
export const GUIDANCE_LEGACY_V2_PACKAGE_CODES = [
  "START",
  "SMART",
  "SPECIALIZED",
] as const;

export type GuidanceLegacyV2PackageCode =
  (typeof GUIDANCE_LEGACY_V2_PACKAGE_CODES)[number];

export function isGuidanceSellableBaseCode(
  value: string,
): value is GuidanceSellableBaseCode {
  return (
    value === GUIDANCE_COMMERCE_CODES.PREMIUM ||
    value === GUIDANCE_COMMERCE_CODES.FARHANGIAN
  );
}

export function isGuidanceLegacyFreePackageCode(code: string | null | undefined): boolean {
  return (code ?? "").trim().toUpperCase() === "START";
}

export function isGuidanceLegacyPaidPackageCode(code: string | null | undefined): boolean {
  const normalized = (code ?? "").trim().toUpperCase();
  return (
    normalized === "SMART" ||
    normalized === "SPECIALIZED" ||
    normalized === "PREMIUM" ||
    normalized === GUIDANCE_COMMERCE_CODES.FARHANGIAN
  );
}

export function legacyPackagePriceRials(code: string): number | null {
  switch (code.trim().toUpperCase()) {
    case "START":
      return 0;
    case "SMART":
      return 43_000_000;
    case "SPECIALIZED":
      return 57_000_000;
    case "PREMIUM":
      return GUIDANCE_PRICE_RIALS.PREMIUM;
    default:
      return null;
  }
}
