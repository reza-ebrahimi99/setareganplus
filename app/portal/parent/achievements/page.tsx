import type { Metadata } from "next";
import Link from "next/link";
import { PortalAchievementCard } from "@/components/portal/PortalAchievementCard";
import { PortalEmptyState } from "@/components/portal/PortalEmptyState";
import {
  isPortalError,
  persianPortalError,
  requireGuardianPortalAccess,
} from "@/lib/portal/auth";
import { loadPortalStudentAchievements } from "@/lib/portal/student/achievements";

export const metadata: Metadata = {
  title: "افتخارات فرزندان",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function ParentAchievementsPage() {
  const context = await requireGuardianPortalAccess();
  const achievementStudents = context.authorizedStudents.filter(
    (student) => student.canViewAchievements,
  );

  if (achievementStudents.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-primary sm:text-2xl">افتخارات</h1>
          <p className="mt-1 text-sm text-muted">دستاوردهای فرزندان</p>
        </div>
        <PortalEmptyState
          title="دسترسی به افتخارات ندارید"
          description="برای مشاهده افتخارات با مدرسه تماس بگیرید."
        />
      </div>
    );
  }

  const grouped = await Promise.all(
    achievementStudents.map(async (student) => {
      try {
        const achievements = await loadPortalStudentAchievements(
          context,
          student.studentId,
          { includeCertificates: student.canViewCertificates },
        );
        return { student, achievements, error: null as string | null };
      } catch (error) {
        return {
          student,
          achievements: [],
          error: isPortalError(error) ? persianPortalError(error) : null,
        };
      }
    }),
  );

  const hasAnyAchievements = grouped.some(
    (group) => group.achievements.length > 0,
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-primary sm:text-2xl">افتخارات</h1>
        <p className="mt-1 text-sm text-muted">دستاوردهای فرزندان</p>
      </div>

      {!hasAnyAchievements ? (
        <PortalEmptyState
          title="افتخاری ثبت نشده"
          description="به محض ثبت افتخارات توسط مدرسه، این بخش تکمیل می‌شود."
        />
      ) : (
        grouped.map(({ student, achievements, error }) => (
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
            ) : achievements.length === 0 ? (
              <p className="text-sm text-muted">افتخاری ثبت نشده است.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {achievements.map((achievement) => (
                  <PortalAchievementCard
                    key={achievement.id}
                    achievement={achievement}
                  />
                ))}
              </div>
            )}
          </section>
        ))
      )}
    </div>
  );
}
