import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StudentForm } from "@/components/admin/website/StudentForm";
import { requirePermission } from "@/lib/auth/require-admin";
import {
  gradeRequiresMajor,
  listAdminStudentGrades,
} from "@/lib/website/student-grades";
import { listAdminStudentMajors } from "@/lib/website/student-majors";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "دانش‌آموز جدید" };

export default async function NewStudentPage() {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;
  const [grades, majors] = await Promise.all([
    listAdminStudentGrades(organizationId),
    listAdminStudentMajors(organizationId),
  ]);

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
          .map((grade) => ({
            id: grade.id,
            name: grade.name,
            requiresMajor: gradeRequiresMajor(grade.slug),
          }))}
        majors={majors
          .filter((major) => major.isActive && !major.archivedAt)
          .map((major) => ({ id: major.id, name: major.name }))}
      />
    </>
  );
}
