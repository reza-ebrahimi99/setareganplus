import {
  GUIDANCE_V2_STEPS,
  guidanceJourneyV2StepPath,
  type GuidanceV2StepId,
} from "@/lib/guidance/journey-v2/catalog";

export type GuidanceV2SidebarStep = {
  id: GuidanceV2StepId;
  title: string;
  shortTitle: string;
  description: string;
  status: "locked" | "active" | "completed";
  href: string | null;
};

type SidebarPlan = {
  currentStep: number;
  completedSteps: readonly number[];
};

export function mergeV2CompletedSteps(
  existing: readonly GuidanceV2StepId[],
  stepId: GuidanceV2StepId,
): GuidanceV2StepId[] {
  const set = new Set<GuidanceV2StepId>(existing);
  set.add(stepId);
  return Array.from(set).sort((a, b) => a - b);
}

export function computeV2CompletionPercentage(
  completedSteps: readonly GuidanceV2StepId[],
): number {
  return Math.round((completedSteps.length / GUIDANCE_V2_STEPS.length) * 100);
}

export function nextV2Step(stepId: GuidanceV2StepId): GuidanceV2StepId {
  return Math.min(stepId + 1, GUIDANCE_V2_STEPS.length) as GuidanceV2StepId;
}

export function buildGuidanceV2Sidebar(plan: SidebarPlan): GuidanceV2SidebarStep[] {
  return GUIDANCE_V2_STEPS.map((step) => {
    const status = plan.completedSteps.includes(step.id)
      ? "completed"
      : step.id === plan.currentStep
        ? "active"
        : "locked";
    return {
      id: step.id,
      title: step.title,
      shortTitle: step.shortTitle,
      description: step.description,
      status,
      href: status === "locked" ? null : guidanceJourneyV2StepPath(step.id),
    };
  });
}

/** Production Steps 1–10 name. Adds `icon` so live shell types still assign. */
export type GuidanceJourneyV2SidebarStep = GuidanceV2SidebarStep & {
  icon: string;
};

export function buildGuidanceJourneyV2Sidebar(
  plan: SidebarPlan,
): GuidanceJourneyV2SidebarStep[] {
  return buildGuidanceV2Sidebar(plan).map((step) => ({
    ...step,
    icon: step.shortTitle,
  }));
}
