import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PortalAssessmentCard } from "@/components/portal/PortalAssessmentCard";
import { PortalEmptyState } from "@/components/portal/PortalEmptyState";
import {
  isPortalError,
  persianPortalError,
  requireGuardianPortalAccess,
} from "@/lib/portal/auth";
import { loadPortalStudentAssessments } from "@/lib/portal/student/assessments";

type PageProps = { params: Promise<{ studentId: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { studentId } = await params;
  const context = await requireGuardianPortalAccess();
  const student = context.authorizedStudents.find(
    (row) => row.studentId === studentId,
  );
  return {
    title: student ? `آزمون‌های ${student.studentName}` : "آزمون‌ها",
    robots: { index: false, follow: false },
  };
}

export const dynamic = "force-dynamic";

export default async function ParentStudentAssessmentsPage({
  params,
}: PageProps) {
  const { studentId } = await params;
  const context = await requireGuardianPortalAccess();
  const student = context.authorizedStudents.find(
    (row) => row.studentId === studentId,
  );
  if (!student) notFound();

  let assessments;
  try {
    assessments = await loadPortalStudentAssessments(context, studentId);
  } catch (error) {
    if (isPortalError(error)) {
      if (error.code === "STUDENT_ACCESS_DENIED") notFound();
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
        <Link
          href={`/portal/parent/students/${studentId}`}
          className="text-sm text-primary underline"
        >
          بازگشت به {student.studentName}
        </Link>
        <h1 className="mt-2 text-xl font-bold text-primary sm:text-2xl">
          آزمون‌ها
        </h1>
        <p className="mt-1 text-sm text-muted">{student.studentName}</p>
      </div>
      {assessments.length === 0 ? (
        <PortalEmptyState
          title="نتیجه‌ای ثبت نشده"
          description="هنوز نتیجه آزمونی برای نمایش وجود ندارد."
        />
      ) : (
        <div className="space-y-3">
          {assessments.map((item) => (
            <PortalAssessmentCard key={item.id} result={item} />
          ))}
        </div>
      )}
    </div>
  );
}
