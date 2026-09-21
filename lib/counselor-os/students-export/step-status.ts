/**
 * 18-step export status labels — aligned with counselor journey semantics.
 */

import { normalizeV2ReviewStatus, type V2ReviewStatus } from "@/lib/guidance/journey-v2/step-review/status";
import { parseCompletedStepIds } from "@/lib/counselor-os/v2-catalog";

export type ExportJourneyStepStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "needs_revision"
  | "resubmitted"
  | "downstream_review"
  | "gate_locked";

export const EXPORT_JOURNEY_STEP_STATUS_LABELS: Record<ExportJourneyStepStatus, string> = {
  not_started: "شروع نشده",
  in_progress: "در حال انجام",
  completed: "تکمیل‌شده",
  needs_revision: "نیازمند اصلاح",
  resubmitted: "ارسال مجدد",
  downstream_review: "نیازمند بازبینی وابسته",
  gate_locked: "قفل‌شده توسط گیت واقعی",
};

export function exportJourneyStepStatusLabel(status: ExportJourneyStepStatus): string {
  return EXPORT_JOURNEY_STEP_STATUS_LABELS[status];
}

export function resolveExportJourneyStepStatus(params: {
  stepNumber: number;
  currentStep: number;
  completedSteps: unknown;
  reviewStatusRaw?: string | null;
  openRevisionSteps: readonly number[];
  needsReviewFlags: Record<string, boolean>;
}): ExportJourneyStepStatus {
  const completed = parseCompletedStepIds(params.completedSteps);
  const review = params.reviewStatusRaw
    ? normalizeV2ReviewStatus(params.reviewStatusRaw)
    : null;
  const openRevision = params.openRevisionSteps.includes(params.stepNumber);
  const downstream =
    params.needsReviewFlags[String(params.stepNumber)] === true ||
    params.needsReviewFlags[`step${params.stepNumber}`] === true;

  if (review === "REVISION_REQUESTED" || openRevision) {
    return "needs_revision";
  }
  if (review === "RESUBMITTED") {
    return "resubmitted";
  }
  if (downstream && !completed.includes(params.stepNumber)) {
    return "downstream_review";
  }
  if (completed.includes(params.stepNumber)) {
    return "completed";
  }
  if (params.stepNumber > params.currentStep) {
    return "gate_locked";
  }
  if (params.stepNumber === params.currentStep) {
    return "in_progress";
  }
  if (params.stepNumber < params.currentStep) {
    return "in_progress";
  }
  return "not_started";
}

export function summarizeCounselorReviewStatus(
  reviews: Array<{ stepNumber: number; status: string }>,
): { label: string; revisionStep: number | null; studentMessage: string } {
  let revisionStep: number | null = null;
  let studentMessage = "";
  let worst: V2ReviewStatus | null = null;
  const rank: Record<V2ReviewStatus, number> = {
    REVISION_REQUESTED: 5,
    RESUBMITTED: 4,
    UNREVIEWED: 3,
    COUNSELOR_EDITED: 2,
    REVIEWED: 1,
  };

  for (const r of reviews) {
    const s = normalizeV2ReviewStatus(r.status);
    if (!worst || rank[s] > rank[worst]) worst = s;
    if (s === "REVISION_REQUESTED" && revisionStep == null) {
      revisionStep = r.stepNumber;
    }
  }

  if (!worst) return { label: "", revisionStep: null, studentMessage: "" };
  const label =
    worst === "UNREVIEWED"
      ? "بررسی‌نشده"
      : worst === "REVIEWED"
        ? "بررسی‌شده"
        : worst === "REVISION_REQUESTED"
          ? "بررسی‌نشده"
          : worst === "RESUBMITTED"
            ? "دوباره ارسال شده"
            : worst === "COUNSELOR_EDITED"
              ? "ویرایش‌شده توسط مشاور"
              : "";
  return { label, revisionStep, studentMessage };
}

export function buildEighteenStepSheetHeaders(): string[] {
  const base = [
    "ردیف",
    "نام و نام خانوادگی",
    "موبایل",
    "شناسه پرونده",
    "مشاور",
    "مرحله فعلی",
    "درصد پیشرفت",
  ];
  const stepCols: string[] = [];
  for (let step = 1; step <= 18; step += 1) {
    stepCols.push(
      `مرحله ${step} - وضعیت`,
      `مرحله ${step} - تاریخ تکمیل`,
      `مرحله ${step} - وضعیت بررسی`,
    );
  }
  return [...base, ...stepCols];
}
