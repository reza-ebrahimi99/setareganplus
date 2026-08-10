import {
  heroContent,
  heroCtas,
  heroDisplayStats,
  heroMedia,
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
      label: heroCtas.gallery.label,
      href: heroCtas.gallery.href,
      variant: "outline" as const,
    },
  ];

  return (
    <PremiumHeroStage
      eyebrow={heroContent.eyebrow}
      title={heroContent.title}
      subtitle={heroContent.subtitle}
      description={heroContent.description}
      slogan={heroContent.slogan}
      logo={heroMedia.logo}
      ghalamchiLogo={heroMedia.ghalamchiLogo}
      video={heroMedia.video}
      background={heroMedia.background}
      stats={heroDisplayStats}
      ctas={ctas}
    />
  );
}
