"use server";

/**
 * Guidance Journey Engine — Step 1 (Personal Information) server action.
 */

import { readSessionRequestMetadata } from "@/lib/auth/session";
import { completeGuidanceStep1 } from "@/lib/guidance/journey/steps/step1-personal-info";
import { requireGuidanceJourneyStepAccess } from "@/lib/guidance/journey/guard";
import type { GuidanceStepFormState } from "@/lib/guidance/journey/types";

export async function submitGuidanceStep1Action(
  _state: GuidanceStepFormState,
  formData: FormData,
): Promise<GuidanceStepFormState> {
  const { context, plan } = await requireGuidanceJourneyStepAccess(1);

  const fileValue = formData.get("file");
  const requestMetadata = await readSessionRequestMetadata();

  const result = await completeGuidanceStep1({
    organizationId: context.organization.id,
    actorUserId: context.user.id,
    studentId: plan.studentId,
    planId: plan.id,
    planPublicId: plan.publicId,
    input: {
      fullName: String(formData.get("fullName") ?? ""),
      nationalId: String(formData.get("nationalId") ?? ""),
      gender: String(formData.get("gender") ?? ""),
      birthDate: String(formData.get("birthDate") ?? ""),
      province: String(formData.get("province") ?? ""),
      quota: String(formData.get("quota") ?? ""),
      highSchoolAverage: String(formData.get("highSchoolAverage") ?? ""),
      confirmed: formData.get("confirmed") === "on",
    },
    file: fileValue instanceof File && fileValue.size > 0 ? fileValue : null,
    ipAddress: requestMetadata.ipAddress,
    userAgent: requestMetadata.userAgent,
  });

  if (!result.ok) {
    return { error: result.error, fieldErrors: result.fieldErrors };
  }

  return { ok: true };
}
