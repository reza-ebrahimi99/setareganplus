"use server";

import {
  requireGuidanceV2StepAccess,
} from "@/lib/guidance/journey-v2/guard";

import {
  completeGuidanceStep6,
  type EducationPreferenceItem,
} from "@/lib/guidance/journey/steps/step6-education-preferences";

export type GuidanceV2Step6State = {
  ok?: boolean;
  error?: string;
};

export async function submitGuidanceV2Step6Action(
  _previousState: GuidanceV2Step6State,
  formData: FormData,
): Promise<GuidanceV2Step6State> {
  try {
    const raw = formData.get("payload");

    if (typeof raw !== "string") {
      return {
        error: "اطلاعات دوره‌های تحصیلی نامعتبر است.",
      };
    }

    const items = JSON.parse(raw) as EducationPreferenceItem[];

    if (!Array.isArray(items)) {
      return {
        error: "اطلاعات دوره‌های تحصیلی نامعتبر است.",
      };
    }

    const { context, plan } =
      await requireGuidanceV2StepAccess(6);

    const result = await completeGuidanceStep6({
      organizationId: context.organization.id,
      actorUserId: context.user.id,
      studentId: plan.studentId,
      planId: plan.id,
      planPublicId: plan.publicId,
      items,
    });

    return result.ok
      ? { ok: true }
      : { error: result.error };
  } catch (error) {
    console.error(
      "[guidance-v2] step6_submit_failed",
      error,
    );

    return {
      error: "ثبت اولویت دوره‌های تحصیلی انجام نشد.",
    };
  }
}
