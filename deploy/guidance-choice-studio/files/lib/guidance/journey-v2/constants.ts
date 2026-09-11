import { GUIDANCE_QUOTA_OPTIONS } from "@/lib/guidance/journey/reference-data/quota";

export const V2_INFORMED_ACK_VERSION = "informed-v1" as const;

export type GuidanceExamGroup =
  | "MATHEMATICS"
  | "EXPERIMENTAL_SCIENCES"
  | "HUMANITIES"
  | "ARTS"
  | "LANGUAGES";

export function normalizeGuidanceExamGroup(
  value: string | GuidanceExamGroup,
): GuidanceExamGroup {
  switch (value) {
    case "MATHEMATICS":
    case "EXPERIMENTAL_SCIENCES":
    case "HUMANITIES":
    case "ARTS":
    case "LANGUAGES":
      return value;
    default:
      return "MATHEMATICS";
  }
}

export const MAX_GUIDANCE_CHOICES = 150 as const;

export const APPOINTMENT_PURPOSE = {
  FIRST_SESSION: "FIRST_SESSION",
  SECOND_SESSION: "SECOND_SESSION",
} as const;

export type AppointmentPurpose =
  (typeof APPOINTMENT_PURPOSE)[keyof typeof APPOINTMENT_PURPOSE];

export const CHOICE_LIST_KIND = {
  INITIAL: "INITIAL",
  FINAL: "FINAL",
} as const;

export type ChoiceListKind = (typeof CHOICE_LIST_KIND)[keyof typeof CHOICE_LIST_KIND];

export const CHOICE_LIST_STATUS = {
  DRAFT: "DRAFT",
  READY: "READY",
  SUPERSEDED: "SUPERSEDED",
  CONFIRMED: "CONFIRMED",
} as const;

export type ChoiceListStatus =
  (typeof CHOICE_LIST_STATUS)[keyof typeof CHOICE_LIST_STATUS];

/** Canonical Chance Studio labels. Legacy band ids remain readable. */
export const CHOICE_CHANCE_CANONICAL = [
  { id: "very_low", label: "خیلی کم" },
  { id: "low", label: "کم" },
  { id: "medium", label: "متوسط" },
  { id: "good", label: "خوب" },
  { id: "very_good", label: "خیلی خوب" },
] as const;

export const CHOICE_BANDS = [
  ...CHOICE_CHANCE_CANONICAL,
  { id: "optimistic", label: "خیلی خوب" },
  { id: "balanced", label: "متوسط" },
  { id: "likely", label: "خوب" },
  { id: "conservative", label: "خیلی کم" },
] as const;

export type ChoiceBandId = (typeof CHOICE_BANDS)[number]["id"];

export const CHOICE_FEEDBACK_VERDICTS = [
  { id: "approved", label: "موافقم" },
  { id: "needs_review", label: "نیاز به بررسی" },
  { id: "less", label: "تمایل به جابه‌جایی (پایین‌تر)" },
  { id: "more", label: "تمایل به جابه‌جایی (بالاتر)" },
  { id: "remove", label: "تمایل به حذف" },
] as const;

export type ChoiceFeedbackVerdict = (typeof CHOICE_FEEDBACK_VERDICTS)[number]["id"];

export const SANJESH_STATUS = {
  NOT_SUBMITTED: "NOT_SUBMITTED",
  DECLARED: "DECLARED",
  PENDING_REVIEW: "PENDING_REVIEW",
  VERIFIED: "VERIFIED",
  NEEDS_FIX: "NEEDS_FIX",
} as const;

export type SanjeshStatus = (typeof SANJESH_STATUS)[keyof typeof SANJESH_STATUS];

export const KONKUR_CATEGORY = "guidance-journey-v2-step12";
export const KONKUR_KIND = "guidance-journey-v2-step12";

/** Read-only Step 2 store key. Step 12 loads this; it never writes Step 2. */
export const V2_STEP2_CATEGORY = "guidance-journey-v2-step2";
export const V2_STEP2_KIND = "guidance-journey-v2-step2";

/**
 * Step 12 quota codes. Includes Sanjesh regions 1–3 plus the existing
 * admission-quota types. Step 1 still uses GUIDANCE_QUOTA_OPTIONS unchanged.
 */
export const KONKUR_REGION_QUOTA_OPTIONS = [
  { id: "REGION_1", label: "منطقه ۱" },
  { id: "REGION_2", label: "منطقه ۲" },
  { id: "REGION_3", label: "منطقه ۳" },
] as const;

export const KONKUR_QUOTA_OPTIONS = [
  ...KONKUR_REGION_QUOTA_OPTIONS,
  ...GUIDANCE_QUOTA_OPTIONS,
] as const;

export type KonkurQuotaId = (typeof KONKUR_QUOTA_OPTIONS)[number]["id"];

export function isKonkurQuotaId(value: string): value is KonkurQuotaId {
  return KONKUR_QUOTA_OPTIONS.some((option) => option.id === value);
}

export function konkurQuotaLabel(value: string): string {
  return KONKUR_QUOTA_OPTIONS.find((option) => option.id === value)?.label ?? value;
}

export const KONKUR_PARTICIPATION = [
  { id: "participated", label: "شرکت کرده و نتیجه دارم" },
  { id: "absent", label: "در آزمون شرکت نکرده‌ام" },
  { id: "waiting", label: "نتیجه هنوز اعلام نشده" },
] as const;

export type KonkurParticipationId = (typeof KONKUR_PARTICIPATION)[number]["id"];

export const ACTIVE_APPOINTMENT_STATUSES = [
  "BOOKED",
  "CONFIRMED",
  "COMPLETED",
] as const;
