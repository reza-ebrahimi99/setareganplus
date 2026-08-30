/**
 * Professional Counselor Workspace — pure presentation helpers (Phase 1).
 * No I/O. Safe for Node unit tests.
 */

import type { GuidanceJourneyStepId } from "@/lib/guidance/journey/steps";
import { GUIDANCE_JOURNEY_STEPS } from "@/lib/guidance/journey/steps";
import type { GuidanceJourneyStepStatus } from "@/lib/guidance/journey/types";
import { guidanceQuotaLabel } from "@/lib/guidance/journey/reference-data/quota";
import { guidanceEducationTypeLabel } from "@/lib/guidance/journey/reference-data/education-types";
import { GUIDANCE_PRIORITY_FACTORS } from "@/lib/guidance/journey/reference-data/priority-factors";
import { getMajorsForExamGroup } from "@/lib/guidance/journey/reference-data/majors";
import { ASSESSMENT_CATEGORIES } from "@/lib/guidance/journey/assessment/categories";
import type { AssessmentResult } from "@/lib/guidance/journey/assessment/scoring";
import type { GuidanceExamGroup } from "@/lib/guidance/types";
import { GUIDANCE_EXAM_GROUPS } from "@/lib/guidance/types";
import { getGuidancePackage } from "@/lib/guidance/journey/packages";
import type { CounselorReviewStatus } from "@/lib/guidance/counselor/types";
import { toPersianDigits } from "@/lib/persian";
import {
  WORKSPACE_QUEUE_FILTERS,
  type WorkspaceFieldRow,
  type WorkspaceQueueFilter,
  type WorkspaceQueueItem,
  type WorkspaceTranscriptStatus,
} from "@/lib/guidance/workspace/types";

const EXAM_GROUP_LABELS: Record<GuidanceExamGroup, string> = {
  MATHEMATICS: "ریاضی",
  EXPERIMENTAL_SCIENCES: "تجربی",
  HUMANITIES: "انسانی",
  ARTS: "هنر",
  LANGUAGES: "زبان",
};

const STEP_STATUS_LABELS: Record<GuidanceJourneyStepStatus, string> = {
  locked: "قفل",
  active: "فعال",
  completed: "تکمیل‌شده",
};

const TRANSCRIPT_LABELS: Record<WorkspaceTranscriptStatus, string> = {
  none: "بدون کارنامه",
  pending: "در انتظار تأیید",
  verified: "تأیید شده",
  rejected: "رد شده",
};

const VERIFY_LABELS: Record<string, string> = {
  PENDING: "در انتظار تأیید",
  VERIFIED: "تأیید شده",
  REJECTED: "رد شده",
};

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  FINAL_GRADES: "کارنامه نهایی",
  EXAM_RESULT: "کارنامه سنجش",
};

const REVIEW_STATUS_LABELS: Record<CounselorReviewStatus, string> = {
  awaiting_review: "در انتظار بررسی",
  in_review: "در حال بررسی",
  needs_correction: "نیاز به اصلاح",
  ready_for_session: "آماده جلسه",
};

const AUDIT_ACTION_LABELS: Record<string, string> = {
  GUIDANCE_STEP_ADVANCED: "پیشرفت مرحله",
  GUIDANCE_PAYMENT_STARTED: "شروع پرداخت",
  GUIDANCE_PAYMENT_COMPLETED: "پرداخت تکمیل شد",
  GUIDANCE_BOOKING_RESERVED: "رزرو جلسه مشاوره",
  GUIDANCE_MAJOR_CHOICES_IMPORTED: "ورود گزینه‌های چیدمان",
  GUIDANCE_MAJOR_CHOICES_APPROVED: "تأیید گزینه‌های چیدمان",
  GUIDANCE_JOURNEY_APPROVED: "تأیید نهایی سفر",
  GUIDANCE_STATUS_CHANGED: "به‌روزرسانی پرونده",
  GUIDANCE_PLAN_CREATED: "تشکیل پرونده",
  GUIDANCE_DOCUMENT_UPLOADED: "بارگذاری مدرک",
  GUIDANCE_DOCUMENT_REPLACED: "جایگزینی مدرک",
  GUIDANCE_STEP_REVIEWED: "بررسی مرحله",
  GUIDANCE_STEP_REWOUND: "بازگشت دانش‌آموز به مرحله",
  GUIDANCE_FIELD_EDITED: "ویرایش فیلد",
  GUIDANCE_NOTE_ADDED: "یادداشت مشاور",
};

export const STEP_REVIEW_STATUS_LABELS: Record<
  "PENDING" | "APPROVED" | "REJECTED" | "NEEDS_REVISION",
  string
> = {
  PENDING: "در انتظار بررسی",
  APPROVED: "تأیید شده",
  REJECTED: "رد شده",
  NEEDS_REVISION: "نیاز به اصلاح",
};

export function workspaceStepReviewLabel(
  status: "PENDING" | "APPROVED" | "REJECTED" | "NEEDS_REVISION",
): string {
  return STEP_REVIEW_STATUS_LABELS[status];
}

export const WORKSPACE_QUEUE_FILTER_LABELS: Record<WorkspaceQueueFilter, string> = {
  all: "همه",
  in_progress: "در حال انجام",
  awaiting_payment: "در انتظار پرداخت",
  awaiting_choices: "در انتظار چیدمان",
  journey_completed: "سفر تکمیل‌شده",
  awaiting_review: "در انتظار بررسی",
  in_review: "در حال بررسی",
  needs_correction: "نیاز به اصلاح",
  ready_for_session: "آماده جلسه",
  pending_transcript: "کارنامه معلق",
};

export function isWorkspaceQueueFilter(value: string): value is WorkspaceQueueFilter {
  return (WORKSPACE_QUEUE_FILTERS as readonly string[]).includes(value);
}

export function workspaceExamGroupLabel(code: string): string {
  if ((GUIDANCE_EXAM_GROUPS as readonly string[]).includes(code)) {
    return EXAM_GROUP_LABELS[code as GuidanceExamGroup];
  }
  return code;
}

export function workspaceStepStatusLabel(status: GuidanceJourneyStepStatus): string {
  return STEP_STATUS_LABELS[status];
}

export function workspaceTranscriptLabel(status: WorkspaceTranscriptStatus): string {
  return TRANSCRIPT_LABELS[status];
}

export function workspaceDocumentTypeLabel(type: string): string {
  return DOCUMENT_TYPE_LABELS[type] ?? type;
}

export function workspaceVerificationLabel(status: string): string {
  return VERIFY_LABELS[status] ?? status;
}

export function workspaceAuditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action;
}

export function workspaceReviewStatusLabel(status: CounselorReviewStatus): string {
  return REVIEW_STATUS_LABELS[status];
}

export function workspacePackageTitle(code: string | null): string | null {
  if (!code) return null;
  return getGuidancePackage(code)?.title ?? code;
}

export function workspaceQuotaLabel(quota: string | null): string | null {
  if (!quota) return null;
  return guidanceQuotaLabel(quota);
}

export function workspaceGenderLabel(gender: string | undefined): string {
  if (gender === "MALE") return "آقا";
  if (gender === "FEMALE") return "خانم";
  return "—";
}

export function workspaceStepTitle(id: GuidanceJourneyStepId): string {
  return GUIDANCE_JOURNEY_STEPS.find((step) => step.id === id)?.title ?? `مرحله ${id}`;
}

export function matchesWorkspaceQueueFilter(
  item: Pick<
    WorkspaceQueueItem,
    | "currentStep"
    | "paid"
    | "choicesApproved"
    | "finalApproved"
    | "reviewStatus"
    | "transcriptStatus"
  >,
  filter: WorkspaceQueueFilter,
): boolean {
  switch (filter) {
    case "all":
      return true;
    case "in_progress":
      return !item.finalApproved;
    case "awaiting_payment":
      return item.currentStep === 3 && !item.paid;
    case "awaiting_choices":
      return item.currentStep === 10 && !item.choicesApproved;
    case "journey_completed":
      return item.finalApproved;
    case "awaiting_review":
    case "in_review":
    case "needs_correction":
    case "ready_for_session":
      return item.reviewStatus === filter;
    case "pending_transcript":
      return item.transcriptStatus === "pending";
    default:
      return true;
  }
}

export function summarizeStep1Fields(input: {
  fullName: string;
  nationalId?: string;
  gender?: string;
  birthDate?: string;
  province?: string;
  quota: string | null;
  highSchoolAverage: number | null;
  confirmedAtIso: string | null;
}): WorkspaceFieldRow[] {
  return [
    { label: "نام و نام خانوادگی", value: input.fullName || "—" },
    { label: "کد ملی", value: input.nationalId ? toPersianDigits(input.nationalId) : "—" },
    { label: "جنسیت", value: workspaceGenderLabel(input.gender) },
    { label: "تاریخ تولد", value: input.birthDate ? toPersianDigits(input.birthDate) : "—" },
    { label: "استان", value: input.province || "—" },
    { label: "سهمیه", value: workspaceQuotaLabel(input.quota) ?? "—" },
    {
      label: "معدل کتبی دیپلم",
      value:
        input.highSchoolAverage != null
          ? toPersianDigits(input.highSchoolAverage)
          : "—",
    },
    {
      label: "تأیید دانش‌آموز",
      value: input.confirmedAtIso ? "ثبت شده" : "ثبت نشده",
    },
  ];
}

export function summarizeStep2Fields(input: {
  answeredCount: number;
  totalQuestions: number;
  result: AssessmentResult | null;
}): WorkspaceFieldRow[] {
  const rows: WorkspaceFieldRow[] = [
    {
      label: "پاسخ‌ها",
      value: `${toPersianDigits(input.answeredCount)} از ${toPersianDigits(input.totalQuestions)}`,
    },
  ];
  const result = input.result;
  if (!result) {
    rows.push({ label: "نتیجه", value: "هنوز محاسبه نشده" });
    return rows;
  }
  const primary =
    ASSESSMENT_CATEGORIES.find((c) => c.id === result.personality.primaryCategoryId)
      ?.title ?? result.personality.primaryCategoryId;
  rows.push({ label: "پروفایل", value: result.personality.title });
  rows.push({ label: "بُعد غالب", value: primary });
  const top = result.suitableMajors.slice(0, 3);
  if (top.length > 0) {
    rows.push({
      label: "رشته‌های مناسب",
      value: top.map((m) => m.title).join("، "),
    });
  }
  return rows;
}

export function summarizeStep3Fields(input: {
  packageCode: string | null;
  paidAtIso: string | null;
}): WorkspaceFieldRow[] {
  return [
    { label: "بسته", value: workspacePackageTitle(input.packageCode) ?? "انتخاب نشده" },
    { label: "پرداخت", value: input.paidAtIso ? "پرداخت شده" : "پرداخت نشده" },
  ];
}

export function summarizeSessionFields(input: {
  trackingCode: string | null;
  startsAtIso: string | null;
  isActive: boolean;
}): WorkspaceFieldRow[] {
  if (!input.trackingCode && !input.startsAtIso) {
    return [{ label: "نوبت", value: "رزرو نشده" }];
  }
  return [
    {
      label: "کد پیگیری",
      value: input.trackingCode ? toPersianDigits(input.trackingCode) : "—",
    },
    { label: "وضعیت رزرو", value: input.isActive ? "فعال" : "لغو شده" },
  ];
}

export function summarizeStep5Fields(input: {
  nationalRank: number | null;
  regionalRank: number | null;
  quotaRank: number | null;
  score: number | null;
}): WorkspaceFieldRow[] {
  return [
    {
      label: "رتبه کشوری",
      value: input.nationalRank != null ? toPersianDigits(input.nationalRank) : "—",
    },
    {
      label: "رتبه منطقه",
      value: input.regionalRank != null ? toPersianDigits(input.regionalRank) : "—",
    },
    {
      label: "رتبه سهمیه",
      value: input.quotaRank != null ? toPersianDigits(input.quotaRank) : "—",
    },
    {
      label: "تراز / نمره",
      value: input.score != null ? toPersianDigits(input.score) : "—",
    },
  ];
}

export function summarizeStep6Fields(
  items: readonly { code: string; enabled: boolean; rank: number }[],
): WorkspaceFieldRow[] {
  const enabled = [...items]
    .filter((item) => item.enabled)
    .sort((a, b) => a.rank - b.rank);
  if (enabled.length === 0) {
    return [{ label: "نوع آموزش", value: "موردی انتخاب نشده" }];
  }
  return enabled.map((item, index) => ({
    label: `اولویت ${toPersianDigits(index + 1)}`,
    value: guidanceEducationTypeLabel(item.code),
  }));
}

export function summarizeStep7Fields(
  items: readonly {
    province: string;
    enabled: boolean;
    rank: number;
    cities: readonly string[];
  }[],
): WorkspaceFieldRow[] {
  const enabled = [...items]
    .filter((item) => item.enabled)
    .sort((a, b) => a.rank - b.rank);
  if (enabled.length === 0) {
    return [{ label: "جغرافیا", value: "استانی انتخاب نشده" }];
  }
  return enabled.map((item) => ({
    label: item.province,
    value: item.cities.length > 0 ? item.cities.join("، ") : "همه شهرها",
  }));
}

export function summarizeStep8Fields(
  items: readonly { code: string; enabled: boolean; favorite: boolean; rank: number }[],
  examGroup: string,
): WorkspaceFieldRow[] {
  const catalog = (GUIDANCE_EXAM_GROUPS as readonly string[]).includes(examGroup)
    ? getMajorsForExamGroup(examGroup as GuidanceExamGroup)
    : [];
  const labelFor = (code: string) =>
    catalog.find((major) => major.code === code)?.label ?? code;
  const enabled = [...items]
    .filter((item) => item.enabled)
    .sort((a, b) => a.rank - b.rank);
  if (enabled.length === 0) {
    return [{ label: "رشته‌ها", value: "رشته‌ای انتخاب نشده" }];
  }
  return enabled.map((item, index) => ({
    label: `اولویت ${toPersianDigits(index + 1)}`,
    value: `${labelFor(item.code)}${item.favorite ? " ★" : ""}`,
  }));
}

export function summarizeStep9Fields(orderedCodes: readonly string[]): WorkspaceFieldRow[] {
  if (orderedCodes.length === 0) {
    return [{ label: "وزن‌دهی", value: "ثبت نشده" }];
  }
  return orderedCodes.map((code, index) => {
    const factor = GUIDANCE_PRIORITY_FACTORS.find((item) => item.code === code);
    return {
      label: `وزن ${toPersianDigits(index + 1)}`,
      value: factor?.label ?? code,
    };
  });
}

export function summarizeStep10Fields(input: {
  choiceCount: number;
  approved: boolean;
  importedAtIso: string | null;
}): WorkspaceFieldRow[] {
  return [
    { label: "تعداد گزینه‌ها", value: toPersianDigits(input.choiceCount) },
    { label: "ورود از Entekhabium", value: input.importedAtIso ? "وارد شده" : "وارد نشده" },
    { label: "تأیید مشاور", value: input.approved ? "تأیید شده" : "تأیید نشده" },
  ];
}

export function summarizeStep12Fields(input: {
  finalApprovedAtIso: string | null;
}): WorkspaceFieldRow[] {
  return [
    {
      label: "تأیید دیجیتال دانش‌آموز",
      value: input.finalApprovedAtIso ? "ثبت شده" : "ثبت نشده",
    },
  ];
}

export function workspaceStepEmptyMessage(
  status: GuidanceJourneyStepStatus,
): string | null {
  if (status === "locked") {
    return "این مرحله هنوز برای دانش‌آموز باز نشده است.";
  }
  if (status === "active") {
    return "مرحله فعال است؛ داده‌ها ممکن است ناقص باشند.";
  }
  return null;
}
