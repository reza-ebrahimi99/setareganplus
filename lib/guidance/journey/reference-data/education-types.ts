/**
 * Guidance Journey Engine Step 6 — education/enrollment type catalog.
 * Static reference data (same convention as onboarding-options.ts) — no DB table.
 */

export const GUIDANCE_EDUCATION_TYPES = [
  { code: "DAILY", label: "روزانه" },
  { code: "NIGHT", label: "شبانه (نوبت دوم)" },
  { code: "SELF_FUNDED", label: "ظرفیت مازاد / شهریه‌پرداز" },
  { code: "AZAD", label: "دانشگاه آزاد اسلامی" },
  { code: "PAYAM_NOOR", label: "پیام نور" },
  { code: "NON_PROFIT", label: "غیرانتفاعی" },
  { code: "APPLIED_SCIENCE", label: "علمی-کاربردی" },
  { code: "VIRTUAL", label: "مجازی" },
  { code: "INTERNATIONAL", label: "پردیس بین‌المللی" },
  { code: "TEACHER_TRAINING", label: "دانشگاه فرهنگیان (تربیت معلم)" },
] as const;

export type GuidanceEducationTypeCode =
  (typeof GUIDANCE_EDUCATION_TYPES)[number]["code"];

export function isGuidanceEducationTypeCode(
  value: string,
): value is GuidanceEducationTypeCode {
  return GUIDANCE_EDUCATION_TYPES.some((t) => t.code === value);
}

export function guidanceEducationTypeLabel(code: string): string {
  return GUIDANCE_EDUCATION_TYPES.find((t) => t.code === code)?.label ?? code;
}
