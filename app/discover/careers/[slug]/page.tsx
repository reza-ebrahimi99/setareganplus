import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DiscoverCover } from "@/components/guidance/discover/DiscoverCover";
import { DiscoverInsight } from "@/components/guidance/discover/DiscoverInsight";
import { DiscoverRelated } from "@/components/guidance/discover/DiscoverRelated";
import { DiscoverShell } from "@/components/guidance/discover/DiscoverShell";
import { DISCOVER_MAJORS, getDiscoverMajor } from "@/lib/guidance/discover/majors";
import { discoverWebPageJsonLd } from "@/lib/guidance/discover/jsonld";
import { loadDiscoveryVisitor } from "@/lib/guidance/discover/visitor";
import {
  careerHref,
  examGroupLabel,
  majorHref,
  relatedForMajor,
} from "@/lib/guidance/discover/catalog";
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
    path: careerHref(slug),
    title: `مسیر شغلی ${item.title} | کانون کشف ستارگان پلاس`,
    description: item.career.outlook,
    keywords: [item.title, "مسیر شغلی", "بازار کار", "انتخاب رشته"],
  });
}

export default async function DiscoverCareerPage({ params }: PageProps) {
  const { slug } = await params;
  const item = getDiscoverMajor(slug);
  if (!item) notFound();
  const visitor = await loadDiscoveryVisitor();
  const path = careerHref(slug);

  return (
    <DiscoverShell
      breadcrumbs={[
        { label: "خانه", href: "/" },
        { label: "کانون کشف", href: "/discover" },
        { label: "رشته‌ها", href: "/discover/majors" },
        { label: item.title, href: majorHref(item.slug) },
        { label: "مسیر شغلی" },
      ]}
      activePath="/discover/majors"
      jsonLd={discoverWebPageJsonLd({
        path,
        title: `مسیر شغلی ${item.title}`,
        description: item.career.outlook,
        breadcrumbs: [
          { name: "خانه", path: "/" },
          { name: "کانون کشف", path: "/discover" },
          { name: item.title, path: majorHref(item.slug) },
          { name: "مسیر شغلی", path },
        ],
      })}
      visitor={visitor}
    >
      <article className="discover-article">
        <header className="discover-hero">
          <p>
            مسیر شغلی · {examGroupLabel(item.examGroup)}
          </p>
          <h1>بعد از {item.title} چه کارهایی رایج است؟</h1>
          <p className="discover-hero__lead">{item.career.outlook}</p>
          <Link href={majorHref(item.slug)} className="discover-inline">
            بازگشت به صفحه رشته
          </Link>
        </header>
        <DiscoverCover slug={`${item.slug}-career`} title={item.title} />
        <section>
          <h2>نمونه‌های مسیر شغلی</h2>
          <p>نمونه است نه فهرست استخدام و نه قول جایگاه.</p>
          <ul>
            {item.career.paths.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
        <section>
          <h2>محیط کار رایج</h2>
          <ul>
            {item.career.environments.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
        <section>
          <h2>مسئولیت‌های معمول</h2>
          <ul>
            {item.career.responsibilities.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
        <section>
          <h2>افق کلی اشتغال</h2>
          <p>{item.career.outlook}</p>
        </section>
        <section>
          <h2>مهارت‌هایی که معمولاً لازم می‌شود</h2>
          <ul>
            {item.career.skills.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
        <DiscoverInsight insight={item.insight} />
        <DiscoverRelated related={relatedForMajor(item.slug)} />
      </article>
    </DiscoverShell>
  );
}
