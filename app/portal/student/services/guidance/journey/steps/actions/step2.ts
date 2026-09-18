"use server";

import { requireGuidanceV2StepAccess } from "@/lib/guidance/journey-v2/guard";
import { advanceGuidanceJourneyV2Step } from "@/lib/guidance/journey-v2/advance";
import { prisma } from "@/lib/prisma";
import { saveGuidanceStepData } from "@/lib/guidance/journey/step-store";
import type { JourneyV2FormState } from "./step1";

const PRIMARY = new Set([
  "MATHEMATICS",
  "EXPERIMENTAL_SCIENCES",
  "HUMANITIES",
]);

const SECONDARY = new Set([
  "ARTS",
  "LANGUAGES",
]);

export async function submitGuidanceV2Step2Action(
  _state: JourneyV2FormState,
  formData: FormData,
): Promise<JourneyV2FormState> {
  try {
    const { context, plan } = await requireGuidanceV2StepAccess(2);

    const primary = String(formData.get("primary") ?? "");
    const secondary = formData
      .getAll("secondary")
      .map(String)
      .filter((value) => SECONDARY.has(value));

    if (!PRIMARY.has(primary)) {
      return {
        error: "لطفاً گروه آزمایشی اصلی را انتخاب کنید.",
      };
    }

    await saveGuidanceStepData({
      organizationId: context.organization.id,
      actorUserId: context.user.id,
      category: "guidance-journey-v2-step2",
      kind: "guidance-journey-v2-step2",
      planId: plan.id,
      planPublicId: plan.publicId,
      data: {
        primary,
        secondary,
      },
      filenamePrefix: "guidance-v2-step2",
    });

    if (plan.currentStep === 2) {
      await prisma.guidancePlan.update({
      where: { id: plan.id },
      data: { examGroup: primary as never },
    });

    const advanced = await advanceGuidanceJourneyV2Step({
        organizationId: context.organization.id,
        actorUserId: context.user.id,
        studentId: plan.studentId,
        stepId: 2,
      });

      if (!advanced.ok) {
        return {
          error: advanced.error,
          fieldErrors: advanced.fieldErrors,
        };
      }
    }

    return { ok: true };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "ثبت گروه آزمایشی انجام نشد.",
    };
  }
}
