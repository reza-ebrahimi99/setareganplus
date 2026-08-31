/**
 * Student office Journey Tracker — GuidancePlan + reviews + documents.
 */

import { prisma } from "@/lib/prisma";
import { loadGuidanceJourneyPlan } from "@/lib/guidance/journey/plan";
import { loadStepReviewsForPlan } from "@/lib/guidance/workspace/review";
import {
  deriveOfficeJourneyTracker,
  type OfficeJourneyTrackerModel,
} from "@/lib/guidance/office/tracker";

export async function loadOfficeJourneyTracker(params: {
  organizationId: string;
  userId: string;
  studentId: string;
}): Promise<OfficeJourneyTrackerModel | null> {
  const plan = await loadGuidanceJourneyPlan(params);
  if (!plan) return null;

  const [reviews, finalGrades, examDoc] = await Promise.all([
    loadStepReviewsForPlan({
      organizationId: params.organizationId,
      planId: plan.id,
    }),
    prisma.guidanceDocument.findFirst({
      where: {
        organizationId: params.organizationId,
        planId: plan.id,
        documentType: "FINAL_GRADES",
        isLatest: true,
        deletedAt: null,
      },
      select: { id: true },
    }),
    prisma.guidanceDocument.findFirst({
      where: {
        organizationId: params.organizationId,
        planId: plan.id,
        documentType: "EXAM_RESULT",
        isLatest: true,
        deletedAt: null,
      },
      select: { id: true },
    }),
  ]);

  return deriveOfficeJourneyTracker({
    currentStep: plan.currentStep,
    completedSteps: plan.completedSteps,
    completionPercentage: plan.completionPercentage,
    finalApproved: Boolean(plan.finalApprovedAtIso),
    personalInfoConfirmed: Boolean(plan.personalInfoConfirmedAtIso),
    packageCode: plan.guidancePackageCode,
    packagePaid: Boolean(plan.packagePaidAtIso),
    choicesApproved: Boolean(plan.choicesApprovedAtIso),
    hasFinalGrades: Boolean(finalGrades),
    hasExamResult: Boolean(examDoc),
    reviews: reviews.map((row) => ({
      stepNumber: row.stepNumber,
      status: row.status,
      studentMessage: row.studentMessage,
      rejectReason: row.rejectReason,
    })),
  });
}
