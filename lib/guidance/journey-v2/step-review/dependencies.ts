import type { GuidanceV2StepId } from "@/lib/guidance/journey-v2/catalog";

/** Downstream steps that should be flagged needsReview (never auto-deleted). */
export const STEP_DOWNSTREAM_REVIEW_MAP: Readonly<
  Partial<Record<GuidanceV2StepId, readonly GuidanceV2StepId[]>>
> = {
  1: [6, 7, 8, 9, 13, 16],
  2: [13, 16],
  4: [5, 6, 7, 8, 13, 16],
  5: [6, 7, 8, 13, 16],
  12: [13, 16],
  6: [13, 16],
  7: [13, 16],
  8: [13, 16],
  9: [13, 16],
  13: [14, 16],
  14: [16],
  16: [17],
};

export type StepImpactPreview = {
  affectedSteps: GuidanceV2StepId[];
  summaryFa: string;
};

export function previewStepChangeImpact(stepNumber: GuidanceV2StepId): StepImpactPreview {
  const affected = [...(STEP_DOWNSTREAM_REVIEW_MAP[stepNumber] ?? [])];
  if (affected.length === 0) {
    return {
      affectedSteps: [],
      summaryFa: "مراحل بعدی حذف یا بازنشانی نمی‌شوند.",
    };
  }
  return {
    affectedSteps: affected,
    summaryFa: `مراحل ${affected.map((s) => s).join("، ")} فقط با برچسب «نیازمند بازبینی» علامت‌گذاری می‌شوند؛ داده حذف نمی‌شود.`,
  };
}

export function mergeNeedsReviewFlags(
  current: Record<string, boolean>,
  steps: readonly number[],
): Record<string, boolean> {
  const next = { ...current };
  for (const s of steps) {
    next[String(s)] = true;
  }
  return next;
}
