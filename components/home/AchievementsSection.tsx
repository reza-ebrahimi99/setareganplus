import { AchievementShowcase } from "@/components/achievements/AchievementShowcase";
import {
  achievementItems,
  achievementsContent,
} from "@/content/home";
import {
  HOMEPAGE_ACHIEVEMENT_TIMELINE_LIMIT,
  loadFeaturedAchievements,
  loadPublicAchievementTimeline,
} from "@/lib/website/achievements";

const headingId = "achievements-heading";

/**
 * Homepage achievements showcase —
 * institution metrics + featured cards + compact timeline.
 * Data from StarOS achievements library; copy from content/home.
 */
export async function AchievementsSection() {
  const [featured, timeline] = await Promise.all([
    loadFeaturedAchievements(),
    loadPublicAchievementTimeline({
      limit: HOMEPAGE_ACHIEVEMENT_TIMELINE_LIMIT,
    }),
  ]);

  return (
    <AchievementShowcase
      eyebrow={achievementsContent.showcaseEyebrow}
      heading={achievementsContent.showcaseHeading}
      description={achievementsContent.showcaseDescription}
      headingId={headingId}
      metrics={achievementItems}
      featured={featured}
      timeline={timeline}
      timelineHeading={achievementsContent.timelineHeading}
      timelineDescription={achievementsContent.timelineDescription}
      cta={achievementsContent.showcaseCta}
      variant="home"
    />
  );
}
