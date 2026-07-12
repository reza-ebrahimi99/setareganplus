import { ContactCta } from "@/components/home/ContactCta";
import { HeroSection } from "@/components/home/HeroSection";
import { ServicesOverview } from "@/components/home/ServicesOverview";
import { SiteShell } from "@/components/layout/SiteShell";

export default function Home() {
  return (
    <SiteShell activePath="/">
      <HeroSection />
      <ServicesOverview />
      <ContactCta />
    </SiteShell>
  );
}
