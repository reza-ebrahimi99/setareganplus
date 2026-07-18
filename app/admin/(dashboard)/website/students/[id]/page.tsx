import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StudentForm } from "@/components/admin/website/StudentForm";
import { requirePermission } from "@/lib/auth/require-admin";
import {
  loadAdminStudent,
  studentPortraitPublicUrl,
} from "@/lib/website/student-admin";
import { listAdminStudentGrades } from "@/lib/website/student-grades";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "ویرایش دانش‌آموز" };

type PageProps = { params: Promise<{ id: string }> };

export default async function EditStudentPage({ params }: PageProps) {
  const { id } = await params;
  const session = await requirePermission("website.manage");
  const [student, grades] = await Promise.all([
    loadAdminStudent(session.organization.id, id),
    listAdminStudentGrades(session.organization.id),
  ]);
  if (!student) notFound();

  return (
    <>
      <AdminPageHeader
        title={`ویرایش ${student.fullName}`}
        description="به‌روزرسانی پروفایل عمومی دانش‌آموز"
        breadcrumbs={[
          { label: "مدیریت", href: "/admin" },
          { label: "دانش‌آموزان", href: "/admin/website/students" },
          { label: student.fullName },
        ]}
        compact
      />
      <StudentForm
        mode="edit"
        grades={grades
          .filter((grade) => grade.isActive && !grade.archivedAt)
          .map((grade) => ({ id: grade.id, name: grade.name }))}
        student={{
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          fullName: student.fullName,
          gradeId: student.gradeId,
          biography: student.biography,
          parentName: student.parentName,
          schoolYear: student.schoolYear,
          slug: student.slug,
          seoTitle: student.seoTitle,
          seoDescription: student.seoDescription,
          displayOrder: student.displayOrder,
          featuredPriority: student.featuredPriority,
          isActive: student.isActive,
          isFeatured: student.isFeatured,
          archivedAt: student.archivedAt,
          portraitUrl: studentPortraitPublicUrl(student.portraitMedia, "w480"),
        }}
      />
    </>
  );
}
