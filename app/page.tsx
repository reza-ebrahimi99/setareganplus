import { AboutSection } from "@/components/home/AboutSection";
import { AchievementsSection } from "@/components/home/AchievementsSection";
import { FaqPreview } from "@/components/home/FaqPreview";
import { FinalCta } from "@/components/home/FinalCta";
import { GallerySection } from "@/components/home/GallerySection";
import { NewsSection } from "@/components/home/NewsSection";
import { PartnershipSection } from "@/components/home/PartnershipSection";
import { FeaturedTeamSection } from "@/components/home/FeaturedTeamSection";
import { PremiumHero } from "@/components/home/PremiumHero";
import { PremiumServices } from "@/components/home/PremiumServices";
import { QalamchiBranchesSection } from "@/components/home/QalamchiBranchesSection";
import { SuccessStoriesSection } from "@/components/home/SuccessStoriesSection";
import { TrustSection } from "@/components/home/TrustSection";
import { SiteShell } from "@/components/layout/SiteShell";

/** Featured team is ISR-cached; admin mutations revalidate "/". */
export const revalidate = 120;

export default function Home() {
  return (
    <SiteShell activePath="/">
      <PremiumHero />
      <FeaturedTeamSection />
      {/* 1) Qalamchi first — never place school content above this */}
      <QalamchiBranchesSection />
      {/* 2) School second — AboutSection must remain school-only */}
      <AboutSection />
      <TrustSection />
      <PremiumServices />
      <AchievementsSection />
      <PartnershipSection />
      <SuccessStoriesSection />
      <GallerySection />
      <NewsSection />
      <FaqPreview />
      <FinalCta />
    </SiteShell>
  );
}
