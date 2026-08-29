import type { Metadata } from "next";
import { AssessmentCenterScreen } from "@/components/portal/apps/AssessmentCenterScreen";
import { PortalEmptyState } from "@/components/portal/PortalEmptyState";
import { requireStudentPortalAccess } from "@/lib/portal/auth";
import {
  loadStudentIntelligenceSnapshot,
  StudentInsightEngine,
} from "@/lib/portal/intelligence";

export const metadata: Metadata = {
  title: "مرکز آزمون",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function StudentPortalAssessmentsPage() {
  const context = await requireStudentPortalAccess();
  const studentId = context.authorizedStudents[0]!.studentId;

  const snapshot = await loadStudentIntelligenceSnapshot(context, studentId, {
    includeAchievements: false,
    includeExperience: false,
  });

  if (snapshot.errors.assessments || snapshot.assessments == null) {
    return (
      <PortalEmptyState
        title="دسترسی محدود"
        description="امکان بارگذاری سوابق آزمون برای این حساب وجود ندارد."
      />
    );
  }

  const model = StudentInsightEngine.assessments(snapshot);
  return (
    <AssessmentCenterScreen results={model.results} insights={model.insights} />
  );
}
