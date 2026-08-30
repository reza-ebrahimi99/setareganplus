import type { Metadata } from "next";
import { ExperienceJourneyScreen } from "@/components/portal/apps/ExperienceJourneyScreen";
import { notFound } from "next/navigation";
import { requireStudentPortalAccess } from "@/lib/portal/auth";
import {
  loadStudentIntelligenceSnapshot,
  StudentInsightEngine,
} from "@/lib/portal/intelligence";

export const metadata: Metadata = {
  title: "خانه تجربه",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function StudentExperienceHomePage() {
  const context = await requireStudentPortalAccess();
  const studentId = context.authorizedStudents[0]?.studentId;
  if (!studentId) {
    notFound();
  }

  const snapshot = await loadStudentIntelligenceSnapshot(context, studentId, {
    includeAssessments: false,
    includeAchievements: false,
    includeExperience: true,
  });

  if (!snapshot.flags.sxpEnabled) {
    notFound();
  }

  const experience = StudentInsightEngine.experience(snapshot);
  if (!experience.home) {
    notFound();
  }

  return <ExperienceJourneyScreen home={experience.home} />;
}
