import type { Metadata } from "next";
import Link from "next/link";
import { DiscoverShell } from "@/components/guidance/discover/DiscoverShell";
import { DISCOVER_MAJORS } from "@/lib/guidance/discover/majors";
import { discoverWebPageJsonLd } from "@/lib/guidance/discover/jsonld";
import { loadDiscoveryVisitor } from "@/lib/guidance/discover/visitor";
import {
  DISCOVER_EXAM_GROUPS,
  careerHref,
  examGroupLabel,
  majorHref,
  majorsForExamGroup,
} from "@/lib/guidance/discover/catalog";
import { createPageMetadata } from "@/lib/seo/create-page-metadata";

export const metadata: Metadata = createPageMetadata({
  path: "/discover/majors",
  title: "کاوشگر رشته | کانون کشف ستارگان پلاس",
  description:
    "رشته‌های ریاضی، تجربی، انسانی، هنر و زبان را با نگاه مشاوره‌ای بشناسید؛ قبل از قفل کردن فهرست ۱۵۰.",
});

export default async function DiscoverMajorsIndexPage() {
  const visitor = await loadDiscoveryVisitor();
  return (
    <DiscoverShell
      breadcrumbs={[
        { label: "خانه", href: "/" },
        { label: "کانون کشف", href: "/discover" },
        { label: "رشته‌ها" },
      ]}
      jsonLd={discoverWebPageJsonLd({
        path: "/discover/majors",
        title: "کاوشگر رشته",
        description: "فهرست رشته‌های پنج گروه آزمایشی.",
        breadcrumbs: [
          { name: "خانه", path: "/" },
          { name: "کانون کشف", path: "/discover" },
          { name: "رشته‌ها", path: "/discover/majors" },
        ],
      })}
      visitor={visitor}
    >
      <header className="discover-hero">
        <p>کاوشگر رشته</p>
        <h1>{DISCOVER_MAJORS.length} رشته، پنج گروه آزمایشی.</h1>
        <p className="discover-hero__lead">
          هر صفحه درباره درس، روحیه، مسیر شغلی و خطاهای رایج است — نه قول قبولی.
        </p>
      </header>
      {DISCOVER_EXAM_GROUPS.map((group) => (
        <section key={group} className="discover-group">
          <h2>{examGroupLabel(group)}</h2>
          <ul className="discover-index">
            {majorsForExamGroup(group).map((item) => (
              <li key={item.slug}>
                <Link href={majorHref(item.slug)}>
                  <span>{item.kicker}</span>
                  <strong>{item.title}</strong>
                  <em>{item.lead}</em>
                </Link>
                <Link href={careerHref(item.slug)} className="discover-index__career">
                  مسیر شغلی
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </DiscoverShell>
  );
}
