/**
 * Guidance journey entry — routing-only resolver.
 * Does not query or mutate plan state. Production V2 uses journey/steps;
 * legacy V1 uses steps.
 */

const GUIDANCE_HOME = "/portal/student/services/guidance";

export type GuidanceJourneyContinueInput = {
  journeyVersion?: number | null;
  currentStep: number;
};

export function resolveGuidanceJourneyContinueHref(
  input: GuidanceJourneyContinueInput,
): string {
  const step = Math.max(1, Math.floor(input.currentStep));
  if ((input.journeyVersion ?? 1) >= 2) {
    return `${GUIDANCE_HOME}/journey/steps/${step}`;
  }
  return `${GUIDANCE_HOME}/steps/${step}`;
}
