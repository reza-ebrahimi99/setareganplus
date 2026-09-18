"use server";

import {
  requireGuidanceV2StepAccess,
} from "@/lib/guidance/journey-v2/guard";

import {
  completeGuidanceStep7,
  type ProvincePreferenceItem,
} from "@/lib/guidance/journey/steps/step7-city-preferences";

export type GuidanceV2Step7State = {
  ok?: boolean;
  error?: string;
};

export async function submitGuidanceV2Step7Action(
  _previousState: GuidanceV2Step7State,
  formData: FormData,
): Promise<GuidanceV2Step7State> {
  try {
    const raw = formData.get("payload");

    if (typeof raw !== "string") {
      return {
        error: "اطلاعات استان‌ها نامعتبر است.",
      };
    }

    const items = JSON.parse(raw) as ProvincePreferenceItem[];

    if (!Array.isArray(items)) {
      return {
        error: "اطلاعات استان‌ها نامعتبر است.",
      };
    }

    const { context, plan } =
      await requireGuidanceV2StepAccess(7);

    const result = await completeGuidanceStep7({
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
      "[guidance-v2] step7_submit_failed",
      error,
    );

    return {
      error: "ثبت اولویت استان‌ها انجام نشد.",
    };
  }
}
