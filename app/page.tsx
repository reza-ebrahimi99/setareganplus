import { AchievementsSection } from "@/components/home/AchievementsSection";
import { AtrinHomeSection } from "@/components/home/AtrinHomeSection";
import { ConsultationCtaSection } from "@/components/home/ConsultationCtaSection";
import { EducationalJourneySection } from "@/components/home/EducationalJourneySection";
import { FeaturedTeamSection } from "@/components/home/FeaturedTeamSection";
import { PremiumHero } from "@/components/home/PremiumHero";
import { SuccessStoriesSection } from "@/components/home/SuccessStoriesSection";
import { WhySetareganSection } from "@/components/home/WhySetareganSection";
import { SiteShell } from "@/components/layout/SiteShell";
import { getPublicPageMetadata } from "@/lib/seo/public-pages";

/** Featured team / achievements are ISR-cached; admin mutations revalidate "/". */
export const revalidate = 120;

export const metadata = getPublicPageMetadata("home");

export default async function Home() {
  return (
    <SiteShell activePath="/">
      <PremiumHero />
      <div id="discover" tabIndex={-1} className="h-0 w-0 overflow-hidden" />
      <WhySetareganSection />
      <EducationalJourneySection />
      <AchievementsSection />
      <FeaturedTeamSection />
      <SuccessStoriesSection />
      <ConsultationCtaSection />
      <AtrinHomeSection />
    </SiteShell>
  );
}
