/**
 * Guidance Journey Engine — /steps index.
 * Always redirects to the student's true currentStep. Never renders itself.
 */

import { redirect } from "next/navigation";
import { loadGuidanceJourneyEntry } from "@/lib/guidance/journey/guard";
import { guidanceJourneyStepPath } from "@/lib/guidance/journey/steps";

export const dynamic = "force-dynamic";

export default async function GuidanceJourneyStepsIndexPage() {
  const { plan } = await loadGuidanceJourneyEntry();
  redirect(guidanceJourneyStepPath(plan.currentStep));
}
