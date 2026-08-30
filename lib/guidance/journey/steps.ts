/**
 * Guidance Journey Engine — canonical 12-step registry (Phase 1).
 *
 * Single source of truth for step order, titles, and routing. Nothing here
 * decides access — see `lib/guidance/journey/guard.ts` for server enforcement.
 */

import type { PortalIconName } from "@/components/portal/icons";

export const GUIDANCE_JOURNEY_STEP_COUNT = 12 as const;

export type GuidanceJourneyStepId =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12;

export type GuidanceJourneyStepKey =
  | "personal_info"
  | "interest_assessment"
  | "registration_payment"
  | "first_session"
  | "exam_results"
  | "education_preferences"
  | "city_preferences"
  | "major_preferences"
  | "priority_weights"
  | "ai_arrangement"
  | "second_session"
  | "final_approval";

export type GuidanceJourneyStepDefinition = {
  id: GuidanceJourneyStepId;
  key: GuidanceJourneyStepKey;
  title: string;
  shortTitle: string;
  description: string;
  icon: PortalIconName;
};

export const GUIDANCE_JOURNEY_STEPS: readonly GuidanceJourneyStepDefinition[] = [
  {
    id: 1,
    key: "personal_info",
    title: "اطلاعات فردی",
    shortTitle: "اطلاعات فردی",
    description: "هویت، تماس، سهمیه و کارنامه نهایی",
    icon: "user",
  },
  {
    id: 2,
    key: "interest_assessment",
    title: "آزمون سنجش رغبت",
    shortTitle: "سنجش رغبت",
    description: "شناسایی پروفایل شخصیتی و رشته‌های مناسب",
    icon: "spark",
  },
  {
    id: 3,
    key: "registration_payment",
    title: "ثبت‌نام و پرداخت",
    shortTitle: "ثبت‌نام",
    description: "انتخاب بسته مشاوره و پرداخت آنلاین",
    icon: "shield",
  },
  {
    id: 4,
    key: "first_session",
    title: "جلسه اول مشاوره",
    shortTitle: "جلسه اول",
    description: "رزرو نوبت با مشاور تخصصی",
    icon: "calendar",
  },
  {
    id: 5,
    key: "exam_results",
    title: "نتایج آزمون سنجش",
    shortTitle: "نتایج آزمون",
    description: "ثبت رتبه و کارنامه رسمی سنجش",
    icon: "chart",
  },
  {
    id: 6,
    key: "education_preferences",
    title: "ترجیحات نوع آموزش",
    shortTitle: "نوع آموزش",
    description: "روزانه، شبانه، غیرانتفاعی و سایر دوره‌ها",
    icon: "layers",
  },
  {
    id: 7,
    key: "city_preferences",
    title: "ترجیحات جغرافیایی",
    shortTitle: "شهر و استان",
    description: "استان‌ها و شهرهای مورد قبول",
    icon: "grid",
  },
  {
    id: 8,
    key: "major_preferences",
    title: "ترجیحات رشته",
    shortTitle: "رشته‌ها",
    description: "رشته‌های متناسب با گروه آزمایشی",
    icon: "book",
  },
  {
    id: 9,
    key: "priority_weights",
    title: "وزن‌دهی اولویت‌ها",
    shortTitle: "وزن‌دهی",
    description: "اهمیت رشته، دانشگاه، شهر و سایر عوامل",
    icon: "medal",
  },
  {
    id: 10,
    key: "ai_arrangement",
    title: "چیدمان هوشمند انتخاب رشته",
    shortTitle: "چیدمان هوشمند",
    description: "خروجی ساختاریافته و بررسی مشاور",
    icon: "route",
  },
  {
    id: 11,
    key: "second_session",
    title: "جلسه دوم مشاوره",
    shortTitle: "جلسه دوم",
    description: "بازبینی چیدمان با مشاور",
    icon: "users",
  },
  {
    id: 12,
    key: "final_approval",
    title: "تأیید نهایی",
    shortTitle: "تأیید نهایی",
    description: "تأیید دیجیتال و آرشیو نهایی پرونده",
    icon: "trophy",
  },
];

export function isGuidanceJourneyStepId(
  value: unknown,
): value is GuidanceJourneyStepId {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= GUIDANCE_JOURNEY_STEP_COUNT
  );
}

/** Parses a route segment (string) into a valid step id, or null. */
export function parseGuidanceJourneyStepParam(
  raw: string,
): GuidanceJourneyStepId | null {
  if (!/^\d+$/.test(raw)) return null;
  const value = Number(raw);
  return isGuidanceJourneyStepId(value) ? value : null;
}

export function getGuidanceJourneyStepDefinition(
  id: GuidanceJourneyStepId,
): GuidanceJourneyStepDefinition {
  const step = GUIDANCE_JOURNEY_STEPS.find((s) => s.id === id);
  if (!step) {
    throw new Error(`Unknown guidance journey step id: ${id}`);
  }
  return step;
}

export function guidanceJourneyStepPath(id: GuidanceJourneyStepId): string {
  return `/portal/student/services/guidance/steps/${id}`;
}

/** Plan.status enum value written when a step is completed. */
export function guidanceStepCompletedStatus(
  id: GuidanceJourneyStepId,
): `STEP${GuidanceJourneyStepId}_COMPLETED` {
  return `STEP${id}_COMPLETED` as `STEP${GuidanceJourneyStepId}_COMPLETED`;
}
