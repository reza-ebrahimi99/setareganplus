import {
  heroContent,
  heroCtas,
  heroDisplayStats,
  heroMedia,
  heroSceneIntervalMs,
  heroScenes,
  heroTickerItems,
} from "@/content/home";
import { PremiumHeroStage } from "@/components/home/PremiumHeroStage";

/**
 * Homepage hero — Server Component shell.
 * Content comes from content/home (StarOS content layer).
 * Interactive motion lives in PremiumHeroStage (client boundary).
 */
export function PremiumHero() {
  const ctas = [
    {
      label: heroCtas.primary.label,
      href: heroCtas.primary.href,
      variant: "secondary" as const,
    },
    {
      label: heroCtas.secondary.label,
      href: heroCtas.secondary.href,
      variant: "outline" as const,
    },
    {
      label: heroCtas.tertiary.label,
      href: heroCtas.tertiary.href,
      variant: "outline" as const,
    },
    {
      label: heroCtas.shop.label,
      href: heroCtas.shop.href,
      variant: "outline" as const,
    },
  ];

  return (
    <PremiumHeroStage
      eyebrow={heroContent.eyebrow}
      title={heroContent.title}
      description={heroContent.description}
      slogan={heroContent.slogan}
      scrollHint={heroContent.scrollHint}
      logo={heroMedia.logo}
      ghalamchiLogo={heroMedia.ghalamchiLogo}
      video={heroMedia.video}
      background={heroMedia.background}
      scenes={heroScenes}
      sceneIntervalMs={heroSceneIntervalMs}
      tickerItems={heroTickerItems}
      stats={heroDisplayStats}
      ctas={ctas}
    />
  );
}
