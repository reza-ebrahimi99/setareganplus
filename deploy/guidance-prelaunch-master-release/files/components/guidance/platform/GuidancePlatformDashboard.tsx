import Link from "next/link";
import type { PortalJourneyModel } from "@/components/portal/journey/types";
import type { AnalysisPresentationModel } from "@/lib/guidance/analysis/types";

type GuidancePlatformDashboardProps = {
  studentName: string;
  journey: PortalJourneyModel | null;
  analysis: AnalysisPresentationModel | null;
};

function DashboardIcon({
  type,
}: {
  type: "majors" | "universities" | "journey" | "plans";
}) {
  if (type === "majors") {
    return (
      <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <path
          d="M8 24 32 12l24 12-24 12L8 24Z"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinejoin="round"
        />
        <path
          d="M18 30v12c0 5 7 10 14 10s14-5 14-10V30"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (type === "universities") {
    return (
      <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <path
          d="M10 52h44M16 52V24h32v28M22 30h6M36 30h6M22 38h6M36 38h6M28 52V44h8v8"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinejoin="round"
        />
        <path
          d="M14 24 32 14l18 10"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (type === "journey") {
    return (
      <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <path
          d="M18 48c7-16 10-25 28-32"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <circle cx="16" cy="48" r="4" stroke="currentColor" strokeWidth="2.6" />
        <circle cx="48" cy="16" r="4" stroke="currentColor" strokeWidth="2.6" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path
        d="M32 10l6.2 12.5L52 24.5 42 34l2.4 13.5L32 41l-12.4 6.5L22 34 12 24.5l13.8-2L32 10Z"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Canonical guidance dashboard — four destinations, no journey widgets.
 * Logout uses the existing POST /portal/logout route.
 */
export function GuidancePlatformDashboard({
  studentName,
}: GuidancePlatformDashboardProps) {
  const greetingName = studentName.trim() || "دانش‌آموز";

  const cards = [
    {
      title: "معرفی رشته‌ها",
      description: "دانشنامه رشته‌ها، مسیر تحصیلی و چشم‌انداز شغلی",
      href: "/discover/majors",
      icon: "majors" as const,
      tone: "default",
    },
    {
      title: "معرفی دانشگاه‌ها",
      description: "انواع دانشگاه‌ها و نظام‌های پذیرش را بشناسید",
      href: "/portal/student/services/guidance?view=universities",
      icon: "universities" as const,
      tone: "default",
    },
    {
      title: "ورود به مسیر انتخاب رشته",
      description: "ادامه مسیر ۱۸ مرحله‌ای انتخاب رشته",
      href: "/portal/student/services/guidance/steps",
      icon: "journey" as const,
      tone: "yellow",
    },
    {
      title: "پلن‌های ثبت نام انتخاب رشته ویژه مهندس رضا ابراهیمی",
      description: "مشاهده پلن‌ها و جزئیات همراهی انتخاب رشته",
      href: "/portal/student/services/guidance/journey/steps/10",
      icon: "plans" as const,
      tone: "cream",
    },
  ];

  return (
    <main className="gpd gpd--minimal" dir="rtl">
      <section className="gpd-minimal-welcome">
        <div className="gpd-minimal-welcome__mark" aria-hidden="true">
          <span />
        </div>
        <div className="gpd-minimal-welcome__copy">
          <p className="gpd-minimal-welcome__eyebrow">سامانه جامع انتخاب رشته</p>
          <h1>سلام {greetingName}</h1>
          <p>
            به سامانه جامع انتخاب رشته <strong>ستارگان پلاس</strong> خوش آمدید.
          </p>
        </div>
        <form
          action="/portal/logout"
          method="post"
          className="gpd-minimal-logout"
        >
          {/* Existing /portal/logout next= — relative "/" is the public
              path on entekhab.setareganplus.ir. Session clear is unchanged. */}
          <input type="hidden" name="next" value="/" />
          <button type="submit">خروج از حساب</button>
        </form>
      </section>

      <section className="gpd-minimal-list" aria-label="خدمات انتخاب رشته">
        {cards.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className="gpd-minimal-card"
            data-tone={card.tone}
          >
            <span className="gpd-minimal-card__icon">
              <DashboardIcon type={card.icon} />
            </span>

            <span className="gpd-minimal-card__body">
              <strong>{card.title}</strong>
              <em>{card.description}</em>
            </span>

            <span className="gpd-minimal-card__arrow" aria-hidden="true">
              ←
            </span>
          </Link>
        ))}
      </section>
    </main>
  );
}
