import { AchievementShowcase } from "@/components/achievements/AchievementShowcase";
import { achievementsContent } from "@/content/home";
import { loadHomepageAchievementShowcase } from "@/lib/website/achievements";

/**
 * Featured achievements strip — placement-driven cinematic showcase.
 */
export async function FeaturedAchievementsSection() {
  const { hero, slider, ticker } = await loadHomepageAchievementShowcase();
  if (hero.length === 0 && slider.length === 0 && ticker.length === 0) {
    return null;
  }

  return (
    <AchievementShowcase
      eyebrow={achievementsContent.eyebrow}
      heading="افتخارات برجسته"
      description={achievementsContent.showcaseDescription}
      headingId="featured-achievements-heading"
      heroItems={hero}
      sliderItems={slider}
      tickerSource={ticker}
      gallerySource={[...hero, ...slider]}
      cta={achievementsContent.showcaseCta}
      variant="home"
    />
  );
}
