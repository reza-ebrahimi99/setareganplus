/**
 * Counselor student Excel export — formatting, safety, filenames.
 */

import { neutralizeSpreadsheetFormula } from "@/lib/forms/csv";
import {
  formatJalaliDateShort,
  formatJalaliDateTimeShort,
  utcToJalaliInTehran,
} from "@/lib/datetime/jalali";
import { toPersianDigits } from "@/lib/persian";
import { V2_REVIEW_STATUS_LABELS, type V2ReviewStatus } from "@/lib/guidance/journey-v2/step-review/status";
import { labelExamGroup, labelGender, labelPackage } from "@/lib/counselor-os/labels";
import { counselorV2StepTitle, parseCompletedStepIds } from "@/lib/counselor-os/v2-catalog";
import { computeV2CompletionPercentage } from "@/lib/guidance/journey-v2/state";
import type { GuidanceV2StepId } from "@/lib/guidance/journey-v2/catalog";
import { HOLLAND_TYPE_LABELS, type HollandType } from "@/lib/guidance/journey-v2/holland/profiles";

export { neutralizeSpreadsheetFormula as escapeExcelCell };

export function formatBooleanFa(value: boolean | null | undefined): string {
  if (value == null) return "";
  return value ? "بله" : "خیر";
}

export function rialsToTomanNumber(rials: number | null | undefined): number | null {
  if (rials == null || !Number.isFinite(rials)) return null;
  return rials / 10;
}

export function excelText(value: string | null | undefined): string {
  if (value == null || value === "") return "";
  return neutralizeSpreadsheetFormula(String(value));
}

export function formatTehranJalaliDateTime(date: Date | null | undefined): string {
  if (!date) return "";
  return formatJalaliDateTimeShort(date);
}

export function formatTehranJalaliDate(date: Date | null | undefined): string {
  if (!date) return "";
  return formatJalaliDateShort(date);
}

export function counselorStudentsExportFilename(now: Date = new Date()): string {
  const j = utcToJalaliInTehran(now);
  const ymd = toPersianDigits(
    `${j.jy}-${String(j.jm).padStart(2, "0")}-${String(j.jd).padStart(2, "0")}`,
  );
  return `دانش‌آموزان-هدایت-تحصیلی-${ymd}.xlsx`;
}

export function labelReviewStatusFa(status: string | null | undefined): string {
  if (!status) return "";
  const key = status as V2ReviewStatus;
  return V2_REVIEW_STATUS_LABELS[key] ?? status;
}

export function labelExamGroupFa(code: string | null | undefined): string {
  if (!code) return "";
  const labeled = labelExamGroup(code);
  return labeled === "—" ? "" : labeled;
}

export function labelGenderFa(code: string | null | undefined): string {
  if (!code) return "";
  const labeled = labelGender(code);
  return labeled === "—" ? "" : labeled;
}

export function labelPackageFa(code: string | null | undefined): string {
  if (!code) return "";
  const labeled = labelPackage(code);
  return labeled === "بدون بسته" ? "" : labeled;
}

export function hollandTypeLabel(type: string | null | undefined): string {
  if (!type) return "";
  if (type.length === 1 && type in HOLLAND_TYPE_LABELS) {
    return HOLLAND_TYPE_LABELS[type as HollandType];
  }
  return type;
}

export function journeyProgressFromPlan(plan: {
  currentStep: number;
  completedSteps: unknown;
  completionPercentage?: number;
} | null): {
  currentStep: number | null;
  currentStepTitle: string;
  completedCount: number;
  completionPercentage: number;
  lastCompletedStep: number | null;
  lastCompletedTitle: string;
} {
  if (!plan) {
    return {
      currentStep: null,
      currentStepTitle: "",
      completedCount: 0,
      completionPercentage: 0,
      lastCompletedStep: null,
      lastCompletedTitle: "",
    };
  }
  const completed = parseCompletedStepIds(plan.completedSteps);
  const pct =
    plan.completionPercentage && plan.completionPercentage > 0
      ? plan.completionPercentage
      : computeV2CompletionPercentage(completed as GuidanceV2StepId[]);
  const last = completed.length ? Math.max(...completed) : null;
  return {
    currentStep: plan.currentStep,
    currentStepTitle: counselorV2StepTitle(plan.currentStep),
    completedCount: completed.length,
    completionPercentage: pct,
    lastCompletedStep: last,
    lastCompletedTitle: last ? counselorV2StepTitle(last) : "",
  };
}

export function daysSince(date: Date | null | undefined, now: Date = new Date()): number | null {
  if (!date) return null;
  const ms = now.getTime() - date.getTime();
  if (ms < 0) return 0;
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}
