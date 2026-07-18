import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AchievementForm } from "@/components/admin/website/AchievementForm";
import { requirePermission } from "@/lib/auth/require-admin";
import { listAdminStudentOptions } from "@/lib/website/achievement-admin";
import { listAdminAchievementCategories } from "@/lib/website/achievement-categories";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "افتخار جدید" };

export default async function NewAchievementPage() {
  const session = await requirePermission("website.manage");
  const [students, categories] = await Promise.all([
    listAdminStudentOptions(session.organization.id),
    listAdminAchievementCategories(session.organization.id),
  ]);

  return (
    <>
      <AdminPageHeader
        title="افتخار جدید"
        description="ثبت افتخار یا گواهی مرتبط با دانش‌آموز"
        breadcrumbs={[
          { label: "مدیریت", href: "/admin" },
          { label: "افتخارات", href: "/admin/website/achievements" },
          { label: "جدید" },
        ]}
        compact
      />
      <AchievementForm
        mode="create"
        students={students.map((student) => ({
          id: student.id,
          name: student.fullName,
          gradeName: student.grade.name,
        }))}
        categories={categories
          .filter((category) => category.isActive && !category.archivedAt)
          .map((category) => ({ id: category.id, name: category.name }))}
      />
    </>
  );
}
