import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DiscoverCover } from "@/components/guidance/discover/DiscoverCover";
import { DiscoverFaq } from "@/components/guidance/discover/DiscoverFaq";
import { DiscoverInsight } from "@/components/guidance/discover/DiscoverInsight";
import { DiscoverRelated } from "@/components/guidance/discover/DiscoverRelated";
import { DiscoverShell } from "@/components/guidance/discover/DiscoverShell";
import { DISCOVER_PATHWAYS, getDiscoverPathway } from "@/lib/guidance/discover/pathways";
import { discoverWebPageJsonLd } from "@/lib/guidance/discover/jsonld";
import { loadDiscoveryVisitor } from "@/lib/guidance/discover/visitor";
import { pathwayHref, relatedForPathway } from "@/lib/guidance/discover/catalog";
import { createPageMetadata } from "@/lib/seo/create-page-metadata";

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return DISCOVER_PATHWAYS.map((item) => ({ slug: item.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const item = getDiscoverPathway(slug);
  if (!item) return {};
  return createPageMetadata({
    path: pathwayHref(slug),
    title: `${item.title} | مقطع تحصیلی | ستارگان پلاس`,
    description: item.lead,
    keywords: [item.title, "مقطع تحصیلی", "انتخاب رشته"],
  });
}

export default async function DiscoverPathwayPage({ params }: PageProps) {
  const { slug } = await params;
  const item = getDiscoverPathway(slug);
  if (!item) notFound();
  const visitor = await loadDiscoveryVisitor();
  const path = pathwayHref(slug);

  return (
    <DiscoverShell
      breadcrumbs={[
        { label: "خانه", href: "/" },
        { label: "کانون کشف", href: "/discover" },
        { label: "مقطع تحصیلی", href: "/discover/pathways" },
        { label: item.title },
      ]}
      activePath="/discover/pathways"
      jsonLd={discoverWebPageJsonLd({
        path,
        title: item.title,
        description: item.lead,
        breadcrumbs: [
          { name: "خانه", path: "/" },
          { name: "کانون کشف", path: "/discover" },
          { name: "مقطع تحصیلی", path: "/discover/pathways" },
          { name: item.title, path },
        ],
        faq: item.faq,
      })}
      visitor={visitor}
    >
      <article className="discover-article">
        <header className="discover-hero">
          <p>{item.kicker}</p>
          <h1>{item.title}</h1>
          <p className="discover-hero__lead">{item.lead}</p>
        </header>
        <DiscoverCover slug={item.slug} title={item.title} />
        <section>
          <h2>تصویر کلی</h2>
          <p>{item.overview}</p>
        </section>
        <section>
          <h2>زمان و ریتم</h2>
          <p>{item.duration}</p>
        </section>
        <section>
          <h2>بعد از این مقطع</h2>
          <p>{item.after}</p>
        </section>
        <section>
          <h2>برای چه کسی معنا دارد</h2>
          <p>{item.who}</p>
        </section>
        <DiscoverFaq items={item.faq} />
        <DiscoverInsight insight={item.insight} />
        <DiscoverRelated related={relatedForPathway(item.slug)} />
      </article>
    </DiscoverShell>
  );
}
