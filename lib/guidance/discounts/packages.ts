/**
 * Discount-eligible guidance package codes.
 * Prices stay on the existing Step 10 catalog — this file is codes only.
 */

export const GUIDANCE_DISCOUNT_PACKAGE_CODES = [
  "SMART",
  "SPECIALIZED",
  "PREMIUM",
] as const;

export type GuidanceDiscountPackageCode =
  (typeof GUIDANCE_DISCOUNT_PACKAGE_CODES)[number];

export const GUIDANCE_DISCOUNT_PACKAGE_LABELS: Record<
  GuidanceDiscountPackageCode,
  string
> = {
  SMART: "هوشمند",
  SPECIALIZED: "تخصصی",
  PREMIUM: "ممتاز",
};

export function isGuidanceDiscountPackageCode(
  value: string,
): value is GuidanceDiscountPackageCode {
  return (GUIDANCE_DISCOUNT_PACKAGE_CODES as readonly string[]).includes(value);
}

export type GuidanceDiscountScope = "ALL" | GuidanceDiscountPackageCode[];

export function parsePackageScope(raw: string): GuidanceDiscountScope {
  const trimmed = raw.trim().toUpperCase();
  if (!trimmed || trimmed === "ALL") return "ALL";
  const parts = trimmed
    .split(/[,\s]+/)
    .map((part) => part.trim())
    .filter(isGuidanceDiscountPackageCode);
  return parts.length > 0 ? parts : "ALL";
}

export function serializePackageScope(scope: GuidanceDiscountScope): string {
  return scope === "ALL" ? "ALL" : scope.join(",");
}

export function scopeIncludesPackage(
  scope: GuidanceDiscountScope,
  packageCode: string,
): boolean {
  if (scope === "ALL") return true;
  return scope.includes(packageCode as GuidanceDiscountPackageCode);
}

export function scopeLabel(scope: GuidanceDiscountScope): string {
  if (scope === "ALL") return "همه بسته‌ها";
  return scope
    .map((code) => GUIDANCE_DISCOUNT_PACKAGE_LABELS[code] ?? code)
    .join("، ");
}
