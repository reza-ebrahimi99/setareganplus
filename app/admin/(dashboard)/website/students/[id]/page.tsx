import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StudentForm } from "@/components/admin/website/StudentForm";
import { requirePermission } from "@/lib/auth/require-admin";
import {
  loadAdminStudent,
  studentPortraitPublicUrl,
} from "@/lib/website/student-admin";
import {
  gradeRequiresMajor,
  listAdminStudentGrades,
} from "@/lib/website/student-grades";
import { listAdminStudentMajors } from "@/lib/website/student-majors";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "ویرایش دانش‌آموز" };

type PageProps = { params: Promise<{ id: string }> };

export default async function EditStudentPage({ params }: PageProps) {
  const { id } = await params;
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;
  const [student, grades, majors] = await Promise.all([
    loadAdminStudent(organizationId, id),
    listAdminStudentGrades(organizationId),
    listAdminStudentMajors(organizationId),
  ]);
  if (!student) notFound();

  const gradeOptions = grades
    .filter(
      (grade) =>
        (grade.isActive && !grade.archivedAt) || grade.id === student.gradeId,
    )
    .map((grade) => ({
      id: grade.id,
      name: grade.name,
      requiresMajor: gradeRequiresMajor(grade.slug),
    }));

  const majorOptions = majors
    .filter(
      (major) =>
        (major.isActive && !major.archivedAt) || major.id === student.majorId,
    )
    .map((major) => ({ id: major.id, name: major.name }));

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
        grades={gradeOptions}
        majors={majorOptions}
        student={{
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          fullName: student.fullName,
          gradeId: student.gradeId,
          majorId: student.majorId,
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
