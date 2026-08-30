"use server";

import { requireGuidanceJourneyStepAccess } from "@/lib/guidance/journey/guard";
import {
  completeGuidanceStep7,
  type ProvincePreferenceItem,
} from "@/lib/guidance/journey/steps/step7-city-preferences";

export type Step7SubmitState = { ok: true } | { ok: false; error: string };

export async function submitGuidanceStep7Action(
  items: ProvincePreferenceItem[],
): Promise<Step7SubmitState> {
  const { context, plan } = await requireGuidanceJourneyStepAccess(7);
  return completeGuidanceStep7({
    organizationId: context.organization.id,
    actorUserId: context.user.id,
    studentId: plan.studentId,
    planId: plan.id,
    planPublicId: plan.publicId,
    items,
  });
}
