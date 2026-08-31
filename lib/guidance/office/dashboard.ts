/**
 * Student office home — composes existing GuidancePlan + reviews + documents.
 */

import { GuidanceDocumentVerificationStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { loadGuidanceJourneyPlan } from "@/lib/guidance/journey/plan";
import { workspaceExamGroupLabel } from "@/lib/guidance/workspace/presentation";
import { loadStepReviewsForPlan } from "@/lib/guidance/workspace/review";
import {
  GUIDANCE_FIRST_SESSION_SERVICE_SLUG,
  loadGuidanceCounselingSessionState,
} from "@/lib/guidance/journey/booking";
import { getBookingConfirmationPath } from "@/lib/booking/public-url";
import {
  deriveSessionCountdown,
  FIRST_SESSION_DOCUMENTS,
} from "@/lib/guidance/office/first-session";
import {
  deriveOfficeCasePulse,
  type OfficeCasePulse,
} from "@/lib/guidance/office/pulse";

export type OfficeFirstSessionCard = {
  booked: boolean;
  upcoming: boolean;
  countdownLabel: string;
  confirmationHref: string | null;
  calendarHref: string | null;
  checklist: readonly { label: string; hint: string }[];
};

export type OfficeDashboardModel = {
  studentName: string;
  examGroupLabel: string;
  packageLabel: string | null;
  counselorName: string;
  pulse: OfficeCasePulse;
  departmentNote: string;
  firstSession: OfficeFirstSessionCard;
};

export async function loadOfficeDashboard(params: {
  organizationId: string;
  userId: string;
  studentId: string;
}): Promise<OfficeDashboardModel | null> {
  const plan = await loadGuidanceJourneyPlan(params);
  if (!plan) return null;

  const [student, reviews, pendingDoc, sessionState] = await Promise.all([
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
    loadGuidanceCounselingSessionState({
      organizationId: params.organizationId,
      planPublicId: plan.publicId,
      sessionNumber: 1,
    }),
  ]);

  const hasCounselorRevision = reviews.some(
    (row) => row.status === "NEEDS_REVISION" || row.status === "REJECTED",
  );

  const booked = Boolean(sessionState.isActive && sessionState.session);
  const countdown = booked
    ? deriveSessionCountdown(sessionState.session!.startsAtIso)
    : null;
  const trackingCode = sessionState.session?.trackingCode ?? null;
  const confirmationHref =
    booked && trackingCode
      ? getBookingConfirmationPath(
          GUIDANCE_FIRST_SESSION_SERVICE_SLUG,
          trackingCode,
        )
      : null;

  const pulse = deriveOfficeCasePulse({
    currentStep: plan.currentStep,
    completionPercentage: plan.completionPercentage,
    finalApproved: Boolean(plan.finalApprovedAtIso),
    hasCounselorRevision,
    hasPendingDocument: Boolean(pendingDoc),
    unpaid: !plan.packagePaidAtIso,
    firstSessionUpcoming: Boolean(countdown?.upcoming),
    firstSessionCountdown: countdown?.label ?? null,
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
    firstSession: {
      booked,
      upcoming: Boolean(countdown?.upcoming),
      countdownLabel: countdown?.label ?? "",
      confirmationHref,
      calendarHref: confirmationHref ? `${confirmationHref}/calendar` : null,
      checklist: FIRST_SESSION_DOCUMENTS,
    },
  };
}
