/**
 * Guidance ERP — portal student service home.
 * Pre-upload: Journey screen.
 * Post-upload: Initial Analysis Center.
 * ?view=interest: Interest Discovery Center.
 * ?view=profile: Student 360° Profile.
 */

import { notFound, redirect } from "next/navigation";
import { GuidanceAnalysisScreen } from "@/components/guidance/analysis/GuidanceAnalysisScreen";
import { InterestAssessmentWidget } from "@/components/guidance/interest/InterestAssessmentWidget";
import { InterestDiscoveryScreen } from "@/components/guidance/interest/InterestDiscoveryScreen";
import { Student360ProfileScreen } from "@/components/guidance/profile360/Student360ProfileScreen";
import { StudentProfile360Widget } from "@/components/guidance/profile360/StudentProfile360Widget";
import { PortalJourneyHeroBanner } from "@/components/portal/journey/PortalJourneyHero";
import { PortalJourneyScreen } from "@/components/portal/journey/PortalJourneyScreen";
import { buildAnalysisPresentationModel } from "@/lib/guidance/analysis";
import {
  buildGuidanceJourneyModel,
  buildGuidanceEmptyJourneyHero,
} from "@/lib/guidance/journey-presentation";
import {
  buildInterestAssessmentPresentationModel,
  buildInterestDashboardWidget,
  loadGuidanceInterestSession,
} from "@/lib/guidance/interest";
import {
  buildStudentProfileDashboardWidget,
  buildStudentProfilePresentationModel,
  isProfile360JourneyComplete,
  loadGuidanceProfile360Session,
} from "@/lib/guidance/profile360";
import { buildGuidancePortalTimeline } from "@/lib/guidance/timeline";
import { requireStudentPortalAccess } from "@/lib/portal/auth";
import {
  loadStudentIntelligenceSnapshot,
  StudentInsightEngine,
} from "@/lib/portal/intelligence";

export const dynamic = "force-dynamic";

type GuidancePortalServicePageProps = {
  searchParams?: Promise<{ view?: string }>;
};

export default async function GuidancePortalServicePage({
  searchParams,
}: GuidancePortalServicePageProps) {
  const context = await requireStudentPortalAccess();
  const studentId = context.activeLink.studentId;
  if (!studentId) {
    redirect("/portal/select-account");
  }

  const params = searchParams ? await searchParams : {};
  const viewInterest = params.view === "interest";
  const viewProfile = params.view === "profile";

  const snapshot = await loadStudentIntelligenceSnapshot(context, studentId, {
    includeAssessments: false,
    includeAchievements: false,
    includeExperience: false,
  });

  if (!snapshot.flags.guidanceEnabled) {
    notFound();
  }

  const plan = snapshot.guidance.plan;
  if (!plan) {
    const guidance = StudentInsightEngine.guidance(snapshot);
    return (
      <div className="portal-journey portal-journey--empty">
        <PortalJourneyHeroBanner
          hero={
            guidance.emptyHero ??
            buildGuidanceEmptyJourneyHero()
          }
        />
      </div>
    );
  }

  const interestSession = await loadGuidanceInterestSession({
    organizationId: context.organization.id,
    userId: context.user.id,
    planId: plan.id,
    planPublicId: plan.publicId,
  });

  const profileSession = await loadGuidanceProfile360Session({
    organizationId: context.organization.id,
    userId: context.user.id,
    planId: plan.id,
    planPublicId: plan.publicId,
  });

  const profileSeed = {
    studentName: snapshot.profile.studentName,
    gradeName: snapshot.profile.gradeName,
    schoolYear: snapshot.profile.schoolYear,
    examGroup: plan.examGroup,
  };

  const profileJourneyComplete = isProfile360JourneyComplete(
    profileSession,
    profileSeed,
  );

  const steps = buildGuidancePortalTimeline(plan, {
    interestAssessmentStatus: interestSession.status,
    profileCompletionStatus: profileJourneyComplete
      ? "completed"
      : profileSession.status === "not_started"
        ? "not_started"
        : "in_progress",
  });

  const interestModel = buildInterestAssessmentPresentationModel({
    session: interestSession,
    studentName: snapshot.profile.studentName,
  });
  const interestWidget = buildInterestDashboardWidget(interestSession);

  const profileModel = buildStudentProfilePresentationModel({
    session: profileSession,
    studentName: snapshot.profile.studentName,
    portraitUrl: snapshot.profile.portraitUrl,
    gradeName: snapshot.profile.gradeName,
    schoolYear: snapshot.profile.schoolYear,
    examGroup: plan.examGroup,
  });
  const profileWidget = buildStudentProfileDashboardWidget(
    profileSession,
    profileSeed,
  );

  if (viewInterest) {
    if (!plan.latestFinalGrades) {
      redirect("/portal/student/services/guidance");
    }
    return <InterestDiscoveryScreen model={interestModel} />;
  }

  if (viewProfile) {
    if (interestSession.status !== "completed") {
      redirect("/portal/student/services/guidance?view=interest");
    }
    return <Student360ProfileScreen model={profileModel} />;
  }

  const analysis = buildAnalysisPresentationModel({
    plan,
    steps,
    studentName: snapshot.profile.studentName,
    gradeName: snapshot.profile.gradeName,
    schoolYear: snapshot.profile.schoolYear,
    averageScore: snapshot.dashboard.averageScore,
  });

  if (analysis.visible) {
    return (
      <div className="guidance-home-with-interest">
        <InterestAssessmentWidget widget={interestWidget} />
        {interestSession.status === "completed" ? (
          <StudentProfile360Widget widget={profileWidget} />
        ) : null}
        <GuidanceAnalysisScreen model={analysis} />
      </div>
    );
  }

  const journey = buildGuidanceJourneyModel({
    steps,
    publicId: plan.publicId,
  });

  return <PortalJourneyScreen model={journey} />;
}
