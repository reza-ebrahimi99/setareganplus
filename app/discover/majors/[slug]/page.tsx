import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DiscoverRelated } from "@/components/guidance/discover/DiscoverRelated";
import { DiscoverShell } from "@/components/guidance/discover/DiscoverShell";
import { MajorEncyclopediaDetail } from "@/components/guidance/discover/MajorEncyclopediaDetail";
import { DISCOVER_MAJORS, getDiscoverMajor } from "@/lib/guidance/discover/majors";
import { discoverWebPageJsonLd } from "@/lib/guidance/discover/jsonld";
import { loadDiscoveryVisitor } from "@/lib/guidance/discover/visitor";
import { examGroupLabel, majorHref, relatedForMajor } from "@/lib/guidance/discover/catalog";
import { createPageMetadata } from "@/lib/seo/create-page-metadata";

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return DISCOVER_MAJORS.map((item) => ({ slug: item.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const item = getDiscoverMajor(slug);
  if (!item) return {};
  return createPageMetadata({
    path: majorHref(slug),
    title: `${item.title} | دانشنامه رشته | ستارگان پلاس`,
    description: item.lead,
    keywords: [item.title, examGroupLabel(item.examGroup), "انتخاب رشته", "کنکور", "دانشنامه رشته"],
  });
}

export default async function DiscoverMajorPage({ params }: PageProps) {
  const { slug } = await params;
  const item = getDiscoverMajor(slug);
  if (!item) notFound();
  const visitor = await loadDiscoveryVisitor();
  const path = majorHref(slug);

  return (
    <DiscoverShell
      breadcrumbs={[
        { label: "خانه", href: "/" },
        { label: "کانون کشف", href: "/discover" },
        { label: "دانشنامه رشته‌ها", href: "/discover/majors" },
        { label: item.title },
      ]}
      activePath="/discover/majors"
      jsonLd={discoverWebPageJsonLd({
        path,
        title: item.title,
        description: item.lead,
        breadcrumbs: [
          { name: "خانه", path: "/" },
          { name: "کانون کشف", path: "/discover" },
          { name: "دانشنامه رشته‌ها", path: "/discover/majors" },
          { name: item.title, path },
        ],
        faq: [...item.faq, ...item.misconceptions],
      })}
      visitor={visitor}
    >
      <MajorEncyclopediaDetail item={item} />
      <DiscoverRelated related={relatedForMajor(item.slug)} />
    </DiscoverShell>
  );
}
