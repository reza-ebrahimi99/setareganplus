/**
 * Guidance Journey Engine — pure state derivation (no I/O, no JSX).
 */

import {
  GUIDANCE_JOURNEY_STEPS,
  guidanceJourneyStepPath,
  type GuidanceJourneyStepId,
} from "@/lib/guidance/journey/steps";
import type {
  GuidanceJourneyPlanSnapshot,
  GuidanceJourneySidebarStep,
  GuidanceJourneyStepStatus,
} from "@/lib/guidance/journey/types";

export function guidanceJourneyStepStatus(
  stepId: GuidanceJourneyStepId,
  plan: Pick<GuidanceJourneyPlanSnapshot, "currentStep" | "completedSteps">,
): GuidanceJourneyStepStatus {
  if (plan.completedSteps.includes(stepId)) return "completed";
  if (stepId === plan.currentStep) return "active";
  return "locked";
}

export function buildGuidanceJourneySidebar(
  plan: Pick<GuidanceJourneyPlanSnapshot, "currentStep" | "completedSteps">,
): GuidanceJourneySidebarStep[] {
  return GUIDANCE_JOURNEY_STEPS.map((step) => {
    const status = guidanceJourneyStepStatus(step.id, plan);
    return {
      id: step.id,
      title: step.title,
      shortTitle: step.shortTitle,
      description: step.description,
      icon: step.icon,
      status,
      // Locked steps are never navigable — no href at all (no client bypass surface).
      href: status === "locked" ? null : guidanceJourneyStepPath(step.id),
    };
  });
}

export function computeGuidanceCompletionPercentage(
  completedSteps: readonly GuidanceJourneyStepId[],
): number {
  const total = GUIDANCE_JOURNEY_STEPS.length;
  return Math.round((completedSteps.length / total) * 100);
}

export function nextGuidanceStep(
  stepId: GuidanceJourneyStepId,
): GuidanceJourneyStepId {
  const max = GUIDANCE_JOURNEY_STEPS.length;
  return Math.min(stepId + 1, max) as GuidanceJourneyStepId;
}

export function mergeCompletedSteps(
  existing: readonly GuidanceJourneyStepId[],
  stepId: GuidanceJourneyStepId,
): GuidanceJourneyStepId[] {
  const set = new Set<GuidanceJourneyStepId>(existing);
  set.add(stepId);
  return Array.from(set).sort((a, b) => a - b);
}
