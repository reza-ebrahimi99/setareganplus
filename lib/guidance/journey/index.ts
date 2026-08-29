/**
 * Guidance Journey Engine — public entrypoint (Phase 1).
 * Import from `@/lib/guidance/journey` only; avoid deep imports of internals.
 */

export {
  GUIDANCE_JOURNEY_STEPS,
  GUIDANCE_JOURNEY_STEP_COUNT,
  getGuidanceJourneyStepDefinition,
  guidanceJourneyStepPath,
  guidanceStepCompletedStatus,
  isGuidanceJourneyStepId,
  parseGuidanceJourneyStepParam,
  type GuidanceJourneyStepDefinition,
  type GuidanceJourneyStepId,
  type GuidanceJourneyStepKey,
} from "@/lib/guidance/journey/steps";

export type {
  GuidanceJourneyPlanSnapshot,
  GuidanceJourneySidebarStep,
  GuidanceJourneyStepStatus,
  GuidanceStepFormState,
} from "@/lib/guidance/journey/types";

export {
  buildGuidanceJourneySidebar,
  computeGuidanceCompletionPercentage,
  guidanceJourneyStepStatus,
  mergeCompletedSteps,
  nextGuidanceStep,
} from "@/lib/guidance/journey/state";

export {
  loadGuidanceJourneyPlan,
  loadGuidanceJourneyPlanByPublicId,
  mapGuidanceJourneyPlan,
} from "@/lib/guidance/journey/plan";

export {
  loadGuidanceJourneyEntry,
  requireGuidanceJourneyStepAccess,
  type GuidanceJourneyStepAccess,
} from "@/lib/guidance/journey/guard";

export {
  advanceGuidanceJourneyStep,
  type AdvanceGuidanceStepResult,
} from "@/lib/guidance/journey/advance";

export {
  loadGuidanceStepData,
  saveGuidanceStepData,
} from "@/lib/guidance/journey/step-store";
