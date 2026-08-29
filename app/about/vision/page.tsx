import { AboutFinalCta } from "@/components/about/AboutFinalCta";
import { CoreValues } from "@/components/about/CoreValues";
import { MissionVision } from "@/components/about/MissionVision";
import { SiteShell } from "@/components/layout/SiteShell";
import { PageHero } from "@/components/ui/PageHero";
import { getPublicPageMetadata } from "@/lib/seo/public-pages";

export const metadata = getPublicPageMetadata("aboutVision");

export default function AboutVisionPage() {
  return (
    <SiteShell activePath="/about/vision">
      <PageHero
        eyebrow="ارزش‌ها و چشم‌انداز"
        title="اصولی که مسیر ستارگان را می‌سازد"
        subtitle="مأموریت، چشم‌انداز و ارزش‌های بنیادین مجموعه — برای خانواده‌هایی که آینده را جدی می‌گیرند."
        breadcrumbs={[
          { label: "صفحه اصلی", href: "/" },
          { label: "درباره ما", href: "/about" },
          { label: "ارزش‌ها و چشم‌انداز" },
        ]}
      />
      <MissionVision />
      <CoreValues />
      <AboutFinalCta />
    </SiteShell>
  );
}
