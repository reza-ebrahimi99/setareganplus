import type { AssessmentType } from "@/generated/prisma/client";

export const ASSESSMENT_TYPE_LABELS: Record<AssessmentType, string> = {
  QALAMCHI: "قلم‌چی",
  SCHOOL_EXAM: "آزمون مدرسه",
  MIDTERM: "میان‌ترم",
  FINAL: "پایان‌ترم",
  OLYMPIAD: "المپیاد",
  ENTRANCE: "ورودی",
  OTHER: "سایر",
};

export const ASSESSMENT_TYPES = Object.keys(
  ASSESSMENT_TYPE_LABELS,
) as AssessmentType[];

export function isAssessmentType(value: string): value is AssessmentType {
  return value in ASSESSMENT_TYPE_LABELS;
}
