import type { Metadata } from "next";
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
import {
  HOME_DESCRIPTION,
  HOME_TITLE,
  SITE_NAME,
} from "@/lib/seo/site-metadata";
import { loadHomepageQalamchiCards } from "@/lib/website/marketing-cards-public";

/** Featured team / marketing cards are ISR-cached; admin mutations revalidate "/". */
export const revalidate = 120;

export const metadata: Metadata = {
  title: {
    absolute: HOME_TITLE,
  },
  description: HOME_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "fa_IR",
    url: "/",
    siteName: SITE_NAME,
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
  },
};

export default async function Home() {
  const qalamchiCards = await loadHomepageQalamchiCards();

  return (
    <SiteShell activePath="/">
      <PremiumHero />
      <FeaturedTeamSection />
      {/* 1) Qalamchi first — never place school content above this */}
      <QalamchiBranchesSection cards={qalamchiCards} />
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
