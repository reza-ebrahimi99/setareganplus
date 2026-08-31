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
import { loadFinalExamScores } from "@/lib/guidance/office/final-exam-store";
import {
  nextOfficeIntakeHref,
  officeIntakeContinueLabel,
  officeIntakeProgressPercent,
} from "@/lib/guidance/office/intake-href";
import { MAJOR_OFFICE_INTEREST, MAJOR_OFFICE_JOURNEY, MAJOR_OFFICE_SESSION } from "@/lib/guidance/office/nav";
import { loadGuidanceOnboardingRecord } from "@/lib/guidance/onboarding";
import {
  draftHasAcademic,
  draftHasIdentity,
} from "@/lib/guidance/onboarding-draft";
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

export type OfficeTodayTask = {
  title: string;
  body: string;
  href: string;
  label: string;
};

export type OfficeCounselorActivity = {
  title: string;
  body: string;
} | null;

export type OfficeDashboardModel = {
  studentName: string;
  examGroupLabel: string;
  packageLabel: string | null;
  counselorName: string;
  pulse: OfficeCasePulse;
  departmentNote: string;
  firstSession: OfficeFirstSessionCard;
  todayTask: OfficeTodayTask;
  unreadMessages: number;
  latestCounselorActivity: OfficeCounselorActivity;
  intakePercent: number;
};

export async function loadOfficeDashboard(params: {
  organizationId: string;
  userId: string;
  studentId: string;
}): Promise<OfficeDashboardModel | null> {
  const plan = await loadGuidanceJourneyPlan(params);
  if (!plan) return null;

  const [student, reviews, pendingDoc, sessionState, onboarding, examScores] =
    await Promise.all([
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
      loadGuidanceOnboardingRecord({
        organizationId: params.organizationId,
        userId: params.userId,
      }),
      loadFinalExamScores({
        organizationId: params.organizationId,
        planPublicId: plan.publicId,
        examGroup: plan.examGroup,
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

  const transcript = await prisma.guidanceDocument.findFirst({
    where: {
      organizationId: params.organizationId,
      planId: plan.id,
      documentType: "FINAL_GRADES",
      isLatest: true,
      deletedAt: null,
    },
    select: { id: true },
  });

  const intakeFlags = {
    hasIdentityProfile: onboarding ? draftHasIdentity(onboarding.draft) : false,
    hasAcademicProfile: onboarding ? draftHasAcademic(onboarding.draft) : false,
    finalExamComplete: examScores.summary.complete,
    hasTranscript: Boolean(transcript),
  };
  const intakePercent = officeIntakeProgressPercent(intakeFlags);
  const intakeHref = nextOfficeIntakeHref(intakeFlags);
  const latestWithMessage = [...reviews]
    .reverse()
    .find((row) => row.studentMessage);
  const latestCounselorActivity = latestWithMessage
    ? {
        title: "آخرین پیام مهندس ابراهیمی",
        body: latestWithMessage.studentMessage ?? "",
      }
    : hasCounselorRevision
      ? {
          title: "پرونده برای اصلاح برگشت",
          body: "پیام دفتر را در نقشه مسیر بخوانید.",
        }
      : pendingDoc
        ? {
            title: "مدرک روی میز مشاور است",
            body: "بازبینی کارنامه معمولاً یک تا دو روز کاری زمان می‌برد.",
          }
        : null;

  const todayTask: OfficeTodayTask = booked && countdown?.upcoming
    ? {
        title: "آمادگی جلسه اول",
        body: countdown.label,
        href: MAJOR_OFFICE_SESSION,
        label: "مدارک جلسه",
      }
    : !intakeFlags.hasIdentityProfile ||
        !intakeFlags.hasAcademicProfile ||
        !intakeFlags.finalExamComplete ||
        !intakeFlags.hasTranscript
      ? {
          title: officeIntakeContinueLabel(intakeFlags),
          body: pulse.waitingBody,
          href: intakeHref,
          label: officeIntakeContinueLabel(intakeFlags),
        }
      : {
          title: pulse.waitingTitle,
          body: pulse.waitingBody,
          href:
            plan.currentStep === 2
              ? MAJOR_OFFICE_INTEREST
              : plan.currentStep === 4
                ? MAJOR_OFFICE_SESSION
                : MAJOR_OFFICE_JOURNEY,
          label: "ادامه مسیر",
        };

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
    todayTask,
    unreadMessages: reviews.filter((row) => Boolean(row.studentMessage)).length,
    latestCounselorActivity,
    intakePercent,
  };
}
