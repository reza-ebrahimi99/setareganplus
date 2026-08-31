/**
 * Student office home — composes existing GuidancePlan + reviews + documents.
 */

import { GuidanceDocumentVerificationStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { loadGuidanceJourneyPlan } from "@/lib/guidance/journey/plan";
import { workspaceExamGroupLabel } from "@/lib/guidance/workspace/presentation";
import { loadStepReviewsForPlan } from "@/lib/guidance/workspace/review";
import {
  deriveOfficeCasePulse,
  type OfficeCasePulse,
} from "@/lib/guidance/office/pulse";

export type OfficeDashboardModel = {
  studentName: string;
  examGroupLabel: string;
  packageLabel: string | null;
  counselorName: string;
  pulse: OfficeCasePulse;
  departmentNote: string;
};

export async function loadOfficeDashboard(params: {
  organizationId: string;
  userId: string;
  studentId: string;
}): Promise<OfficeDashboardModel | null> {
  const plan = await loadGuidanceJourneyPlan(params);
  if (!plan) return null;

  const [student, reviews, pendingDoc] = await Promise.all([
    prisma.student.findFirst({
      where: { id: params.studentId, organizationId: params.organizationId },
      select: { fullName: true, firstName: true, lastName: true },
    }),
    loadStepReviewsForPlan({
      organizationId: params.organizationId,
      planId: plan.id,
    }),
    prisma.guidanceDocument.findFirst({
      where: {
        organizationId: params.organizationId,
        planId: plan.id,
        deletedAt: null,
        isLatest: true,
        verificationStatus: GuidanceDocumentVerificationStatus.PENDING,
      },
      select: { id: true },
    }),
  ]);

  const hasCounselorRevision = reviews.some(
    (row) => row.status === "NEEDS_REVISION" || row.status === "REJECTED",
  );

  const pulse = deriveOfficeCasePulse({
    currentStep: plan.currentStep,
    completionPercentage: plan.completionPercentage,
    finalApproved: Boolean(plan.finalApprovedAtIso),
    hasCounselorRevision,
    hasPendingDocument: Boolean(pendingDoc),
    unpaid: !plan.packagePaidAtIso,
  });

  return {
    studentName:
      student?.fullName.trim() ||
      `${student?.firstName ?? ""} ${student?.lastName ?? ""}`.trim() ||
      "دانش‌آموز",
    examGroupLabel: workspaceExamGroupLabel(plan.examGroup),
    packageLabel: plan.guidancePackageCode,
    counselorName: "مهندس رضا ابراهیمی",
    pulse,
    departmentNote:
      "این دفتر متعلق به دپارتمان انتخاب رشته قلم‌چی نسیم‌شهر است. هر فهرست نهایی را مهندس رضا ابراهیمی می‌بیند.",
  };
}
