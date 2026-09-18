"use server";

import {
  requireGuidanceV2StepAccess,
} from "@/lib/guidance/journey-v2/guard";

import {
  completeGuidanceStep9,
} from "@/lib/guidance/journey/steps/step9-priority-weights";

import {
  GUIDANCE_PRIORITY_FACTORS,
} from "@/lib/guidance/journey/reference-data/priority-factors";

export type GuidanceV2Step9State = {
  ok?: boolean;
  error?: string;
};

const ALL_CODES: readonly string[] =
  GUIDANCE_PRIORITY_FACTORS.map((factor) => factor.code);

export async function submitGuidanceV2Step9Action(
  _previousState: GuidanceV2Step9State,
  formData: FormData,
): Promise<GuidanceV2Step9State> {
  try {
    const raw = formData.get("payload");

    if (typeof raw !== "string") {
      return {
        error: "ترتیب اولویت‌ها نامعتبر است.",
      };
    }

    const orderedCodes = JSON.parse(raw) as string[];

    if (
      !Array.isArray(orderedCodes) ||
      orderedCodes.length !== ALL_CODES.length ||
      new Set(orderedCodes).size !== ALL_CODES.length ||
      !orderedCodes.every((code) => ALL_CODES.includes(code))
    ) {
      return {
        error: "ترتیب اولویت‌ها نامعتبر است.",
      };
    }

    const { context, plan } =
      await requireGuidanceV2StepAccess(9);

    const result = await completeGuidanceStep9({
      organizationId: context.organization.id,
      actorUserId: context.user.id,
      studentId: plan.studentId,
      planId: plan.id,
      planPublicId: plan.publicId,
      orderedCodes,
    });

    return result.ok
      ? { ok: true }
      : { error: result.error };
  } catch (error) {
    console.error(
      "[guidance-v2] step9_submit_failed",
      error,
    );

    return {
      error: "ثبت معیارهای اولویت‌بندی انجام نشد.",
    };
  }
}
