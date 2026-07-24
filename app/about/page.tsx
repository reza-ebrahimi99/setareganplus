import {
  AboutContactSection,
  AboutFooterCta,
  AboutGallerySection,
  AboutHero,
  AboutMapSection,
  AboutServicesSection,
  AboutStatsSection,
  AboutTimeline,
  BrandStorySection,
  FloatingContactBar,
  FounderMessageSection,
  PhilosophySection,
  VisionSection,
  WhySetareganSection,
} from "@/components/about";
import { SiteShell } from "@/components/layout/SiteShell";
import { getPublicPageMetadata } from "@/lib/seo/public-pages";

export const metadata = getPublicPageMetadata("about");

export default function AboutPage() {
  return (
    <SiteShell activePath="/about">
      <div className="about-page pb-[4.5rem] md:pb-0">
        <AboutHero />
        <BrandStorySection />
        <AboutTimeline />
        <PhilosophySection />
        <AboutServicesSection />
        <WhySetareganSection />
        <AboutStatsSection />
        <AboutGallerySection />
        <FounderMessageSection />
        <VisionSection />
        <AboutContactSection />
        <AboutMapSection />
        <AboutFooterCta />
        <FloatingContactBar />
      </div>
    </SiteShell>
  );
}
