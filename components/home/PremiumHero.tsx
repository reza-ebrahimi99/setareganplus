import {
  heroContent,
  heroCtas,
  heroDisplayStats,
  heroMedia,
} from "@/content/home";
import { PremiumHeroStage } from "@/components/home/PremiumHeroStage";

/**
 * Homepage hero — Server Component shell.
 * Single cinematic composition (no carousel). Content from content/home.
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
      brand={heroContent.brand}
      title={heroContent.title}
      subtitle={heroContent.subtitle}
      scrollHint={heroContent.scrollHint}
      logo={heroMedia.logo}
      ghalamchiLogo={heroMedia.ghalamchiLogo}
      video={heroMedia.video}
      background={heroMedia.background}
      stats={heroDisplayStats}
      ctas={ctas}
    />
  );
}
