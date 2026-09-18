"use server";

import {
  requireGuidanceV2StepAccess,
} from "@/lib/guidance/journey-v2/guard";

import {
  completeGuidanceStep8,
  type MajorPreferenceItem,
} from "@/lib/guidance/journey/steps/step8-major-preferences";

export type GuidanceV2Step8State = {
  ok?: boolean;
  error?: string;
};

export async function submitGuidanceV2Step8Action(
  _previousState: GuidanceV2Step8State,
  formData: FormData,
): Promise<GuidanceV2Step8State> {
  try {
    const raw = formData.get("payload");

    if (typeof raw !== "string") {
      return {
        error: "اطلاعات رشته‌ها نامعتبر است.",
      };
    }

    const items = JSON.parse(raw) as MajorPreferenceItem[];

    if (!Array.isArray(items)) {
      return {
        error: "اطلاعات رشته‌ها نامعتبر است.",
      };
    }

    const { context, plan } =
      await requireGuidanceV2StepAccess(8);

    const result = await completeGuidanceStep8({
      organizationId: context.organization.id,
      actorUserId: context.user.id,
      studentId: plan.studentId,
      planId: plan.id,
      planPublicId: plan.publicId,
      examGroup: plan.examGroup,
      items,
    });

    return result.ok
      ? { ok: true }
      : { error: result.error };
  } catch (error) {
    console.error(
      "[guidance-v2] step8_submit_failed",
      error,
    );

    return {
      error: "ثبت اولویت رشته‌ها انجام نشد.",
    };
  }
}
