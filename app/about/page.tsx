import { AboutFinalCta } from "@/components/about/AboutFinalCta";
import { AboutHero } from "@/components/about/AboutHero";
import { AboutStatistics } from "@/components/about/AboutStatistics";
import { AiStarOsBlock } from "@/components/about/AiStarOsBlock";
import { CampusGallery } from "@/components/about/CampusGallery";
import { CoreValues } from "@/components/about/CoreValues";
import { EcosystemGrid } from "@/components/about/EcosystemGrid";
import { FounderAchievements } from "@/components/about/FounderAchievements";
import { MissionVision } from "@/components/about/MissionVision";
import { StoryTimeline } from "@/components/about/StoryTimeline";
import { SiteShell } from "@/components/layout/SiteShell";
import { getPublicPageMetadata } from "@/lib/seo/public-pages";

export const metadata = getPublicPageMetadata("about");

export default function AboutPage() {
  return (
    <SiteShell activePath="/about">
      <AboutHero />
      <StoryTimeline />
      <AboutStatistics />
      <MissionVision />
      <CoreValues />
      <EcosystemGrid />
      <CampusGallery />
      <FounderAchievements />
      <AiStarOsBlock />
      <AboutFinalCta />
    </SiteShell>
  );
}
