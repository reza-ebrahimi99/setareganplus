import {
  CHOICE_BANDS,
  CHOICE_FEEDBACK_VERDICTS,
  SANJESH_STATUS,
  type AppointmentPurpose,
  type ChoiceBandId,
  type ChoiceFeedbackVerdict,
  type ChoiceListStatus,
  type SanjeshStatus,
} from "@/lib/guidance/journey-v2/constants";
import { GUIDANCE_EXAM_GROUP_LABELS } from "@/lib/guidance/journey/reference-data/majors";

const APPOINTMENT_PURPOSE_LABELS: Record<AppointmentPurpose, string> = {
  FIRST_SESSION: "جلسه اول مشاوره",
  SECOND_SESSION: "جلسه دوم / بررسی نهایی",
};

const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  BOOKED: "رزرو شده",
  CONFIRMED: "تأیید شده",
  COMPLETED: "انجام شده",
  CANCELLED_BY_STUDENT: "لغو توسط دانش‌آموز",
  CANCELLED_BY_COUNSELOR: "لغو توسط مشاور",
  NO_SHOW: "غیبت",
  PENDING: "در انتظار",
  CANCELLED: "لغو شده",
};

const LIST_STATUS_LABELS: Record<ChoiceListStatus, string> = {
  DRAFT: "پیش‌نویس",
  READY: "آماده بررسی",
  SUPERSEDED: "نسخه قبلی",
  CONFIRMED: "تأیید شده",
};

const SANJESH_LABELS: Record<SanjeshStatus, string> = {
  NOT_SUBMITTED: "ثبت نشده",
  DECLARED: "ثبت توسط اپراتور اعلام شده — در انتظار تأیید",
  PENDING_REVIEW: "ثبت توسط اپراتور اعلام شده — در انتظار تأیید",
  VERIFIED: "ثبت نهایی سنجش تأیید شده",
  NEEDS_FIX: "نیازمند اصلاح",
};

const ARRANGEMENT_STATE_LABELS = {
  WAITING: "در انتظار شروع چیدمان",
  IN_PROGRESS: "پیش‌نویس — در حال تنظیم",
  INITIAL_READY: "نسخه اولیه — غیرنهایی",
  NEEDS_INFO: "نیازمند تکمیل اطلاعات",
  REVIEW_READY: "نسخه اولیه — غیرنهایی",
  FINAL_IN_PROGRESS: "نسخه اصلاح‌شده — در حال آماده‌سازی",
  FINAL_READY: "نسخه نهایی مشاور — در انتظار تأیید دانش‌آموز",
  CONFIRMED: "نسخه تأییدشده — آماده ثبت سنجش",
} as const;

export function labelAppointmentPurpose(value: string | null | undefined): string {
  if (!value) return "جلسه مشاوره";
  return APPOINTMENT_PURPOSE_LABELS[value as AppointmentPurpose] ?? "جلسه مشاوره";
}

export function labelAppointmentStatus(value: string | null | undefined): string {
  if (!value) return "نامشخص";
  return APPOINTMENT_STATUS_LABELS[value] ?? "نامشخص";
}

export function labelChoiceBand(value: string | null | undefined): string {
  if (!value) return "—";
  return CHOICE_BANDS.find((b) => b.id === value)?.label ?? "—";
}

export function isChoiceBandId(value: string): value is ChoiceBandId {
  return CHOICE_BANDS.some((b) => b.id === value);
}

export function labelChoiceFeedback(value: string | null | undefined): string {
  if (!value) return "بررسی نشده";
  return CHOICE_FEEDBACK_VERDICTS.find((v) => v.id === value)?.label ?? "بررسی نشده";
}

export function isChoiceFeedbackVerdict(value: string): value is ChoiceFeedbackVerdict {
  return CHOICE_FEEDBACK_VERDICTS.some((v) => v.id === value);
}

export function labelChoiceListStatus(value: string | null | undefined): string {
  if (!value) return "شروع نشده";
  return LIST_STATUS_LABELS[value as ChoiceListStatus] ?? "شروع نشده";
}

export function labelSanjeshStatus(value: string | null | undefined): string {
  if (!value) return SANJESH_LABELS[SANJESH_STATUS.NOT_SUBMITTED];
  return SANJESH_LABELS[value as SanjeshStatus] ?? SANJESH_LABELS[SANJESH_STATUS.NOT_SUBMITTED];
}

export function labelArrangementState(
  key: keyof typeof ARRANGEMENT_STATE_LABELS,
): string {
  return ARRANGEMENT_STATE_LABELS[key];
}

export function labelKonkurGroupSection(
  examGroup: string,
  role: "primary" | "floating",
): string {
  const name =
    GUIDANCE_EXAM_GROUP_LABELS[examGroup as keyof typeof GUIDANCE_EXAM_GROUP_LABELS] ??
    examGroup;
  return role === "primary"
    ? `نتیجه گروه اصلی — ${name}`
    : `نتیجه گروه شناور — ${name}`;
}

export const KONKUR_FIELD_LABELS: Record<string, string> = {
  examGroup: "گروه آزمایشی",
  examYear: "سال آزمون",
  participationStatus: "وضعیت شرکت / نتیجه",
  quota: "سهمیه",
  quotaRank: "رتبه در سهمیه",
  nationalRank: "رتبه کشوری",
  totalScore: "نمره کل / تراز",
  academicRecordScore: "نمره کل سابقه تحصیلی",
  specificTestScore: "نمره کل آزمون اختصاصی",
  finalScore: "نمره کل نهایی",
  region: "منطقه / قطب",
  note: "توضیح",
};
