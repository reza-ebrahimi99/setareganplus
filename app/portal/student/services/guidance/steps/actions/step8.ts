"use server";

import { requireGuidanceJourneyStepAccess } from "@/lib/guidance/journey/guard";
import {
  completeGuidanceStep8,
  type MajorPreferenceItem,
} from "@/lib/guidance/journey/steps/step8-major-preferences";

export type Step8SubmitState = { ok: true } | { ok: false; error: string };

export async function submitGuidanceStep8Action(
  items: MajorPreferenceItem[],
): Promise<Step8SubmitState> {
  const { context, plan } = await requireGuidanceJourneyStepAccess(8);
  return completeGuidanceStep8({
    organizationId: context.organization.id,
    actorUserId: context.user.id,
    studentId: plan.studentId,
    planId: plan.id,
    planPublicId: plan.publicId,
    examGroup: plan.examGroup,
    items,
  });
}
