/**
 * Compatible production entry for journey-v2/steps.
 * New V2 code should import from catalog.ts; this re-export keeps steps 1–10 UI compiling.
 */
export {
  GUIDANCE_V2_STEP_COUNT,
  GUIDANCE_V2_STEPS,
  getGuidanceV2StepDefinition,
  guidanceJourneyV2StepPath,
  guidanceV2StepCompletedStatus,
  isGuidanceV2StepId,
  parseGuidanceV2StepParam,
  type GuidanceV2StepDefinition,
  type GuidanceV2StepId,
} from "@/lib/guidance/journey-v2/catalog";
