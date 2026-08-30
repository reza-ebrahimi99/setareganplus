"use server";

/**
 * Guidance Journey Engine — Step 5 (Exam Results) server action.
 */

import { completeGuidanceStep5 } from "@/lib/guidance/journey/steps/step5-exam-results";
import { requireGuidanceJourneyStepAccess } from "@/lib/guidance/journey/guard";
import type { GuidanceStepFormState } from "@/lib/guidance/journey/types";

export async function submitGuidanceStep5Action(
  _state: GuidanceStepFormState,
  formData: FormData,
): Promise<GuidanceStepFormState> {
  const { context, plan } = await requireGuidanceJourneyStepAccess(5);

  const fileValue = formData.get("file");

  const result = await completeGuidanceStep5({
    organizationId: context.organization.id,
    actorUserId: context.user.id,
    studentId: plan.studentId,
    planId: plan.id,
    planPublicId: plan.publicId,
    input: {
      nationalRank: String(formData.get("nationalRank") ?? ""),
      regionalRank: String(formData.get("regionalRank") ?? ""),
      quotaRank: String(formData.get("quotaRank") ?? ""),
      score: String(formData.get("score") ?? ""),
      acknowledged: formData.get("acknowledged") === "on",
    },
    file: fileValue instanceof File && fileValue.size > 0 ? fileValue : null,
  });

  if (!result.ok) {
    return { error: result.error, fieldErrors: result.fieldErrors };
  }

  return { ok: true };
}
