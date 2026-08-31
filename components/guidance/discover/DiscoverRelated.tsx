import Link from "next/link";
import type { DiscoverRelated } from "@/lib/guidance/discover/types";
import { DISCOVER_MAJORS } from "@/lib/guidance/discover/majors";
import { DISCOVER_PATHWAYS } from "@/lib/guidance/discover/pathways";
import { DISCOVER_SYSTEMS } from "@/lib/guidance/discover/systems";
import {
  careerHref,
  majorHref,
  pathwayHref,
  systemHref,
} from "@/lib/guidance/discover/catalog";

export function DiscoverRelated({ related }: { related: DiscoverRelated }) {
  const majors = related.majors
    .map((slug) => DISCOVER_MAJORS.find((item) => item.slug === slug))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const systems = related.systems
    .map((slug) => DISCOVER_SYSTEMS.find((item) => item.slug === slug))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const pathways = related.pathways
    .map((slug) => DISCOVER_PATHWAYS.find((item) => item.slug === slug))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const careers = related.careers
    .map((slug) => DISCOVER_MAJORS.find((item) => item.slug === slug))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <section className="discover-related">
      <h2>ادامه کشف</h2>
      <p>صفحات نزدیک به همین موضوع — برای گشتن، نه برای تصمیم قطعی.</p>
      <div className="discover-related__grid">
        {majors.length > 0 ? (
          <div>
            <h3>رشته‌های نزدیک</h3>
            <ul>
              {majors.map((item) => (
                <li key={item.slug}>
                  <Link href={majorHref(item.slug)}>{item.title}</Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {systems.length > 0 ? (
          <div>
            <h3>نظام‌های دانشگاهی مرتبط</h3>
            <ul>
              {systems.map((item) => (
                <li key={item.slug}>
                  <Link href={systemHref(item.slug)}>{item.title}</Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {pathways.length > 0 ? (
          <div>
            <h3>مقطع و مسیر</h3>
            <ul>
              {pathways.map((item) => (
                <li key={item.slug}>
                  <Link href={pathwayHref(item.slug)}>{item.title}</Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {careers.length > 0 ? (
          <div>
            <h3>مسیر شغلی</h3>
            <ul>
              {careers.map((item) => (
                <li key={item.slug}>
                  <Link href={careerHref(item.slug)}>شغل‌های {item.title}</Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
