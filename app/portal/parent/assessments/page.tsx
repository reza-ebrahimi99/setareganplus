import type { Metadata } from "next";
import Link from "next/link";
import { PortalAssessmentCard } from "@/components/portal/PortalAssessmentCard";
import { PortalEmptyState } from "@/components/portal/PortalEmptyState";
import {
  isPortalError,
  persianPortalError,
  requireGuardianPortalAccess,
} from "@/lib/portal/auth";
import { loadPortalStudentAssessments } from "@/lib/portal/student/assessments";

export const metadata: Metadata = {
  title: "آزمون‌های فرزندان",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function ParentAssessmentsPage() {
  const context = await requireGuardianPortalAccess();
  const academicStudents = context.authorizedStudents.filter(
    (student) => student.canViewAcademicData,
  );

  if (academicStudents.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-primary sm:text-2xl">آزمون‌ها</h1>
          <p className="mt-1 text-sm text-muted">سوابق آزمون فرزندان</p>
        </div>
        <PortalEmptyState
          title="دسترسی به آزمون‌ها ندارید"
          description="برای مشاهده نتایج آزمون با مدرسه تماس بگیرید."
        />
      </div>
    );
  }

  const grouped = await Promise.all(
    academicStudents.map(async (student) => {
      try {
        const results = await loadPortalStudentAssessments(
          context,
          student.studentId,
        );
        return { student, results, error: null as string | null };
      } catch (error) {
        return {
          student,
          results: [],
          error: isPortalError(error) ? persianPortalError(error) : null,
        };
      }
    }),
  );

  const hasAnyResults = grouped.some((group) => group.results.length > 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-primary sm:text-2xl">آزمون‌ها</h1>
        <p className="mt-1 text-sm text-muted">سوابق آزمون فرزندان</p>
      </div>

      {!hasAnyResults ? (
        <PortalEmptyState
          title="هنوز نتیجه‌ای ثبت نشده"
          description="پس از ثبت نتایج آزمون توسط مدرسه، سوابق اینجا نمایش داده می‌شود."
        />
      ) : (
        grouped.map(({ student, results, error }) => (
          <section key={student.studentId} className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-primary sm:text-lg">
                {student.studentName}
              </h2>
              <Link
                href={`/portal/parent/students/${student.studentId}`}
                className="text-sm font-medium text-secondary underline-offset-2 hover:underline"
              >
                جزئیات
              </Link>
            </div>
            {error ? (
              <p className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-muted">
                {error}
              </p>
            ) : results.length === 0 ? (
              <p className="text-sm text-muted">نتیجه‌ای ثبت نشده است.</p>
            ) : (
              <div className="space-y-4">
                {results.map((result) => (
                  <PortalAssessmentCard key={result.id} result={result} />
                ))}
              </div>
            )}
          </section>
        ))
      )}
    </div>
  );
}
