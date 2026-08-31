/**
 * Student-facing intake continue targets (office rooms).
 * Does not change the 12-step engine; only where the continue button goes.
 */

export const MAJOR_OFFICE_IDENTITY = "/ms/identity";
export const MAJOR_OFFICE_ACADEMIC = "/ms/academic";
export const MAJOR_OFFICE_GRADES = "/ms/grades";
export const MAJOR_OFFICE_TRANSCRIPT = "/ms/transcript";

export type OfficeIntakeFlags = {
  hasIdentityProfile: boolean;
  hasAcademicProfile: boolean;
  finalExamComplete: boolean;
  hasTranscript: boolean;
};

export function nextOfficeIntakeHref(flags: OfficeIntakeFlags): string {
  if (!flags.hasIdentityProfile) return MAJOR_OFFICE_IDENTITY;
  if (!flags.hasAcademicProfile) return MAJOR_OFFICE_ACADEMIC;
  if (!flags.finalExamComplete) return MAJOR_OFFICE_GRADES;
  if (!flags.hasTranscript) return MAJOR_OFFICE_TRANSCRIPT;
  return MAJOR_OFFICE_IDENTITY;
}

export function officeIntakeContinueLabel(flags: OfficeIntakeFlags): string {
  if (!flags.hasIdentityProfile) return "بگویید کی هستید";
  if (!flags.hasAcademicProfile) return "کامل کردن تصویر تحصیلی";
  if (!flags.finalExamComplete) return "شناخت توانایی‌ها — ورود نمرات";
  if (!flags.hasTranscript) return "آخرین قطعه از تصویر تحصیلی";
  return "مرور تصویر شما";
}

export function officeIntakeProgressPercent(flags: OfficeIntakeFlags): number {
  const parts = [
    flags.hasIdentityProfile,
    flags.hasAcademicProfile,
    flags.finalExamComplete,
    flags.hasTranscript,
  ];
  return Math.round((parts.filter(Boolean).length / parts.length) * 100);
}
