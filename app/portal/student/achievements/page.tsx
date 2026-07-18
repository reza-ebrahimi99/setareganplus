import type { Metadata } from "next";
import { PortalAchievementCard } from "@/components/portal/PortalAchievementCard";
import { PortalEmptyState } from "@/components/portal/PortalEmptyState";
import {
  isPortalError,
  persianPortalError,
  requireStudentPortalAccess,
} from "@/lib/portal/auth";
import { loadPortalStudentAchievements } from "@/lib/portal/student/achievements";

export const metadata: Metadata = {
  title: "افتخارات",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function StudentPortalAchievementsPage() {
  const context = await requireStudentPortalAccess();
  const studentId = context.authorizedStudents[0]!.studentId;

  let achievements;
  try {
    achievements = await loadPortalStudentAchievements(context, studentId);
  } catch (error) {
    if (isPortalError(error)) {
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
        <h1 className="text-xl font-bold text-primary sm:text-2xl">افتخارات</h1>
        <p className="mt-1 text-sm text-muted">دستاوردها و افتخارات ثبت‌شده</p>
      </div>

      {achievements.length === 0 ? (
        <PortalEmptyState
          title="افتخاری ثبت نشده"
          description="به محض ثبت افتخارات توسط مدرسه، این بخش تکمیل می‌شود."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {achievements.map((achievement, index) => (
            <PortalAchievementCard
              key={achievement.id}
              achievement={achievement}
              priority={index === 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
