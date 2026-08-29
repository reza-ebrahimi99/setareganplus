import type { Metadata } from "next";
import { AssessmentCenterScreen } from "@/components/portal/apps/AssessmentCenterScreen";
import { PortalEmptyState } from "@/components/portal/PortalEmptyState";
import { requireStudentPortalAccess } from "@/lib/portal/auth";
import { buildAssessmentCenterInsights } from "@/lib/portal/student/assessment-insights";
import { loadPortalStudentAssessments } from "@/lib/portal/student/assessments";
import { persianPortalError, isPortalError } from "@/lib/portal/auth";

export const metadata: Metadata = {
  title: "مرکز آزمون",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function StudentPortalAssessmentsPage() {
  const context = await requireStudentPortalAccess();
  const studentId = context.authorizedStudents[0]!.studentId;

  let results;
  try {
    results = await loadPortalStudentAssessments(context, studentId);
  } catch (error) {
    if (isPortalError(error)) {
      return (
        <PortalEmptyState
          title="دسترسی محدود"
          description={persianPortalError(error)}
        />
      );
    }
    throw error;
  }

  const insights = buildAssessmentCenterInsights(results);
  return <AssessmentCenterScreen results={results} insights={insights} />;
}
