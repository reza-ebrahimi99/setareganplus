import type { Metadata } from "next";
import { PortalAssessmentCard } from "@/components/portal/PortalAssessmentCard";
import { PortalEmptyState } from "@/components/portal/PortalEmptyState";
import { requireStudentPortalAccess } from "@/lib/portal/auth";
import { loadPortalStudentAssessments } from "@/lib/portal/student/assessments";
import { persianPortalError, isPortalError } from "@/lib/portal/auth";

export const metadata: Metadata = {
  title: "آزمون‌ها",
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-primary sm:text-2xl">آزمون‌ها</h1>
        <p className="mt-1 text-sm text-muted">سوابق و نتایج آزمون‌های شما</p>
      </div>

      {results.length === 0 ? (
        <PortalEmptyState
          title="هنوز نتیجه‌ای ثبت نشده"
          description="پس از برگزاری آزمون و ثبت نتایج توسط مدرسه، سوابق اینجا نمایش داده می‌شود."
        />
      ) : (
        <div className="space-y-4">
          {results.map((result) => (
            <PortalAssessmentCard key={result.id} result={result} />
          ))}
        </div>
      )}
    </div>
  );
}
