/**
 * Guidance Journey Engine Step 8 — majors catalog, scoped strictly by exam
 * group (spec: "Student sees majors available ONLY for exam group").
 * Static reference data (same convention as onboarding-options.ts) — no DB
 * table.
 */

import type { GuidanceExamGroup } from "@/lib/guidance/types";

export type GuidanceMajorOption = {
  code: string;
  label: string;
};

export const GUIDANCE_MAJORS_BY_EXAM_GROUP: Record<
  GuidanceExamGroup,
  readonly GuidanceMajorOption[]
> = {
  MATHEMATICS: [
    { code: "COMPUTER_ENGINEERING", label: "مهندسی کامپیوتر" },
    { code: "ELECTRICAL_ENGINEERING", label: "مهندسی برق" },
    { code: "CIVIL_ENGINEERING", label: "مهندسی عمران" },
    { code: "MECHANICAL_ENGINEERING", label: "مهندسی مکانیک" },
    { code: "INDUSTRIAL_ENGINEERING", label: "مهندسی صنایع" },
    { code: "CHEMICAL_ENGINEERING", label: "مهندسی شیمی" },
    { code: "ARCHITECTURE_ENGINEERING", label: "مهندسی معماری" },
    { code: "AEROSPACE_ENGINEERING", label: "مهندسی هوافضا" },
    { code: "PURE_MATHEMATICS", label: "ریاضی محض" },
    { code: "PHYSICS", label: "فیزیک" },
    { code: "STATISTICS", label: "آمار" },
    { code: "COMPUTER_SCIENCE", label: "علوم کامپیوتر" },
  ],
  EXPERIMENTAL_SCIENCES: [
    { code: "MEDICINE", label: "پزشکی" },
    { code: "DENTISTRY", label: "دندانپزشکی" },
    { code: "PHARMACY", label: "داروسازی" },
    { code: "VETERINARY", label: "دامپزشکی" },
    { code: "NURSING", label: "پرستاری" },
    { code: "MIDWIFERY", label: "مامایی" },
    { code: "LAB_SCIENCES", label: "علوم آزمایشگاهی" },
    { code: "NUTRITION", label: "تغذیه" },
    { code: "OPTOMETRY", label: "بینایی‌سنجی" },
    { code: "PHYSIOTHERAPY", label: "فیزیوتراپی" },
    { code: "BIOLOGY", label: "زیست‌شناسی" },
    { code: "CHEMISTRY", label: "شیمی" },
  ],
  HUMANITIES: [
    { code: "LAW", label: "حقوق" },
    { code: "PSYCHOLOGY", label: "روان‌شناسی" },
    { code: "EDUCATIONAL_SCIENCES", label: "علوم تربیتی" },
    { code: "MANAGEMENT", label: "مدیریت" },
    { code: "ACCOUNTING", label: "حسابداری" },
    { code: "ECONOMICS", label: "اقتصاد" },
    { code: "POLITICAL_SCIENCE", label: "علوم سیاسی" },
    { code: "SOCIOLOGY", label: "جامعه‌شناسی" },
    { code: "HISTORY", label: "تاریخ" },
    { code: "PHILOSOPHY", label: "فلسفه" },
    { code: "PERSIAN_LITERATURE", label: "زبان و ادبیات فارسی" },
    { code: "THEOLOGY", label: "الهیات" },
  ],
  ARTS: [
    { code: "PAINTING", label: "نقاشی" },
    { code: "GRAPHIC_DESIGN", label: "گرافیک" },
    { code: "INTERIOR_ARCHITECTURE", label: "معماری داخلی" },
    { code: "CINEMA", label: "سینما" },
    { code: "MUSIC", label: "موسیقی" },
    { code: "VISUAL_COMMUNICATION", label: "ارتباط تصویری" },
    { code: "HANDICRAFTS", label: "صنایع دستی" },
    { code: "PHOTOGRAPHY", label: "عکاسی" },
    { code: "ANIMATION", label: "انیمیشن" },
  ],
  LANGUAGES: [
    { code: "ENGLISH_TRANSLATION", label: "مترجمی زبان انگلیسی" },
    { code: "ENGLISH_LITERATURE", label: "زبان و ادبیات انگلیسی" },
    { code: "FRENCH_TRANSLATION", label: "مترجمی زبان فرانسه" },
    { code: "GERMAN_LITERATURE", label: "زبان و ادبیات آلمانی" },
    { code: "ENGLISH_TEACHING", label: "آموزش زبان انگلیسی" },
  ],
};

export function getMajorsForExamGroup(
  examGroup: GuidanceExamGroup,
): readonly GuidanceMajorOption[] {
  return GUIDANCE_MAJORS_BY_EXAM_GROUP[examGroup] ?? [];
}

export const GUIDANCE_EXAM_GROUP_LABELS: Record<GuidanceExamGroup, string> = {
  MATHEMATICS: "ریاضی و فیزیک",
  EXPERIMENTAL_SCIENCES: "علوم تجربی",
  HUMANITIES: "علوم انسانی",
  ARTS: "هنر",
  LANGUAGES: "زبان‌های خارجی",
};
