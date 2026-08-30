"use server";

import { requireGuidanceJourneyStepAccess } from "@/lib/guidance/journey/guard";
import {
  completeGuidanceStep6,
  type EducationPreferenceItem,
} from "@/lib/guidance/journey/steps/step6-education-preferences";

export type Step6SubmitState = { ok: true } | { ok: false; error: string };

export async function submitGuidanceStep6Action(
  items: EducationPreferenceItem[],
): Promise<Step6SubmitState> {
  const { context, plan } = await requireGuidanceJourneyStepAccess(6);
  return completeGuidanceStep6({
    organizationId: context.organization.id,
    actorUserId: context.user.id,
    studentId: plan.studentId,
    planId: plan.id,
    planPublicId: plan.publicId,
    items,
  });
}
