import { AchievementShowcase } from "@/components/achievements/AchievementShowcase";
import {
  achievementItems,
  achievementsContent,
} from "@/content/home";
import { loadHomepageAchievementShowcase } from "@/lib/website/achievements";

const headingId = "achievements-heading";

/**
 * Homepage achievements showcase —
 * CMS placements: Homepage Hero / Slider / Ticker.
 */
export async function AchievementsSection() {
  const { hero, slider, ticker } = await loadHomepageAchievementShowcase();

  return (
    <AchievementShowcase
      eyebrow={achievementsContent.showcaseEyebrow}
      heading={achievementsContent.showcaseHeading}
      description={achievementsContent.showcaseDescription}
      headingId={headingId}
      metrics={achievementItems}
      heroItems={hero}
      sliderItems={slider}
      tickerSource={ticker}
      gallerySource={[...hero, ...slider]}
      cta={achievementsContent.showcaseCta}
      variant="home"
    />
  );
}
