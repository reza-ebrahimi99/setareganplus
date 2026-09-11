/**
 * Counselor OS copy of the V2 18-step catalog (display only).
 * Does not import production-only journey-v2 modules so local tsc stays green.
 */

export const COUNSELOR_V2_STEP_COUNT = 18 as const;

export type CounselorV2StepId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18;

export const COUNSELOR_V2_STEPS: readonly {
  id: CounselorV2StepId;
  title: string;
  shortTitle: string;
}[] = [
  { id: 1, title: "ثبت اطلاعات اولیه", shortTitle: "اطلاعات اولیه" },
  { id: 2, title: "گروه‌های آزمایشی", shortTitle: "گروه آزمایشی" },
  { id: 3, title: "نمرات نهایی و کارنامه", shortTitle: "نمرات نهایی" },
  { id: 4, title: "آزمون رغبت‌سنجی", shortTitle: "رغبت‌سنجی" },
  { id: 5, title: "نتیجه رغبت‌سنجی", shortTitle: "نتیجه رغبت" },
  { id: 6, title: "اولویت دوره‌های تحصیلی", shortTitle: "نوع دوره" },
  { id: 7, title: "اولویت استان‌ها", shortTitle: "استان‌ها" },
  { id: 8, title: "اولویت رشته‌ها", shortTitle: "رشته‌ها" },
  { id: 9, title: "معیارهای اولویت‌بندی", shortTitle: "معیارها" },
  { id: 10, title: "انتخاب پلن و پرداخت", shortTitle: "پلن و پرداخت" },
  { id: 11, title: "رزرو جلسه اول", shortTitle: "جلسه اول" },
  { id: 12, title: "نتایج کنکور", shortTitle: "نتایج کنکور" },
  { id: 13, title: "چیدمان توسط مشاور", shortTitle: "چیدمان مشاور" },
  { id: 14, title: "بررسی ۱۵۰ انتخاب", shortTitle: "بررسی چیدمان" },
  { id: 15, title: "رزرو جلسه دوم", shortTitle: "جلسه دوم" },
  { id: 16, title: "اصلاحات نهایی", shortTitle: "اصلاحات" },
  { id: 17, title: "تأیید آگاهانه", shortTitle: "تأیید" },
  { id: 18, title: "ثبت نهایی سنجش", shortTitle: "ثبت نهایی" },
];

export function counselorV2StepTitle(id: number): string {
  return COUNSELOR_V2_STEPS.find((s) => s.id === id)?.title ?? `مرحله ${id}`;
}

export function parseCompletedStepIds(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((v) => (typeof v === "number" ? v : Number(v)))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= COUNSELOR_V2_STEP_COUNT);
}
