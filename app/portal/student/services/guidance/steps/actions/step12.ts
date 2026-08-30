"use server";

/**
 * Guidance Journey Engine — Step 12 (Final Approval) server action.
 */

import { completeGuidanceStep12 } from "@/lib/guidance/journey/steps/step12-final-approval";
import { requireGuidanceJourneyStepAccess } from "@/lib/guidance/journey/guard";
import { prisma } from "@/lib/prisma";
import type { GuidanceStepFormState } from "@/lib/guidance/journey/types";

export async function submitGuidanceStep12Action(
  _state: GuidanceStepFormState,
  formData: FormData,
): Promise<GuidanceStepFormState> {
  const { context, plan } = await requireGuidanceJourneyStepAccess(12);

  const student = await prisma.student.findFirst({
    where: { id: plan.studentId, organizationId: context.organization.id },
    select: { fullName: true },
  });

  const result = await completeGuidanceStep12({
    organizationId: context.organization.id,
    actorUserId: context.user.id,
    studentId: plan.studentId,
    planId: plan.id,
    planPublicId: plan.publicId,
    typedSignature: String(formData.get("typedSignature") ?? ""),
    expectedFullName: student?.fullName ?? "",
    confirmed: formData.get("confirmed") === "on",
  });

  if (!result.ok) {
    return { error: result.error, fieldErrors: result.fieldErrors };
  }

  return { ok: true };
}
