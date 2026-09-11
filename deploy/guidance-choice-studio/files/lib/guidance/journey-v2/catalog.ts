/**
 * Guidance Journey V2 — 18-step catalog and path helper.
 * Production-compatible superset of journey-v2/steps exports used by steps 1–10 UI.
 */

export const GUIDANCE_V2_STEP_COUNT = 18 as const;

export type GuidanceV2StepId =
  | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
  | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18;

export type GuidanceV2StepDefinition = {
  id: GuidanceV2StepId;
  title: string;
  shortTitle: string;
  description: string;
};

export const GUIDANCE_V2_STEPS: readonly GuidanceV2StepDefinition[] = [
  { id: 1, title: "ثبت اطلاعات اولیه", shortTitle: "اطلاعات اولیه", description: "هویت، تماس و سهمیه" },
  { id: 2, title: "گروه‌های آزمایشی", shortTitle: "گروه آزمایشی", description: "گروه اصلی و گروه‌های فرعی" },
  { id: 3, title: "نمرات نهایی و کارنامه", shortTitle: "نمرات نهایی", description: "سوابق تحصیلی و کارنامه" },
  { id: 4, title: "آزمون رغبت‌سنجی", shortTitle: "رغبت‌سنجی", description: "آزمون هالند" },
  { id: 5, title: "نتیجه رغبت‌سنجی", shortTitle: "نتیجه رغبت", description: "گزارش شش بُعد" },
  { id: 6, title: "اولویت دوره‌های تحصیلی", shortTitle: "نوع دوره", description: "روزانه، شبانه و سایر دوره‌ها" },
  { id: 7, title: "اولویت استان‌ها", shortTitle: "استان‌ها", description: "شهر و استان مورد علاقه" },
  { id: 8, title: "اولویت رشته‌ها", shortTitle: "رشته‌ها", description: "رشته‌های مورد علاقه" },
  { id: 9, title: "معیارهای اولویت‌بندی", shortTitle: "معیارها", description: "وزن رشته، شهر و نوع دوره" },
  { id: 10, title: "انتخاب پلن و پرداخت", shortTitle: "پلن و پرداخت", description: "بسته انتخاب رشته" },
  { id: 11, title: "رزرو جلسه اول", shortTitle: "جلسه اول", description: "رزرو جلسه مشاوره با مشاور پرونده" },
  { id: 12, title: "نتایج کنکور", shortTitle: "نتایج کنکور", description: "ثبت کارنامه و رتبه‌های آزمون" },
  { id: 13, title: "استودیوی چیدمان انتخاب رشته", shortTitle: "چیدمان مشاور", description: "آماده‌سازی نسخه اولیه غیرنهایی توسط مشاور" },
  { id: 14, title: "بررسی نسخه اولیه انتخاب رشته", shortTitle: "بررسی چیدمان", description: "بازخورد دانش‌آموز روی نسخه اولیه غیرنهایی" },
  { id: 15, title: "رزرو جلسه دوم", shortTitle: "جلسه دوم", description: "جلسه نهایی بررسی انتخاب‌ها" },
  { id: 16, title: "استودیوی اصلاح نهایی", shortTitle: "اصلاحات", description: "نسخه اصلاح‌شده پس از جلسه دوم" },
  { id: 17, title: "تأیید نهایی انتخاب رشته", shortTitle: "تأیید", description: "تأیید آگاهانه نسخه نهایی — ثبت سنجش جداگانه است" },
  { id: 18, title: "حالت ثبت سنجش", shortTitle: "ثبت سنجش", description: "ثبت دستی در سامانه رسمی سازمان سنجش و تأیید رسید" },
];

export function isGuidanceV2StepId(value: unknown): value is GuidanceV2StepId {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= GUIDANCE_V2_STEP_COUNT
  );
}

export function parseGuidanceV2StepParam(raw: string): GuidanceV2StepId | null {
  if (!/^\d+$/.test(raw)) return null;
  const value = Number(raw);
  return isGuidanceV2StepId(value) ? value : null;
}

export function getGuidanceV2StepDefinition(id: GuidanceV2StepId): GuidanceV2StepDefinition {
  const step = GUIDANCE_V2_STEPS.find((s) => s.id === id);
  if (!step) throw new Error(`Unknown V2 step: ${id}`);
  return step;
}

export function guidanceJourneyV2StepPath(id: number): string {
  return `/portal/student/services/guidance/journey/steps/${id}`;
}

export function guidanceV2StepCompletedStatus(
  id: GuidanceV2StepId,
): `STEP${GuidanceV2StepId}_COMPLETED` {
  return `STEP${id}_COMPLETED` as `STEP${GuidanceV2StepId}_COMPLETED`;
}
