import Link from "next/link";
import { PortalIcon } from "@/components/portal/icons";
import { DISCOVER_PROGRAMS } from "@/lib/guidance/discover/programs";
import { DISCOVER_SYSTEMS } from "@/lib/guidance/discover/systems";
import { programHref, systemHref } from "@/lib/guidance/discover/catalog";
import { PROGRAM_CATEGORY_LABELS } from "@/lib/guidance/discover/program-catalog-ui";
import { toPersianDigits } from "@/lib/persian";

const GUIDANCE_HOME = "/portal/student/services/guidance";

export function GuidanceUniversitiesHub() {
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
          روزانه، شبانه، پردیس، آزاد، پیام‌نور و سایر نظام‌ها — هر کدام هزینه، ریتم
          و افق متفاوتی دارند. از همین‌جا وارد دانشنامه شوید.
        </p>
      </header>

      <section className="guidance-universities-hub__section" aria-labelledby="systems-title">
        <div className="guidance-universities-hub__section-head">
          <h2 id="systems-title">نظام‌های دانشگاهی</h2>
          <Link href="/discover/systems">مشاهده همه ({toPersianDigits(DISCOVER_SYSTEMS.length)})</Link>
        </div>
        <ul className="guidance-universities-hub__grid">
          {DISCOVER_SYSTEMS.slice(0, 6).map((item) => (
            <li key={item.slug}>
              <Link href={systemHref(item.slug)} className="guidance-universities-hub__card">
                <span className="guidance-universities-hub__kicker">{item.kicker}</span>
                <strong>{item.title}</strong>
                <em>{item.lead}</em>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="guidance-universities-hub__section" aria-labelledby="programs-title">
        <div className="guidance-universities-hub__section-head">
          <h2 id="programs-title">مقاطع و انواع دوره‌ها</h2>
          <Link href="/discover/programs">دانشنامه مقاطع ({toPersianDigits(DISCOVER_PROGRAMS.length)})</Link>
        </div>
        <ul className="guidance-universities-hub__grid guidance-universities-hub__grid--compact">
          {DISCOVER_PROGRAMS.filter((p) => p.category === "INSTITUTION_TYPE").slice(0, 6).map((item) => (
            <li key={item.slug}>
              <Link href={programHref(item.slug)} className="guidance-universities-hub__card">
                <span className="guidance-universities-hub__kicker">
                  {PROGRAM_CATEGORY_LABELS[item.category]}
                </span>
                <strong>{item.title}</strong>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <footer className="guidance-universities-hub__footer">
        <Link href="/discover" className="guidance-universities-hub__discover">
          ورود به کانون کشف
          <PortalIcon name="grid" className="size-4" aria-hidden="true" />
        </Link>
        <Link href="/discover/majors" className="guidance-universities-hub__discover">
          دانشنامه رشته‌ها
          <PortalIcon name="layers" className="size-4" aria-hidden="true" />
        </Link>
      </footer>
    </div>
  );
}
