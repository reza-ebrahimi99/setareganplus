"use server";

import { requireGuidanceJourneyStepAccess } from "@/lib/guidance/journey/guard";
import { completeGuidanceStep9 } from "@/lib/guidance/journey/steps/step9-priority-weights";

export type Step9SubmitState = { ok: true } | { ok: false; error: string };

export async function submitGuidanceStep9Action(
  orderedCodes: string[],
): Promise<Step9SubmitState> {
  const { context, plan } = await requireGuidanceJourneyStepAccess(9);
  return completeGuidanceStep9({
    organizationId: context.organization.id,
    actorUserId: context.user.id,
    studentId: plan.studentId,
    planId: plan.id,
    planPublicId: plan.publicId,
    orderedCodes,
  });
}
