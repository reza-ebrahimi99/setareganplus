import Link from "next/link";
import { AchievementCard } from "@/components/achievements/AchievementCard";
import type { PublicAchievementCard } from "@/lib/website/achievements";

type StudentAchievementsSectionProps = {
  achievements: PublicAchievementCard[];
  studentName: string;
};

export function StudentAchievementsSection({
  achievements,
  studentName,
}: StudentAchievementsSectionProps) {
  if (achievements.length === 0) return null;

  return (
    <section
      aria-labelledby="student-achievements-heading"
      className="admin-card space-y-5 p-6 sm:p-8"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            id="student-achievements-heading"
            className="text-xl font-bold text-primary"
          >
            افتخارات
          </h2>
          <p className="mt-1 text-sm text-muted">
            موفقیت‌ها و گواهی‌های {studentName}
          </p>
        </div>
        <Link href="/achievements" className="text-sm text-primary underline">
          همه افتخارات
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {achievements.map((achievement) => (
          <AchievementCard key={achievement.id} achievement={achievement} />
        ))}
      </div>
    </section>
  );
}
