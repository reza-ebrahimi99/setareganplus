import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AchievementForm } from "@/components/admin/website/AchievementForm";
import { requirePermission } from "@/lib/auth/require-admin";
import {
  achievementCertificatePublicUrl,
  achievementCoverPublicUrl,
  listAdminStudentOptions,
  loadAdminAchievement,
} from "@/lib/website/achievement-admin";
import {
  categoriesForAchievementForm,
  listAdminAchievementCategories,
} from "@/lib/website/achievement-categories";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "ویرایش افتخار" };

type PageProps = { params: Promise<{ id: string }> };

function toDateInputValue(date: Date | null): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export default async function EditAchievementPage({ params }: PageProps) {
  const { id } = await params;
  const session = await requirePermission("website.manage");
  const [achievement, students, categories] = await Promise.all([
    loadAdminAchievement(session.organization.id, id),
    listAdminStudentOptions(session.organization.id),
    listAdminAchievementCategories(session.organization.id),
  ]);
  if (!achievement) notFound();

  return (
    <>
      <AdminPageHeader
        title={`ویرایش ${achievement.title}`}
        description="به‌روزرسانی افتخار عمومی دانش‌آموز"
        breadcrumbs={[
          { label: "مدیریت", href: "/admin" },
          { label: "افتخارات", href: "/admin/website/achievements" },
          { label: achievement.title },
        ]}
        compact
      />
      <AchievementForm
        mode="edit"
        students={students.map((student) => ({
          id: student.id,
          name: student.fullName,
          gradeName: student.grade.name,
        }))}
        categories={categoriesForAchievementForm(
          categories,
          achievement.categoryId,
        )}
        achievement={{
          id: achievement.id,
          studentId: achievement.studentId,
          categoryId: achievement.categoryId,
          title: achievement.title,
          slug: achievement.slug,
          shortDescription: achievement.shortDescription,
          description: achievement.description,
          achievementDate: toDateInputValue(achievement.achievementDate),
          schoolYear: achievement.schoolYear,
          issuer: achievement.issuer,
          level: achievement.level,
          place: achievement.place,
          score: achievement.score,
          seoTitle: achievement.seoTitle,
          seoDescription: achievement.seoDescription,
          displayOrder: achievement.displayOrder,
          featuredPriority: achievement.featuredPriority,
          isFeatured: achievement.isFeatured,
          isPublished: achievement.isPublished,
          archivedAt: achievement.archivedAt,
          coverUrl: achievementCoverPublicUrl(achievement.coverMedia),
          certificateUrl: achievementCertificatePublicUrl(
            achievement.certificateMedia,
          ),
        }}
      />
    </>
  );
}
