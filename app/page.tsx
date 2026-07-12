import { EnrollmentJourneySection } from "@/components/home/EnrollmentJourneySection";
import { FaqPreview } from "@/components/home/FaqPreview";
import { FinalCta } from "@/components/home/FinalCta";
import { PlatformVision } from "@/components/home/PlatformVision";
import { PremiumHero } from "@/components/home/PremiumHero";
import { PremiumServices } from "@/components/home/PremiumServices";
import { TrustSection } from "@/components/home/TrustSection";
import { SiteShell } from "@/components/layout/SiteShell";

export default function Home() {
  return (
    <SiteShell activePath="/">
      <PremiumHero />
      <TrustSection />
      <PremiumServices />
      <PlatformVision />
      <EnrollmentJourneySection />
      <FaqPreview />
      <FinalCta />
    </SiteShell>
  );
}
