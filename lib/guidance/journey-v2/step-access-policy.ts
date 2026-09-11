/**
 * Reusable previous-step access policy for Guidance V2.
 * Completed student-owned steps can be reopened. Counselor-owned and
 * legally locked states stay protected.
 */

import type { GuidanceV2StepId } from "@/lib/guidance/journey-v2/catalog";
import { packageIncludesArrangement } from "@/lib/guidance/journey-v2/entitlements";

export const STUDENT_OWNED_STEPS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 12, 14] as const;
export const COUNSELOR_OWNED_STEPS = [13, 16] as const;
export const SYSTEM_OWNED_STEPS = [10, 11, 15, 17, 18] as const;

export const GUIDANCE_EDIT_WARNING =
  "تغییر این اطلاعات ممکن است نیازمند بررسی مجدد مشاور باشد.";

export type StepAccessMode = "current" | "edit" | "readonly" | "locked" | "payment";

export type StepAccessSnapshot = {
  currentStep: number;
  completedSteps: readonly number[];
  packageCode: string | null;
  packagePaidAtIso: string | null;
  finalApprovedAtIso?: string | null;
  informedRevisionId?: string | null;
  sanjeshStatus?: string | null;
  hasCounselorDownstreamWork?: boolean;
};

export function isStudentOwnedStep(stepId: number): boolean {
  return (STUDENT_OWNED_STEPS as readonly number[]).includes(stepId);
}

export function isCounselorOwnedStep(stepId: number): boolean {
  return (COUNSELOR_OWNED_STEPS as readonly number[]).includes(stepId);
}

export function isFinalLocked(plan: StepAccessSnapshot): boolean {
  if (plan.sanjeshStatus === "VERIFIED") return true;
  return Boolean(plan.finalApprovedAtIso || plan.informedRevisionId);
}

export function resolveGuidanceV2StepAccessMode(
  stepId: GuidanceV2StepId,
  plan: StepAccessSnapshot,
): StepAccessMode {
  if (stepId === plan.currentStep) return "current";

  if (stepId === 10) {
    if (!plan.packagePaidAtIso) return "payment";
    if (!packageIncludesArrangement(plan.packageCode)) return "payment";
    return "readonly";
  }

  const completed = plan.completedSteps.includes(stepId);
  if (!completed || stepId > plan.currentStep) return "locked";

  if (stepId === 17 && isFinalLocked(plan)) return "locked";
  if (stepId === 18 && plan.sanjeshStatus === "VERIFIED") return "locked";

  if (isCounselorOwnedStep(stepId)) return "readonly";

  if (isStudentOwnedStep(stepId)) return "edit";

  if (stepId === 11 || stepId === 15) return "edit";

  return "readonly";
}

export function canOpenGuidanceV2HistoricalStep(
  stepId: GuidanceV2StepId,
  plan: StepAccessSnapshot,
): boolean {
  return resolveGuidanceV2StepAccessMode(stepId, plan) !== "locked";
}

export function studentEditRequiresCounselorReview(
  stepId: number,
  plan: Pick<StepAccessSnapshot, "hasCounselorDownstreamWork" | "currentStep">,
): boolean {
  if (!isStudentOwnedStep(stepId)) return false;
  if (plan.hasCounselorDownstreamWork) return true;
  return plan.currentStep >= 13;
}

export function isHistoricalEdit(stepId: number, currentStep: number): boolean {
  return stepId < currentStep;
}
