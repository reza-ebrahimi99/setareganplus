import type { Metadata } from "next";
import Link from "next/link";
import { DiscoverShell } from "@/components/guidance/discover/DiscoverShell";
import { DISCOVER_SYSTEMS } from "@/lib/guidance/discover/systems";
import { discoverWebPageJsonLd } from "@/lib/guidance/discover/jsonld";
import { loadDiscoveryVisitor } from "@/lib/guidance/discover/visitor";
import { systemHref } from "@/lib/guidance/discover/catalog";
import { createPageMetadata } from "@/lib/seo/create-page-metadata";

export const metadata: Metadata = createPageMetadata({
  path: "/discover/systems",
  title: "نظام‌های دانشگاهی | کانون کشف ستارگان پلاس",
  description:
    "روزانه، شبانه، پردیس، آزاد، پیام نور، غیرانتفاعی، فرهنگیان و مؤسسات خاص را پیش از چیدن فهرست بشناسید.",
});

export default async function DiscoverSystemsIndexPage() {
  const visitor = await loadDiscoveryVisitor();
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
      <header className="discover-hero">
        <p>نظام دانشگاهی</p>
        <h1>همان رشته، زندگی‌های متفاوت.</h1>
        <p className="discover-hero__lead">
          روزانه و پردیس یک دانشگاه می‌توانند دو هزینه و دو خوابگاه باشند. اینجا
          برچسب را از زندگی جدا می‌کنیم.
        </p>
      </header>
      <ul className="discover-index">
        {DISCOVER_SYSTEMS.map((item) => (
          <li key={item.slug}>
            <Link href={systemHref(item.slug)}>
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
