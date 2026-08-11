import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { AchievementCard } from "@/components/achievements/AchievementCard";
import { loadFeaturedAchievements } from "@/lib/website/achievements";

/**
 * Reusable homepage strip for featured achievements.
 * Not mounted on `/` yet — import when ready for launch.
 */
export async function FeaturedAchievementsSection() {
  const achievements = await loadFeaturedAchievements();
  if (achievements.length === 0) return null;

  return (
    <section
      aria-labelledby="featured-achievements-heading"
      className="border-y border-border/60 bg-gradient-to-b from-background via-surface to-background py-14 sm:py-16"
    >
      <Container>
        <SectionHeader
          eyebrow="مؤسسه علمی ستارگان"
          heading="افتخارات برجسته"
          description="نمونه‌ای از موفقیت‌های اخیر دانش‌آموزان در المپیادها، پذیرش‌ها، مسابقات و گواهی‌ها."
          headingId="featured-achievements-heading"
        />

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {achievements.map((achievement, index) => (
            <AchievementCard
              key={achievement.id}
              achievement={achievement}
              priority={index === 0}
            />
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <Link
            href="/achievements"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-primary/92 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
          >
            مشاهده همه افتخارات
          </Link>
        </div>
      </Container>
    </section>
  );
}
