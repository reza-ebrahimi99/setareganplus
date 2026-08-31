import type { Metadata } from "next";
import Link from "next/link";
import { DiscoverSearchForm } from "@/components/guidance/discover/DiscoverSearchForm";
import { DiscoverShell } from "@/components/guidance/discover/DiscoverShell";
import { discoverWebPageJsonLd } from "@/lib/guidance/discover/jsonld";
import { loadDiscoveryVisitor } from "@/lib/guidance/discover/visitor";
import { kindLabel, searchDiscoverCatalog } from "@/lib/guidance/discover/catalog";
import { createPageMetadata } from "@/lib/seo/create-page-metadata";

type PageProps = { searchParams: Promise<{ q?: string }> };

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  return createPageMetadata({
    path: query ? `/discover/search?q=${encodeURIComponent(query)}` : "/discover/search",
    title: query
      ? `جستجو: ${query} | کانون کشف ستارگان پلاس`
      : "جستجوی دانشنامه انتخاب رشته | ستارگان پلاس",
    description: "جستجو در رشته‌ها، نظام‌های دانشگاهی، مقاطع و مسیرهای شغلی کانون کشف.",
    robots: query ? { index: false, follow: true } : { index: true, follow: true },
  });
}

export default async function DiscoverSearchPage({ searchParams }: PageProps) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const hits = query.length > 0 ? searchDiscoverCatalog(query) : [];
  const visitor = await loadDiscoveryVisitor();

  return (
    <DiscoverShell
      breadcrumbs={[
        { label: "خانه", href: "/" },
        { label: "کانون کشف", href: "/discover" },
        { label: "جستجو" },
      ]}
      activePath="/discover/search"
      jsonLd={discoverWebPageJsonLd({
        path: "/discover/search",
        title: "جستجوی دانشنامه",
        description: "رشته، نظام و مقطع را پیدا کنید.",
        breadcrumbs: [
          { name: "خانه", path: "/" },
          { name: "کانون کشف", path: "/discover" },
          { name: "جستجو", path: "/discover/search" },
        ],
      })}
      visitor={visitor}
    >
      <header className="discover-hero">
        <p>جستجو</p>
        <h1>در دانشنامه بگردید.</h1>
        <DiscoverSearchForm defaultValue={query} />
      </header>
      {query.length === 0 ? (
        <p>عبارتی بنویسید؛ حداقل یک نویسه.</p>
      ) : hits.length === 0 ? (
        <p>نتیجه‌ای برای «{query}» در این دانشنامه نیست. با واژه کلی‌تر امتحان کنید.</p>
      ) : (
        <ul className="discover-index">
          {hits.map((hit) => (
            <li key={`${hit.kind}-${hit.slug}`}>
              <Link href={hit.href}>
                <span>
                  {kindLabel(hit.kind)} · {hit.groupLabel}
                </span>
                <strong>{hit.title}</strong>
                <em>{hit.excerpt}</em>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </DiscoverShell>
  );
}
