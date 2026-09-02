import type { Metadata } from "next";
import { DiscoverShell } from "@/components/guidance/discover/DiscoverShell";
import { DiscoverSystemsExplorer } from "@/components/guidance/discover/DiscoverSystemsExplorer";
import { DISCOVER_SYSTEMS } from "@/lib/guidance/discover/systems";
import { discoverWebPageJsonLd } from "@/lib/guidance/discover/jsonld";
import { systemHref } from "@/lib/guidance/discover/catalog";
import { loadDiscoveryVisitor } from "@/lib/guidance/discover/visitor";
import { createPageMetadata } from "@/lib/seo/create-page-metadata";

export const metadata: Metadata = createPageMetadata({
  path: "/discover/systems",
  title: "نظام‌های دانشگاهی | کانون کشف ستارگان پلاس",
  description:
    "روزانه، شبانه، پردیس، آزاد، پیام نور، غیرانتفاعی، فرهنگیان و مؤسسات خاص را پیش از چیدن فهرست بشناسید.",
});

export default async function DiscoverSystemsIndexPage() {
  const visitor = await loadDiscoveryVisitor();
  const cards = DISCOVER_SYSTEMS.map((item) => ({
    slug: item.slug,
    href: systemHref(item.slug),
    title: item.title,
    kicker: item.kicker,
    lead: item.lead,
  }));

  return (
    <DiscoverShell
      breadcrumbs={[
        { label: "خانه", href: "/" },
        { label: "کانون کشف", href: "/discover" },
        { label: "نظام دانشگاهی" },
      ]}
      activePath="/discover/systems"
      jsonLd={discoverWebPageJsonLd({
        path: "/discover/systems",
        title: "نظام‌های دانشگاهی",
        description: "مقایسه کیفی دوره‌ها و مؤسسات، بدون رقم شهریه جعلی.",
        breadcrumbs: [
          { name: "خانه", path: "/" },
          { name: "کانون کشف", path: "/discover" },
          { name: "نظام دانشگاهی", path: "/discover/systems" },
        ],
      })}
      visitor={visitor}
    >
      <DiscoverSystemsExplorer systems={cards} />
    </DiscoverShell>
  );
}
