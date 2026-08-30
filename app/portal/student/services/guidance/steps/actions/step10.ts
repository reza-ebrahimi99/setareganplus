"use server";

/**
 * Guidance Journey Engine — Step 10 (AI Arrangement) student action.
 */

import { requireGuidanceJourneyStepAccess } from "@/lib/guidance/journey/guard";
import { completeGuidanceStep10 } from "@/lib/guidance/journey/steps/step10-ai-arrangement";

export type Step10SubmitState = { ok: true } | { ok: false; error: string };

export async function submitGuidanceStep10Action(): Promise<Step10SubmitState> {
  const { context, plan } = await requireGuidanceJourneyStepAccess(10);
  return completeGuidanceStep10({
    organizationId: context.organization.id,
    actorUserId: context.user.id,
    studentId: plan.studentId,
    planId: plan.id,
    planPublicId: plan.publicId,
    choicesApprovedAtIso: plan.choicesApprovedAtIso,
  });
}
