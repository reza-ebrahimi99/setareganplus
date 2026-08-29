/**
 * Guidance ERP — portal student service home.
 * Pre-upload: Journey screen.
 * Post-upload: Initial Analysis Center.
 * ?view=interest: Interest Discovery Center (same route).
 */

import { notFound, redirect } from "next/navigation";
import { GuidanceAnalysisScreen } from "@/components/guidance/analysis/GuidanceAnalysisScreen";
import { InterestAssessmentWidget } from "@/components/guidance/interest/InterestAssessmentWidget";
import { InterestDiscoveryScreen } from "@/components/guidance/interest/InterestDiscoveryScreen";
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

  const steps = buildGuidancePortalTimeline(plan, {
    interestAssessmentStatus: interestSession.status,
  });

  const interestModel = buildInterestAssessmentPresentationModel({
    session: interestSession,
    studentName: snapshot.profile.studentName,
  });
  const interestWidget = buildInterestDashboardWidget(interestSession);

  if (viewInterest) {
    if (!plan.latestFinalGrades) {
      redirect("/portal/student/services/guidance");
    }
    return <InterestDiscoveryScreen model={interestModel} />;
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
