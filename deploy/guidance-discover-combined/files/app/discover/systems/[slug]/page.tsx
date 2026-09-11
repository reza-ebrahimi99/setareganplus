import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DiscoverShell } from "@/components/guidance/discover/DiscoverShell";
import { SystemEncyclopediaDetail } from "@/components/guidance/discover/SystemEncyclopediaDetail";
import { DISCOVER_SYSTEMS, getDiscoverSystem } from "@/lib/guidance/discover/systems";
import { discoverWebPageJsonLd } from "@/lib/guidance/discover/jsonld";
import { loadDiscoveryVisitor } from "@/lib/guidance/discover/visitor";
import { systemHref } from "@/lib/guidance/discover/catalog";
import { createPageMetadata } from "@/lib/seo/create-page-metadata";

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return DISCOVER_SYSTEMS.map((item) => ({ slug: item.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const item = getDiscoverSystem(slug);
  if (!item) return {};
  return createPageMetadata({
    path: systemHref(slug),
    title: `${item.title} | نظام دانشگاهی | ستارگان پلاس`,
    description: item.lead,
    keywords: [item.title, "انتخاب رشته", "دانشگاه", "ستارگان پلاس"],
  });
}

export default async function DiscoverSystemPage({ params }: PageProps) {
  const { slug } = await params;
  const item = getDiscoverSystem(slug);
  if (!item) notFound();
  const visitor = await loadDiscoveryVisitor();
  const path = systemHref(slug);

  return (
    <DiscoverShell
      breadcrumbs={[
        { label: "خانه", href: "/" },
        { label: "کانون کشف", href: "/discover" },
        { label: "نظام دانشگاهی", href: "/discover/systems" },
        { label: item.title },
      ]}
      activePath="/discover/systems"
      jsonLd={discoverWebPageJsonLd({
        path,
        title: item.title,
        description: item.lead,
        breadcrumbs: [
          { name: "خانه", path: "/" },
          { name: "کانون کشف", path: "/discover" },
          { name: "نظام دانشگاهی", path: "/discover/systems" },
          { name: item.title, path },
        ],
        faq: item.faq,
      })}
      visitor={visitor}
    >
      <SystemEncyclopediaDetail item={item} />
    </DiscoverShell>
  );
}
