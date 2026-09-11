/**
 * Canonical /steps index — sends V2 students to /journey/steps/{currentStep}.
 * Legacy V1 still uses /steps/{n} via the V1 loader.
 */

import { redirect } from "next/navigation";
import { GUIDANCE_CANONICAL_HOME } from "@/lib/guidance/canonical-entry";
import { loadGuidanceJourneyEntry } from "@/lib/guidance/journey/guard";
import { guidanceJourneyStepPath } from "@/lib/guidance/journey/steps";
import { guidanceJourneyV2StepPath } from "@/lib/guidance/journey-v2/catalog";
import { loadGuidanceV2Plan } from "@/lib/guidance/journey-v2/plan";

export const dynamic = "force-dynamic";

export default async function GuidanceJourneyStepsIndexPage() {
  const { plan, context } = await loadGuidanceJourneyEntry();
  const studentId = context.activeLink.studentId;
  if (!studentId) redirect(GUIDANCE_CANONICAL_HOME);

  const v2 = await loadGuidanceV2Plan({
    organizationId: context.organization.id,
    studentId,
  });
  if (v2) {
    redirect(guidanceJourneyV2StepPath(v2.currentStep));
  }

  redirect(guidanceJourneyStepPath(plan.currentStep));
}
