"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AuditAction } from "@/generated/prisma/enums";
import { advanceGuidanceJourneyV2Step } from "@/lib/guidance/journey-v2/advance";
import { requireGuidanceV2StepAccess } from "@/lib/guidance/journey-v2/guard";
import { guidanceJourneyV2StepPath } from "@/lib/guidance/journey-v2/catalog";
import { saveGuidanceStepData } from "@/lib/guidance/journey/step-store";
import {
  validateGuidanceV2Step1Input,
  type GuidanceV2Step1Input,
} from "@/lib/guidance/journey-v2/steps/step1-validation";
import {
  planHasCounselorDownstreamWork,
  recordStudentHistoricalEdit,
} from "@/lib/guidance/journey-v2/student-edit-review";
import { prisma } from "@/lib/prisma";
import { composeStudentFullName } from "@/lib/website/student-slug";

export type JourneyV2FormState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

function field(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function submitGuidanceV2Step1Action(
  _prev: JourneyV2FormState,
  formData: FormData,
): Promise<JourneyV2FormState> {
  const access = await requireGuidanceV2StepAccess(1);
  const input: GuidanceV2Step1Input = {
    firstName: field(formData, "firstName"),
    lastName: field(formData, "lastName"),
    nationalId: field(formData, "nationalId"),
    gender: field(formData, "gender"),
    birthDateJalali: field(formData, "birthDateJalali"),
    nativeProvince: field(formData, "nativeProvince"),
    regionQuota: field(formData, "regionQuota"),
    specialQuota: field(formData, "specialQuota"),
    highSchoolAverage: field(formData, "highSchoolAverage"),
    alternateMobile: field(formData, "alternateMobile"),
  };

  const validated = validateGuidanceV2Step1Input(input);
  if (!validated.ok) {
    return {
      error: validated.error,
      fieldErrors: validated.fieldErrors,
    };
  }

  const fullName = composeStudentFullName(
    validated.data.firstName,
    validated.data.lastName,
  );

  await prisma.$transaction([
    prisma.student.update({
      where: { id: access.plan.studentId },
      data: {
        firstName: validated.data.firstName,
        lastName: validated.data.lastName,
        fullName,
      },
    }),
    prisma.user.update({
      where: { id: access.context.user.id },
      data: {
        firstName: validated.data.firstName,
        lastName: validated.data.lastName,
      },
    }),
    prisma.guidancePlan.update({
      where: { id: access.plan.id },
      data: {
        quota: validated.data.specialQuota as never,
        highSchoolAverage: validated.data.highSchoolAverage,
        personalInfoConfirmedAt: new Date(),
      },
    }),
    prisma.auditLog.create({
      data: {
        organizationId: access.plan.organizationId,
        actorUserId: access.context.user.id,
        action: AuditAction.GUIDANCE_STATUS_CHANGED,
        entityType: "GuidancePlan",
        entityId: access.plan.id,
        metadata: {
          step: 1,
          historicalEdit: access.plan.currentStep !== 1,
        },
      },
    }),
  ]);

  await saveGuidanceStepData({
    organizationId: access.plan.organizationId,
    actorUserId: access.context.user.id,
    category: "guidance-journey-v2-step1",
    kind: "guidance-journey-v2-step1",
    planId: access.plan.id,
    planPublicId: access.plan.publicId,
    data: validated.data,
    filenamePrefix: "guidance-v2-step1",
  });

  const hasDownstream = await planHasCounselorDownstreamWork({
    organizationId: access.plan.organizationId,
    planId: access.plan.id,
  });
  await recordStudentHistoricalEdit({
    organizationId: access.plan.organizationId,
    planId: access.plan.id,
    actorUserId: access.context.user.id,
    stepId: 1,
    currentStep: access.plan.currentStep,
    hasCounselorDownstreamWork: hasDownstream,
    summary: "ویرایش اطلاعات هویتی مرحله ۱",
  });

  if (access.plan.currentStep === 1) {
    const advanced = await advanceGuidanceJourneyV2Step({
      organizationId: access.plan.organizationId,
      actorUserId: access.context.user.id,
      studentId: access.plan.studentId,
      stepId: 1,
    });
    if (!advanced.ok) {
      return { error: advanced.error, fieldErrors: advanced.fieldErrors };
    }
    revalidatePath(guidanceJourneyV2StepPath(1));
    redirect(guidanceJourneyV2StepPath(2));
  }

  revalidatePath(guidanceJourneyV2StepPath(1));
  redirect(guidanceJourneyV2StepPath(access.plan.currentStep));
}
