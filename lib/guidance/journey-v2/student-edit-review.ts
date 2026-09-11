/**
 * Marks a case as needing counselor re-review after a student edits
 * a completed earlier step. Does not delete counselor outputs.
 */

import { GuidanceStepReviewStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  isHistoricalEdit,
  studentEditRequiresCounselorReview,
} from "@/lib/guidance/journey-v2/step-access-policy";

export async function recordStudentHistoricalEdit(params: {
  organizationId: string;
  planId: string;
  actorUserId: string;
  stepId: number;
  currentStep: number;
  hasCounselorDownstreamWork: boolean;
  summary: string;
}): Promise<{ needsReview: boolean }> {
  if (!isHistoricalEdit(params.stepId, params.currentStep)) {
    return { needsReview: false };
  }

  const needsReview = studentEditRequiresCounselorReview(params.stepId, {
    currentStep: params.currentStep,
    hasCounselorDownstreamWork: params.hasCounselorDownstreamWork,
  });

  if (!needsReview) return { needsReview: false };

  await prisma.$transaction(async (tx) => {
    await tx.guidancePlan.update({
      where: { id: params.planId },
      data: {
        v2NeedsReviewAt: new Date(),
        v2NeedsReviewStep: params.stepId,
      },
    });

    const review = await tx.guidanceStepReview.upsert({
      where: {
        organizationId_planId_stepNumber: {
          organizationId: params.organizationId,
          planId: params.planId,
          stepNumber: params.stepId,
        },
      },
      create: {
        organizationId: params.organizationId,
        planId: params.planId,
        stepNumber: params.stepId,
        status: GuidanceStepReviewStatus.NEEDS_REVISION,
        studentMessage: "نیازمند بررسی مجدد",
        revisionRequestedAt: new Date(),
      },
      update: {
        status: GuidanceStepReviewStatus.NEEDS_REVISION,
        studentMessage: "نیازمند بررسی مجدد",
        revisionRequestedAt: new Date(),
      },
    });

    await tx.guidanceStepReviewEvent.create({
      data: {
        organizationId: params.organizationId,
        reviewId: review.id,
        kind: "EDITED",
        status: GuidanceStepReviewStatus.NEEDS_REVISION,
        actorUserId: params.actorUserId,
        studentMessage: "نیازمند بررسی مجدد",
        metadata: {
          stepId: params.stepId,
          summary: params.summary,
        },
      },
    });
  });

  return { needsReview: true };
}

export async function planHasCounselorDownstreamWork(params: {
  organizationId: string;
  planId: string;
}): Promise<boolean> {
  const list = await prisma.guidanceChoiceList.findFirst({
    where: {
      organizationId: params.organizationId,
      planId: params.planId,
    },
    select: { id: true },
  });
  return Boolean(list);
}
