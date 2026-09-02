import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DiscoverShell } from "@/components/guidance/discover/DiscoverShell";
import { ProgramEncyclopediaDetail } from "@/components/guidance/discover/ProgramEncyclopediaDetail";
import { programHref } from "@/lib/guidance/discover/catalog";
import { discoverWebPageJsonLd } from "@/lib/guidance/discover/jsonld";
import { DISCOVER_PROGRAMS, getDiscoverProgram } from "@/lib/guidance/discover/programs";
import { loadDiscoveryVisitor } from "@/lib/guidance/discover/visitor";
import { createPageMetadata } from "@/lib/seo/create-page-metadata";

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return DISCOVER_PROGRAMS.map((item) => ({ slug: item.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const item = getDiscoverProgram(slug);
  if (!item) return {};
  return createPageMetadata({
    path: programHref(slug),
    title: `${item.title} چیست؟ | ستارگان پلاس`,
    description: item.summary,
    keywords: [item.title, "انتخاب رشته", "مقطع تحصیلی", "دانشنامه", ...item.searchTerms],
  });
}

export default async function DiscoverProgramPage({ params }: PageProps) {
  const { slug } = await params;
  const item = getDiscoverProgram(slug);
  if (!item) notFound();
  const visitor = await loadDiscoveryVisitor();
  const path = programHref(slug);

  return (
    <DiscoverShell
      breadcrumbs={[
        { label: "خانه", href: "/" },
        { label: "کانون کشف", href: "/discover" },
        { label: "مقاطع و دوره‌ها", href: "/discover/programs" },
        { label: item.title },
      ]}
      activePath="/discover/programs"
      jsonLd={discoverWebPageJsonLd({
        path,
        title: item.title,
        description: item.summary,
        breadcrumbs: [
          { name: "خانه", path: "/" },
          { name: "کانون کشف", path: "/discover" },
          { name: "مقاطع و دوره‌ها", path: "/discover/programs" },
          { name: item.title, path },
        ],
        faq: [...item.faq],
      })}
      visitor={visitor}
    >
      <ProgramEncyclopediaDetail item={item} />
    </DiscoverShell>
  );
}
