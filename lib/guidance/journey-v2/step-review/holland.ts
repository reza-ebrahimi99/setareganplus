/**
 * Holland (step 4) retake — attempts, basis selection, no overwrite.
 */

import { GuidanceStepReviewEventKind, GuidanceStepReviewStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  mergeNeedsReviewFlags,
  previewStepChangeImpact,
} from "@/lib/guidance/journey-v2/step-review/dependencies";
import { parseNeedsReviewFlags } from "@/lib/guidance/journey-v2/step-review/plan-json";
import { notifyStudentPortal } from "@/lib/counselor-os/appointment-notify";
import { appendGuidanceStepData } from "@/lib/guidance/journey/step-store";
import { addOpenRevisionStep, parseOpenRevisionSteps } from "@/lib/guidance/journey-v2/step-review/plan-json";
import { studentResubmitStep } from "@/lib/guidance/journey-v2/step-review/service";
import type { AssessmentAnswers } from "@/lib/guidance/journey/assessment/scoring";

const CATEGORY = "guidance-v2-interest-assessment";
const KIND = "guidance-v2-interest-assessment";

export async function requestHollandRetake(params: {
  organizationId: string;
  studentId: string;
  counselorUserId: string;
  reason: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const reason = params.reason.trim();
  if (!reason) return { ok: false, error: "علت درخواست تکرار آزمون الزامی است." };

  const plan = await prisma.guidancePlan.findFirst({
    where: {
      organizationId: params.organizationId,
      studentId: params.studentId,
      deletedAt: null,
      journeyVersion: 2,
    },
    select: { id: true, publicId: true, userId: true, v2StepNeedsReviewFlags: true, v2OpenRevisionSteps: true },
  });
  if (!plan) return { ok: false, error: "پرونده یافت نشد." };

  const impact = previewStepChangeImpact(4);
  const flags = mergeNeedsReviewFlags(parseNeedsReviewFlags(plan.v2StepNeedsReviewFlags), impact.affectedSteps);
  const openSteps = addOpenRevisionStep(parseOpenRevisionSteps(plan.v2OpenRevisionSteps), 4);

  const placeholder = await appendGuidanceStepData<Record<string, never>>({
    organizationId: params.organizationId,
    actorUserId: params.counselorUserId,
    category: CATEGORY,
    kind: KIND,
    planId: plan.id,
    planPublicId: plan.publicId,
    data: {},
    filenamePrefix: "guidance-v2-interest-pending",
  });

  const last = await prisma.guidanceHollandAttempt.findFirst({
    where: { organizationId: params.organizationId, planId: plan.id },
    orderBy: { attemptNumber: "desc" },
    select: { attemptNumber: true },
  });
  const attemptNumber = (last?.attemptNumber ?? 0) + 1;

  const review = await prisma.guidanceStepReview.upsert({
    where: {
      organizationId_planId_stepNumber: {
        organizationId: params.organizationId,
        planId: plan.id,
        stepNumber: 4,
      },
    },
    create: {
      organizationId: params.organizationId,
      planId: plan.id,
      stepNumber: 4,
      status: GuidanceStepReviewStatus.REVISION_REQUESTED,
      rejectReason: reason,
      studentMessage: "لطفاً آزمون رغبت‌سنجی را مجدداً انجام دهید.",
      counselorUserId: params.counselorUserId,
      revisionRequestedAt: new Date(),
    },
    update: {
      status: GuidanceStepReviewStatus.REVISION_REQUESTED,
      rejectReason: reason,
      studentMessage: "لطفاً آزمون رغبت‌سنجی را مجدداً انجام دهید.",
      counselorUserId: params.counselorUserId,
      revisionRequestedAt: new Date(),
    },
  });

  await prisma.$transaction([
    prisma.guidanceHollandAttempt.create({
      data: {
        organizationId: params.organizationId,
        planId: plan.id,
        attemptNumber,
        mediaAssetId: placeholder.mediaAssetId,
        completedAt: null,
        isActiveBasis: false,
        requestedByUserId: params.counselorUserId,
        requestReason: reason,
      },
    }),
    prisma.guidancePlan.update({
      where: { id: plan.id },
      data: {
        v2HollandRetakePending: true,
        v2StepNeedsReviewFlags: flags,
        v2OpenRevisionSteps: openSteps,
      },
    }),
  ]);

  await prisma.guidanceStepReviewEvent.create({
    data: {
      organizationId: params.organizationId,
      reviewId: review.id,
      actorUserId: params.counselorUserId,
      kind: GuidanceStepReviewEventKind.HOLLAND_RETAKE_REQUESTED,
      status: GuidanceStepReviewStatus.REVISION_REQUESTED,
      rejectReason: reason,
      metadata: { attemptNumber },
    },
  });

  await notifyStudentPortal({
    organizationId: params.organizationId,
    studentId: params.studentId,
    title: "انجام مجدد آزمون رغبت‌سنجی",
    body: reason,
    entityType: "GuidanceHollandRetake",
    entityId: review.id,
    dedupeKey: `holland-retake:${review.id}:${attemptNumber}`,
  });

  return { ok: true };
}

export async function completeHollandAttemptOnSubmit(params: {
  organizationId: string;
  planId: string;
  planPublicId: string;
  studentUserId: string;
  studentId: string;
  answers: AssessmentAnswers;
  mediaAssetId: string;
  isRetakeFlow: boolean;
}): Promise<void> {
  const now = new Date();
  const pending = await prisma.guidanceHollandAttempt.findFirst({
    where: {
      organizationId: params.organizationId,
      planId: params.planId,
      completedAt: null,
    },
    orderBy: { attemptNumber: "desc" },
  });

  if (pending) {
    await prisma.guidanceHollandAttempt.update({
      where: { id: pending.id },
      data: {
        mediaAssetId: params.mediaAssetId,
        completedAt: now,
      },
    });
  } else {
    const last = await prisma.guidanceHollandAttempt.findFirst({
      where: { organizationId: params.organizationId, planId: params.planId },
      orderBy: { attemptNumber: "desc" },
    });
    const attemptNumber = (last?.attemptNumber ?? 0) + 1;
    await prisma.guidanceHollandAttempt.create({
      data: {
        organizationId: params.organizationId,
        planId: params.planId,
        attemptNumber,
        mediaAssetId: params.mediaAssetId,
        completedAt: now,
        isActiveBasis: attemptNumber === 1,
      },
    });
  }

  if (params.isRetakeFlow) {
    await prisma.guidancePlan.update({
      where: { id: params.planId },
      data: { v2HollandRetakePending: false },
    });
    await studentResubmitStep({
      organizationId: params.organizationId,
      planId: params.planId,
      studentUserId: params.studentUserId,
      stepNumber: 4,
    });
  }
}

export async function setHollandActiveBasis(params: {
  organizationId: string;
  planId: string;
  attemptId: string;
  counselorUserId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const attempt = await prisma.guidanceHollandAttempt.findFirst({
    where: {
      id: params.attemptId,
      organizationId: params.organizationId,
      planId: params.planId,
      completedAt: { not: null },
    },
  });
  if (!attempt) return { ok: false, error: "تلاش آزمون یافت نشد." };

  const impact = previewStepChangeImpact(4);
  const plan = await prisma.guidancePlan.findFirst({
    where: { id: params.planId },
    select: { v2StepNeedsReviewFlags: true, studentId: true },
  });
  if (!plan) return { ok: false, error: "پرونده یافت نشد." };

  const flags = mergeNeedsReviewFlags(parseNeedsReviewFlags(plan.v2StepNeedsReviewFlags), impact.affectedSteps);

  await prisma.$transaction([
    prisma.guidanceHollandAttempt.updateMany({
      where: { organizationId: params.organizationId, planId: params.planId },
      data: { isActiveBasis: false },
    }),
    prisma.guidanceHollandAttempt.update({
      where: { id: attempt.id },
      data: { isActiveBasis: true },
    }),
    prisma.guidancePlan.update({
      where: { id: params.planId },
      data: { v2StepNeedsReviewFlags: flags, v2HollandRetakePending: false },
    }),
  ]);

  const review = await prisma.guidanceStepReview.findUnique({
    where: {
      organizationId_planId_stepNumber: {
        organizationId: params.organizationId,
        planId: params.planId,
        stepNumber: 4,
      },
    },
    select: { id: true },
  });
  if (review) {
    await prisma.guidanceStepReviewEvent.create({
      data: {
        organizationId: params.organizationId,
        reviewId: review.id,
        actorUserId: params.counselorUserId,
        kind: GuidanceStepReviewEventKind.HOLLAND_BASIS_SELECTED,
        status: GuidanceStepReviewStatus.REVIEWED,
        metadata: { attemptId: attempt.id, attemptNumber: attempt.attemptNumber },
      },
    });
  }

  return { ok: true };
}
