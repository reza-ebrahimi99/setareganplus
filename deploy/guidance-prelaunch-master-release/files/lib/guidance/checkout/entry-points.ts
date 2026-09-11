/**
 * Canonical checkout entry aliases. All paths reuse the same discount engine.
 * Browser-supplied prices are ignored.
 */

export const GUIDANCE_PACKAGE_ENTRY_POINTS = [
  "step10",
  "dashboard-plans",
  "direct-plans",
] as const;

export type GuidancePackageEntryPoint =
  (typeof GUIDANCE_PACKAGE_ENTRY_POINTS)[number];

export function isGuidancePackageEntryPoint(
  value: string,
): value is GuidancePackageEntryPoint {
  return (GUIDANCE_PACKAGE_ENTRY_POINTS as readonly string[]).includes(value);
}

export function normalizeGuidanceCheckoutEntry(
  value: string | null | undefined,
): GuidancePackageEntryPoint {
  if (value && isGuidancePackageEntryPoint(value)) return value;
  return "step10";
}
