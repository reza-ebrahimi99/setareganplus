import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AssessmentForm } from "@/components/admin/website/AssessmentForm";
import { requirePermission } from "@/lib/auth/require-admin";
import { listAdminAssessmentProviders } from "@/lib/assessment/providers";
import { listAdminStudentGrades } from "@/lib/website/student-grades";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "آزمون جدید" };

export default async function NewAssessmentPage() {
  const session = await requirePermission("website.manage");
  const [providers, grades] = await Promise.all([
    listAdminAssessmentProviders(session.organization.id),
    listAdminStudentGrades(session.organization.id),
  ]);

  return (
    <>
      <AdminPageHeader
        title="آزمون جدید"
        description="ثبت آزمون برای انتشار عمومی و ورود نتایج"
        breadcrumbs={[
          { label: "مدیریت", href: "/admin" },
          { label: "آزمون‌ها", href: "/admin/website/assessments" },
          { label: "جدید" },
        ]}
        compact
      />
      <AssessmentForm
        mode="create"
        providers={providers
          .filter((provider) => provider.isActive && !provider.archivedAt)
          .map((provider) => ({ id: provider.id, name: provider.name }))}
        grades={grades
          .filter((grade) => grade.isActive && !grade.archivedAt)
          .map((grade) => ({ id: grade.id, name: grade.name }))}
      />
    </>
  );
}
