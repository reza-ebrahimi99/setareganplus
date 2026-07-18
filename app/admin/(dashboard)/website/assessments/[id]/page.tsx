import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AssessmentForm } from "@/components/admin/website/AssessmentForm";
import { requirePermission } from "@/lib/auth/require-admin";
import { loadAdminAssessment } from "@/lib/assessment/assessments";
import { listAdminAssessmentProviders } from "@/lib/assessment/providers";
import { listAdminStudentGrades } from "@/lib/website/student-grades";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "ویرایش آزمون" };

type PageProps = { params: Promise<{ id: string }> };

function toDateInputValue(date: Date | null): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export default async function EditAssessmentPage({ params }: PageProps) {
  const session = await requirePermission("website.manage");
  const { id } = await params;
  const [assessment, providers, grades] = await Promise.all([
    loadAdminAssessment(session.organization.id, id),
    listAdminAssessmentProviders(session.organization.id),
    listAdminStudentGrades(session.organization.id),
  ]);
  if (!assessment) notFound();

  return (
    <>
      <AdminPageHeader
        title={assessment.title}
        description="ویرایش جزئیات آزمون و وضعیت انتشار"
        breadcrumbs={[
          { label: "مدیریت", href: "/admin" },
          { label: "آزمون‌ها", href: "/admin/website/assessments" },
          { label: assessment.title },
        ]}
        compact
      />
      <AssessmentForm
        mode="edit"
        providers={providers.map((provider) => ({
          id: provider.id,
          name: provider.name,
        }))}
        grades={grades.map((grade) => ({ id: grade.id, name: grade.name }))}
        assessment={{
          id: assessment.id,
          providerId: assessment.providerId,
          gradeId: assessment.gradeId,
          title: assessment.title,
          slug: assessment.slug,
          assessmentType: assessment.assessmentType,
          assessmentDate: toDateInputValue(assessment.assessmentDate),
          schoolYear: assessment.schoolYear,
          participants: assessment.participants,
          maxScore: assessment.maxScore,
          description: assessment.description,
          isPublished: assessment.isPublished,
          archivedAt: assessment.archivedAt,
        }}
      />
    </>
  );
}
