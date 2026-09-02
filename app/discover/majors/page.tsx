import type { Metadata } from "next";
import { DiscoverShell } from "@/components/guidance/discover/DiscoverShell";
import { MajorEncyclopediaExplorer } from "@/components/guidance/discover/MajorEncyclopediaExplorer";
import { DISCOVER_MAJORS } from "@/lib/guidance/discover/majors";
import { discoverWebPageJsonLd } from "@/lib/guidance/discover/jsonld";
import { toMajorExplorerCard } from "@/lib/guidance/discover/major-catalog-ui";
import { loadDiscoveryVisitor } from "@/lib/guidance/discover/visitor";
import { createPageMetadata } from "@/lib/seo/create-page-metadata";

export const metadata: Metadata = createPageMetadata({
  path: "/discover/majors",
  title: "دانشنامه رشته‌های دانشگاهی | ستارگان پلاس",
  description:
    "رشته‌های ریاضی، تجربی، انسانی، هنر و زبان را قبل از انتخاب نهایی بشناسید — درس، روحیه، بازار کار و خطاهای رایج.",
});

export default async function DiscoverMajorsIndexPage() {
  const visitor = await loadDiscoveryVisitor();
  const cards = DISCOVER_MAJORS.map(toMajorExplorerCard);

  return (
    <DiscoverShell
      breadcrumbs={[
        { label: "خانه", href: "/" },
        { label: "کانون کشف", href: "/discover" },
        { label: "دانشنامه رشته‌ها" },
      ]}
      activePath="/discover/majors"
      jsonLd={discoverWebPageJsonLd({
        path: "/discover/majors",
        title: "دانشنامه رشته‌های دانشگاهی",
        description: "کاوش رشته‌های پنج گروه آزمایشی قبل از انتخاب نهایی.",
        breadcrumbs: [
          { name: "خانه", path: "/" },
          { name: "کانون کشف", path: "/discover" },
          { name: "دانشنامه رشته‌ها", path: "/discover/majors" },
        ],
      })}
      visitor={visitor}
    >
      <MajorEncyclopediaExplorer cards={cards} totalCount={DISCOVER_MAJORS.length} />
    </DiscoverShell>
  );
}
