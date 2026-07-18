import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StudentForm } from "@/components/admin/website/StudentForm";
import { requirePermission } from "@/lib/auth/require-admin";
import { listAdminStudentGrades } from "@/lib/website/student-grades";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "دانش‌آموز جدید" };

export default async function NewStudentPage() {
  const session = await requirePermission("website.manage");
  const grades = await listAdminStudentGrades(session.organization.id);

  return (
    <>
      <AdminPageHeader
        title="دانش‌آموز جدید"
        description="ثبت پروفایل عمومی دانش‌آموز برای وب‌سایت مؤسسه"
        breadcrumbs={[
          { label: "مدیریت", href: "/admin" },
          { label: "دانش‌آموزان", href: "/admin/website/students" },
          { label: "جدید" },
        ]}
        compact
      />
      <StudentForm
        mode="create"
        grades={grades
          .filter((grade) => grade.isActive && !grade.archivedAt)
          .map((grade) => ({ id: grade.id, name: grade.name }))}
      />
    </>
  );
}
