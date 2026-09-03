import Link from "next/link";
import { PortalIcon } from "@/components/portal/icons";
import {
  GuidanceUniversitiesBrowser,
  type UniversityEntry,
} from "@/components/guidance/platform/GuidanceUniversitiesBrowser";
import { DISCOVER_PROGRAMS } from "@/lib/guidance/discover/programs";
import { DISCOVER_SYSTEMS } from "@/lib/guidance/discover/systems";
import { programHref, systemHref } from "@/lib/guidance/discover/catalog";
import { PROGRAM_CATEGORY_LABELS } from "@/lib/guidance/discover/program-catalog-ui";
import { toPersianDigits } from "@/lib/persian";

const GUIDANCE_HOME = "/portal/student/services/guidance";

/** Institution/admission categories belong on the universities hub; pure degree levels live in the programs encyclopedia. */
const HUB_PROGRAM_CATEGORIES = new Set(["INSTITUTION_TYPE", "ADMISSION_METHOD"]);

function buildEntries(): UniversityEntry[] {
  const systems: UniversityEntry[] = DISCOVER_SYSTEMS.map((item) => ({
    slug: item.slug,
    title: item.title,
    kicker: item.kicker,
    lead: item.lead,
    href: systemHref(item.slug),
    group: "SYSTEM",
    groupLabel: "نظام دانشگاهی",
    terms: [item.title, item.kicker, item.lead, item.overview, item.tuition]
      .join(" ")
      .toLocaleLowerCase("fa"),
  }));

  const programs: UniversityEntry[] = DISCOVER_PROGRAMS.filter((item) =>
    HUB_PROGRAM_CATEGORIES.has(item.category),
  ).map((item) => ({
    slug: item.slug,
    title: item.title,
    kicker: PROGRAM_CATEGORY_LABELS[item.category],
    lead: item.summary,
    href: programHref(item.slug),
    group: "PROGRAM",
    groupLabel: PROGRAM_CATEGORY_LABELS[item.category],
    terms: [item.title, item.summary, item.description, ...item.searchTerms]
      .join(" ")
      .toLocaleLowerCase("fa"),
  }));

  return [...systems, ...programs];
}

export function GuidanceUniversitiesHub() {
  const entries = buildEntries();
  const systemCount = DISCOVER_SYSTEMS.length;
  const programCount = entries.length - systemCount;

  return (
    <div className="guidance-universities-hub">
      <header className="guidance-universities-hub__hero">
        <Link href={GUIDANCE_HOME} className="guidance-universities-hub__back">
          <PortalIcon name="route" className="size-4" aria-hidden="true" />
          بازگشت به داشبورد
        </Link>
        <p className="guidance-universities-hub__eyebrow">معرفی دانشگاه‌ها</p>
        <h1>قبل از چیدن فهرست، نظام دانشگاهی را بشناسید</h1>
        <p className="guidance-universities-hub__lead">
          روزانه، شبانه، پردیس، آزاد، پیام‌نور، فرهنگیان و سایر نظام‌ها — هر کدام
          هزینه، ریتم و افق متفاوتی دارند. اینجا هر مورد را جستجو و مقایسه کنید.
        </p>
        <dl className="guidance-universities-hub__stats">
          <div>
            <dt>نظام دانشگاهی</dt>
            <dd>{toPersianDigits(systemCount)}</dd>
          </div>
          <div>
            <dt>نوع دوره و پذیرش</dt>
            <dd>{toPersianDigits(programCount)}</dd>
          </div>
        </dl>
      </header>

      <GuidanceUniversitiesBrowser entries={entries} />

      <footer className="guidance-universities-hub__footer">
        <Link href="/discover/programs" className="guidance-universities-hub__discover">
          آشنایی با انواع دوره‌ها
          <PortalIcon name="clipboard" className="size-4" aria-hidden="true" />
        </Link>
        <Link href="/discover/majors" className="guidance-universities-hub__discover">
          دانشنامه رشته‌ها
          <PortalIcon name="layers" className="size-4" aria-hidden="true" />
        </Link>
        <Link href="/discover" className="guidance-universities-hub__discover">
          ورود به کانون کشف
          <PortalIcon name="grid" className="size-4" aria-hidden="true" />
        </Link>
      </footer>
    </div>
  );
}
