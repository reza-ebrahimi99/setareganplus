import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { DiscoverShell } from "@/components/guidance/discover/DiscoverShell";
import { DISCOVER_MAJORS } from "@/lib/guidance/discover/majors";
import { DISCOVER_PROGRAMS } from "@/lib/guidance/discover/programs";
import { DISCOVER_PATHWAYS } from "@/lib/guidance/discover/pathways";
import { DISCOVER_SYSTEMS } from "@/lib/guidance/discover/systems";
import { discoverWebPageJsonLd } from "@/lib/guidance/discover/jsonld";
import { loadDiscoveryVisitor } from "@/lib/guidance/discover/visitor";
import { createPageMetadata } from "@/lib/seo/create-page-metadata";

export const metadata: Metadata = createPageMetadata({
  path: "/discover",
  title: "کانون کشف انتخاب رشته | دپارتمان انتخاب رشته ستارگان پلاس",
  description:
    "دانشنامه تعاملی رشته، نظام دانشگاهی و مقطع تحصیلی دپارتمان انتخاب رشته قلم‌چی نسیم‌شهر؛ برای فهمیدن قبل از انتخاب، نه برای تصمیم تنهایی.",
  keywords: ["انتخاب رشته", "دانشگاه", "رشته کنکور", "نظام آموزشی", "ستارگان پلاس"],
});

export default async function DiscoverHomePage() {
  const visitor = await loadDiscoveryVisitor();
  const jsonLd = discoverWebPageJsonLd({
    path: "/discover",
    title: "کانون کشف انتخاب رشته",
    description:
      "رشته‌ها، نظام‌های دانشگاهی و مقاطع را پیش از چیدن فهرست ۱۵۰ بشناسید.",
    breadcrumbs: [
      { name: "خانه", path: "/" },
      { name: "کانون کشف", path: "/discover" },
    ],
  });

  return (
    <DiscoverShell
      breadcrumbs={[
        { label: "خانه", href: "/" },
        { label: "کانون کشف" },
      ]}
      jsonLd={jsonLd}
      visitor={visitor}
    >
      <header className="discover-hero">
        <p>دپارتمان انتخاب رشته قلم‌چی نسیم‌شهر</p>
        <h1>قبل از انتخاب، بفهمید.</h1>
        <p className="discover-hero__lead">
          اینجا دانشنامه تصمیم است نه وبلاگ انگیزشی. رشته، نظام دانشگاهی و مقطع را
          ورق بزنید؛ تفسیر نهایی با مهندس رضا ابراهیمی است.
        </p>
      </header>
      <figure className="discover-cover">
        <Image
          src="/images/hero/hero.jpg"
          alt="نمای مجموعه آموزشی ستارگان پلاس در نسیم‌شهر"
          width={1600}
          height={900}
          className="discover-cover__img"
          priority
        />
        <figcaption>فضای مجموعه ستارگان پلاس — نقطه شروع گفت‌وگوی خانواده با دفتر.</figcaption>
      </figure>
      <nav className="discover-doors" aria-label="ورود به دانشنامه">
        <Link href="/discover/majors" className="discover-door">
          <span>دانشنامه رشته</span>
          <strong>ریاضی تا زبان</strong>
          <em>{DISCOVER_MAJORS.length} رشته</em>
        </Link>
        <Link href="/discover/programs" className="discover-door">
          <span>مقاطع و دوره‌ها</span>
          <strong>مقطع تا پذیرش</strong>
          <em>{DISCOVER_PROGRAMS.length} موضوع</em>
        </Link>
        <Link href="/discover/systems" className="discover-door">
          <span>نظام دانشگاهی</span>
          <strong>روزانه تا خاص</strong>
          <em>{DISCOVER_SYSTEMS.length} صفحه</em>
        </Link>
        <Link href="/discover/pathways" className="discover-door">
          <span>مقطع تحصیلی</span>
          <strong>کاردانی تا دکتری</strong>
          <em>{DISCOVER_PATHWAYS.length} مسیر</em>
        </Link>
        <Link href="/discover/compare" className="discover-door">
          <span>مقایسه</span>
          <strong>رشته با رشته</strong>
          <em>نظام با نظام</em>
        </Link>
      </nav>
    </DiscoverShell>
  );
}
