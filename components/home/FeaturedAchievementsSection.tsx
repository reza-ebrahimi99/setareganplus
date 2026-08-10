import { AchievementShowcase } from "@/components/achievements/AchievementShowcase";
import { achievementsContent } from "@/content/home";
import { loadHomepageAchievementShowcase } from "@/lib/website/achievements";

/**
 * Featured achievements strip — same showcase engine as homepage section,
 * without institution metric cards. Safe to mount wherever a lighter strip is needed.
 */
export async function FeaturedAchievementsSection() {
  const { featured, timeline } = await loadHomepageAchievementShowcase();
  if (featured.length === 0 && timeline.length === 0) return null;

  return (
    <AchievementShowcase
      eyebrow={achievementsContent.eyebrow}
      heading="افتخارات برجسته"
      description={achievementsContent.showcaseDescription}
      headingId="featured-achievements-heading"
      featured={featured}
      timeline={timeline}
      timelineHeading={achievementsContent.timelineHeading}
      timelineDescription={achievementsContent.timelineDescription}
      cta={achievementsContent.showcaseCta}
      variant="home"
    />
  );
}
