/**
 * Guidance ERP — portal student service home.
 * Pre-upload: Journey screen.
 * Post-upload: Initial Analysis Center (same route — no new paths).
 */

import { notFound, redirect } from "next/navigation";
import { GuidanceAnalysisScreen } from "@/components/guidance/analysis/GuidanceAnalysisScreen";
import { PortalJourneyHeroBanner } from "@/components/portal/journey/PortalJourneyHero";
import { PortalJourneyScreen } from "@/components/portal/journey/PortalJourneyScreen";
import { buildAnalysisPresentationModel } from "@/lib/guidance/analysis";
import { requireStudentPortalAccess } from "@/lib/portal/auth";
import {
  loadStudentIntelligenceSnapshot,
  StudentInsightEngine,
} from "@/lib/portal/intelligence";

export const dynamic = "force-dynamic";

export default async function GuidancePortalServicePage() {
  const context = await requireStudentPortalAccess();
  const studentId = context.activeLink.studentId;
  if (!studentId) {
    redirect("/portal/select-account");
  }

  const snapshot = await loadStudentIntelligenceSnapshot(context, studentId, {
    includeAssessments: false,
    includeAchievements: false,
    includeExperience: false,
  });

  if (!snapshot.flags.guidanceEnabled) {
    notFound();
  }

  const guidance = StudentInsightEngine.guidance(snapshot);

  if (!guidance.hasPlan || !guidance.journey || !snapshot.guidance.plan) {
    return (
      <div className="portal-journey portal-journey--empty">
        <PortalJourneyHeroBanner
          hero={guidance.emptyHero ?? {
            eyebrow: "سامانه جامع انتخاب رشته",
            headline: "آماده‌ای مسیر را شروع کنی؟",
            support: "هنوز پرونده‌ای تشکیل نشده.",
            accent: "gold",
            icon: "route",
            cta: {
              href: "/guidance/pre-register",
              label: "شروع پیش‌ثبت‌نام",
            },
          }}
        />
      </div>
    );
  }

  const analysis = buildAnalysisPresentationModel({
    plan: snapshot.guidance.plan,
    steps: snapshot.guidance.steps ?? [],
    studentName: snapshot.profile.studentName,
    gradeName: snapshot.profile.gradeName,
    schoolYear: snapshot.profile.schoolYear,
    averageScore: snapshot.dashboard.averageScore,
  });

  if (analysis.visible) {
    return <GuidanceAnalysisScreen model={analysis} />;
  }

  return <PortalJourneyScreen model={guidance.journey} />;
}
