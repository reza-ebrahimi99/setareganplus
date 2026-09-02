import type { Metadata } from "next";
import { DiscoverShell } from "@/components/guidance/discover/DiscoverShell";
import { ProgramEncyclopediaExplorer } from "@/components/guidance/discover/ProgramEncyclopediaExplorer";
import { discoverWebPageJsonLd } from "@/lib/guidance/discover/jsonld";
import { DISCOVER_PROGRAMS } from "@/lib/guidance/discover/programs";
import { loadDiscoveryVisitor } from "@/lib/guidance/discover/visitor";
import { createPageMetadata } from "@/lib/seo/create-page-metadata";

export const metadata: Metadata = createPageMetadata({
  path: "/discover/programs",
  title: "دانشنامه مقاطع و دوره‌های دانشگاهی | ستارگان پلاس",
  description:
    "مقاطع تحصیلی، نوع دوره و دانشگاه، شیوه پذیرش و شرایط خاص را قبل از انتخاب رشته بشناسید — راهنمای آموزشی ستارگان پلاس.",
});

export default async function DiscoverProgramsIndexPage() {
  const visitor = await loadDiscoveryVisitor();

  return (
    <DiscoverShell
      breadcrumbs={[
        { label: "خانه", href: "/" },
        { label: "کانون کشف", href: "/discover" },
        { label: "مقاطع و دوره‌ها" },
      ]}
      activePath="/discover/programs"
      jsonLd={discoverWebPageJsonLd({
        path: "/discover/programs",
        title: "دانشنامه مقاطع و دوره‌های دانشگاهی",
        description: "راهنمای مقاطع، دوره‌ها و شیوه پذیرش برای انتخاب آگاهانه.",
        breadcrumbs: [
          { name: "خانه", path: "/" },
          { name: "کانون کشف", path: "/discover" },
          { name: "مقاطع و دوره‌ها", path: "/discover/programs" },
        ],
      })}
      visitor={visitor}
    >
      <ProgramEncyclopediaExplorer programs={DISCOVER_PROGRAMS} />
    </DiscoverShell>
  );
}
