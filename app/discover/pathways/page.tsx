import type { Metadata } from "next";
import Link from "next/link";
import { DiscoverShell } from "@/components/guidance/discover/DiscoverShell";
import { DISCOVER_PATHWAYS } from "@/lib/guidance/discover/pathways";
import { discoverWebPageJsonLd } from "@/lib/guidance/discover/jsonld";
import { loadDiscoveryVisitor } from "@/lib/guidance/discover/visitor";
import { pathwayHref } from "@/lib/guidance/discover/catalog";
import { createPageMetadata } from "@/lib/seo/create-page-metadata";

export const metadata: Metadata = createPageMetadata({
  path: "/discover/pathways",
  title: "مقاطع تحصیلی | کانون کشف ستارگان پلاس",
  description:
    "کاردانی، کارشناسی، ارشد، دکتری، مسیر علوم پزشکی و تربیت معلم را پیش از انتخاب بشناسید.",
});

export default async function DiscoverPathwaysIndexPage() {
  const visitor = await loadDiscoveryVisitor();
  return (
    <DiscoverShell
      breadcrumbs={[
        { label: "خانه", href: "/" },
        { label: "کانون کشف", href: "/discover" },
        { label: "مقطع تحصیلی" },
      ]}
      activePath="/discover/pathways"
      jsonLd={discoverWebPageJsonLd({
        path: "/discover/pathways",
        title: "مقاطع تحصیلی",
        description: "مسیرهای مقطع را جدا از اسم دانشگاه بخوانید.",
        breadcrumbs: [
          { name: "خانه", path: "/" },
          { name: "کانون کشف", path: "/discover" },
          { name: "مقطع تحصیلی", path: "/discover/pathways" },
        ],
      })}
      visitor={visitor}
    >
      <header className="discover-hero">
        <p>مقطع تحصیلی</p>
        <h1>لیسانس تنها پله نیست.</h1>
        <p className="discover-hero__lead">
          کاردانی، کارشناسی، ارشد و مسیرهای حرفه‌ای را جدا از نظام دانشگاهی ببینید.
        </p>
      </header>
      <ul className="discover-index">
        {DISCOVER_PATHWAYS.map((item) => (
          <li key={item.slug}>
            <Link href={pathwayHref(item.slug)}>
              <span>{item.kicker}</span>
              <strong>{item.title}</strong>
              <em>{item.lead}</em>
            </Link>
          </li>
        ))}
      </ul>
    </DiscoverShell>
  );
}
