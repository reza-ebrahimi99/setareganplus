/**
 * Marks a case as needing counselor re-review after a student edits
 * a completed earlier step. Does not delete counselor outputs.
 */

import { prisma } from "@/lib/prisma";
import {
  isHistoricalEdit,
  studentEditRequiresCounselorReview,
} from "@/lib/guidance/journey-v2/step-access-policy";
import { parseOpenRevisionSteps } from "@/lib/guidance/journey-v2/step-review/plan-json";
import { studentResubmitStep } from "@/lib/guidance/journey-v2/step-review/service";

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

  const planRow = await prisma.guidancePlan.findFirst({
    where: { id: params.planId, organizationId: params.organizationId },
    select: { v2OpenRevisionSteps: true },
  });
  const open = parseOpenRevisionSteps(planRow?.v2OpenRevisionSteps);
  if (open.includes(params.stepId)) {
    await studentResubmitStep({
      organizationId: params.organizationId,
      planId: params.planId,
      studentUserId: params.actorUserId,
      stepNumber: params.stepId,
    });
    return { needsReview: true };
  }

  if (!needsReview) return { needsReview: false };

  await prisma.guidancePlan.update({
    where: { id: params.planId },
    data: {
      v2NeedsReviewAt: new Date(),
      v2NeedsReviewStep: params.stepId,
    },
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
