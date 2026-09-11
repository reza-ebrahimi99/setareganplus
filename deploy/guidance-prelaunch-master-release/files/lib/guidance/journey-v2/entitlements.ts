/**
 * Package feature entitlements. Prices stay in step10-packages.ts.
 * Arrangement / 150-choice workflow is paid-only.
 */

export const GUIDANCE_ARRANGEMENT_PACKAGE_CODES = [
  "SMART",
  "SPECIALIZED",
  "PREMIUM",
] as const;

export type GuidanceArrangementPackageCode =
  (typeof GUIDANCE_ARRANGEMENT_PACKAGE_CODES)[number];

export const GUIDANCE_ARRANGEMENT_STEPS = [13, 14, 16, 17, 18] as const;

export function packageIncludesArrangement(code: string | null | undefined): boolean {
  const normalized = (code ?? "").trim().toUpperCase();
  return (GUIDANCE_ARRANGEMENT_PACKAGE_CODES as readonly string[]).includes(
    normalized,
  );
}

export function isArrangementStep(stepId: number): boolean {
  return (GUIDANCE_ARRANGEMENT_STEPS as readonly number[]).includes(stepId);
}

export function assertArrangementEntitlement(params: {
  packageCode: string | null | undefined;
  stepId: number;
}): { ok: true } | { ok: false; error: string } {
  if (!isArrangementStep(params.stepId)) return { ok: true };
  if (packageIncludesArrangement(params.packageCode)) return { ok: true };
  return {
    ok: false,
    error:
      "چیدمان مشاور و فهرست ۱۵۰ انتخاب در پلن رایگان فعال نیست. برای ادامه یکی از پلن‌های هوشمند، تخصصی یا ممتاز را تهیه کنید.",
  };
}
