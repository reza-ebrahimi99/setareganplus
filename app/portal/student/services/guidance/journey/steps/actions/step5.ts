"use server";

/**
 * Local compile companion for Step 5 UI.
 * Production already has the live dispatcher/action. Do not pack this file
 * if the production action is richer — this only preserves typecheck.
 */

import { advanceGuidanceJourneyV2Step } from "@/lib/guidance/journey-v2/advance";
import { requireGuidanceV2StepAccess } from "@/lib/guidance/journey-v2/guard";
import type { JourneyV2FormState } from "@/app/portal/student/services/guidance/journey/steps/actions/step1";

export async function submitGuidanceV2Step5Action(
  _prev: JourneyV2FormState,
  _formData: FormData,
): Promise<JourneyV2FormState> {
  const access = await requireGuidanceV2StepAccess(5);
  if (access.plan.currentStep === 5) {
    const advanced = await advanceGuidanceJourneyV2Step({
      organizationId: access.plan.organizationId,
      actorUserId: access.context.user.id,
      studentId: access.plan.studentId,
      stepId: 5,
    });
    if (!advanced.ok) return { error: advanced.error };
  }
  return { ok: true };
}
