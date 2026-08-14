import { AchievementsSection } from "@/components/home/AchievementsSection";
import { AtrinHomeSection } from "@/components/home/AtrinHomeSection";
import { ConsultationCtaSection } from "@/components/home/ConsultationCtaSection";
import { FeaturedTeamSection } from "@/components/home/FeaturedTeamSection";
import { PremiumHero } from "@/components/home/PremiumHero";
import { PremiumServices } from "@/components/home/PremiumServices";
import { SuccessStoriesSection } from "@/components/home/SuccessStoriesSection";
import { TrustSection } from "@/components/home/TrustSection";
import { SiteShell } from "@/components/layout/SiteShell";
import { getPublicPageMetadata } from "@/lib/seo/public-pages";

/** Featured team is ISR-cached; admin mutations revalidate "/". */
export const revalidate = 120;

export const metadata = getPublicPageMetadata("home");

export default async function Home() {
  return (
    <SiteShell activePath="/">
      <PremiumHero />
      <div id="discover" tabIndex={-1} className="h-0 w-0 overflow-hidden" />
      <TrustSection />
      <PremiumServices />
      <AchievementsSection />
      <FeaturedTeamSection />
      <SuccessStoriesSection />
      <ConsultationCtaSection />
      <AtrinHomeSection />
    </SiteShell>
  );
}
