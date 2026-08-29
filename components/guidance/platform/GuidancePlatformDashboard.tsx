import Link from "next/link";
import { PortalIcon, type PortalIconName } from "@/components/portal/icons";
import { PortalJourneyTrack } from "@/components/portal/journey/PortalJourneyTrack";
import {
  JOURNEY_STATE_LABEL,
  type PortalJourneyModel,
  type PortalJourneyStep,
} from "@/components/portal/journey/types";
import { toPersianDigits } from "@/lib/persian";
import type { AnalysisPresentationModel } from "@/lib/guidance/analysis/types";

type GuidancePlatformDashboardProps = {
  studentName: string;
  journey: PortalJourneyModel;
  analysis: AnalysisPresentationModel | null;
};

type TaskCard = {
  id: string;
  title: string;
  description: string;
  href: string;
  label: string;
  icon: PortalIconName;
  accent: string;
};

function buildTodayTasks(steps: readonly PortalJourneyStep[]): TaskCard[] {
  const tasks: TaskCard[] = [];

  for (const step of steps) {
    if (!step.action) continue;
    if (step.state !== "active" && step.state !== "waiting") continue;

    tasks.push({
      id: step.id,
      title: step.title,
      description: step.description,
      href: step.action.href,
      label: step.action.label,
      icon: step.icon,
      accent: step.accent,
    });
  }

  return tasks.slice(0, 6);
}

function GuidanceHeroRing({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const size = 132;
  const strokeWidth = 11;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className="gp-hero-ring"
      role="img"
      aria-label={`تکمیل مسیر ${toPersianDigits(clamped)} درصد`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          className="gp-hero-ring__track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          className="gp-hero-ring__value"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="gp-hero-ring__center">
        <span className="gp-hero-ring__percent">
          {toPersianDigits(clamped)}٪
        </span>
        <span className="gp-hero-ring__caption">تکمیل</span>
      </div>
    </div>
  );
}

/**
 * Guidance Platform home — Major Selection dashboard.
 * Phase 1 polish: hero hierarchy, completion ring, CTAs, summary cards.
 * Presentation only — no school widgets / no logic changes.
 */
export function GuidancePlatformDashboard({
  studentName,
  journey,
  analysis,
}: GuidancePlatformDashboardProps) {
  const { progress, hero, steps } = journey;
  const tasks = buildTodayTasks(steps);
  const primaryCta = hero.cta;
  const primaryHref =
    primaryCta?.href ?? "/portal/student/services/guidance?view=journey";
  const primaryLabel = primaryCta
    ? primaryCta.label === "ادامه مسیر"
      ? "ادامه سفر هدایت"
      : primaryCta.label
    : "ادامه سفر هدایت";

  const currentStep =
    steps.find((s) => s.state === "active" || s.state === "waiting") ??
    steps.find((s) => s.state === "completed");

  const nextAction =
    currentStep?.action ??
    (primaryCta
      ? { href: primaryCta.href, label: primaryLabel }
      : {
          href: "/portal/student/services/guidance?view=journey",
          label: "مشاهده سفر",
        });

  const caseStatus =
    analysis?.analysisStatus.title ??
    JOURNEY_STATE_LABEL[currentStep?.state ?? "locked"];

  const caseHealth =
    currentStep?.state === "waiting"
      ? "در انتظار بررسی"
      : currentStep?.state === "active"
        ? "نیاز به اقدام"
        : progress.percent >= 100
          ? "تکمیل‌شده"
          : "رو به جلو";

  return (
    <div className="gp-dashboard">
      {/* Hero — compact, ring-forward */}
      <section
        className="gp-hero"
        data-portal-accent={hero.accent}
        aria-labelledby="gp-hero-title"
      >
        <div className="gp-hero__glow" aria-hidden="true" />
        <div className="gp-hero__orb gp-hero__orb--a" aria-hidden="true" />
        <div className="gp-hero__orb gp-hero__orb--b" aria-hidden="true" />

        <div className="gp-hero__layout">
          <div className="gp-hero__content">
            <p className="gp-hero__eyebrow">{hero.eyebrow}</p>
            <p className="gp-hero__greeting">سلام {studentName}</p>
            <h1 id="gp-hero-title" className="gp-hero__headline">
              {hero.headline}
            </h1>
            <p className="gp-hero__support">{hero.support}</p>

            <dl className="gp-hero__facts">
              <div>
                <dt>وضعیت</dt>
                <dd>{progress.currentStageLabel}</dd>
              </div>
              <div>
                <dt>قدم فعلی</dt>
                <dd>{currentStep?.title ?? progress.currentStageLabel}</dd>
              </div>
              <div>
                <dt>مشاور</dt>
                <dd>به‌زودی اختصاص می‌یابد</dd>
              </div>
            </dl>

            <div className="gp-hero__actions">
              <Link href={primaryHref} className="gp-hero__cta gp-hero__cta--primary">
                {primaryLabel}
              </Link>
              <Link
                href="/portal/student/services/guidance?view=case"
                className="gp-hero__cta gp-hero__cta--secondary"
              >
                مشاهده پرونده
              </Link>
            </div>
          </div>

          <div className="gp-hero__focus">
            <GuidanceHeroRing percent={progress.percent} />
            <ul className="gp-hero__ring-meta">
              <li>
                <span>مرحله</span>
                <strong>{progress.currentStageLabel}</strong>
              </li>
              <li>
                <span>سلامت پرونده</span>
                <strong>{caseHealth}</strong>
              </li>
              <li>
                <span>پیشرفت</span>
                <strong>
                  {toPersianDigits(progress.completedSteps)}/
                  {toPersianDigits(progress.totalSteps)}
                </strong>
              </li>
            </ul>
            <div className="gp-hero__art" aria-hidden="true">
              <PortalIcon name={hero.icon} className="size-10" />
            </div>
          </div>
        </div>
      </section>

      {/* Summary — one idea per card, no duplicates */}
      <section className="gp-summary" aria-label="خلاصه اقدام">
        <article className="gp-summary__card" data-portal-accent="gold">
          <p className="gp-summary__label">قدم فعلی</p>
          <p className="gp-summary__value gp-summary__value--sm">
            {currentStep?.title ?? progress.currentStageLabel}
          </p>
          <p className="gp-summary__hint">
            {JOURNEY_STATE_LABEL[currentStep?.state ?? "locked"]}
          </p>
        </article>

        <article className="gp-summary__card" data-portal-accent="purple">
          <p className="gp-summary__label">اقدام بعدی</p>
          <p className="gp-summary__value gp-summary__value--sm">
            {nextAction.label}
          </p>
          <p className="gp-summary__hint">
            <Link href={nextAction.href}>شروع اقدام</Link>
          </p>
        </article>

        <article className="gp-summary__card" data-portal-accent="orange">
          <p className="gp-summary__label">جلسه آینده</p>
          <p className="gp-summary__value gp-summary__value--sm">رزرو نشده</p>
          <p className="gp-summary__hint">
            <Link href="/portal/student/services/guidance?view=sessions">
              مدیریت جلسات
            </Link>
          </p>
        </article>

        <article className="gp-summary__card" data-portal-accent="blue">
          <p className="gp-summary__label">وضعیت پرونده</p>
          <p className="gp-summary__value gp-summary__value--sm">{caseStatus}</p>
          <p className="gp-summary__hint">{caseHealth}</p>
        </article>
      </section>

      {/* Journey centerpiece — unchanged structure (next phase) */}
      <section className="gp-journey" aria-labelledby="gp-journey-title">
        <div className="gp-section-head">
          <div>
            <h2 id="gp-journey-title" className="portal-section-title">
              سفر هدایت
            </h2>
            <p className="portal-section-support">
              از ثبت‌نام تا انتخاب نهایی رشته
            </p>
          </div>
          <Link
            href="/portal/student/services/guidance?view=journey"
            className="gp-section-link"
          >
            نمای کامل
          </Link>
        </div>
        <PortalJourneyTrack steps={steps} />
      </section>

      {/* Today's tasks */}
      <section className="gp-tasks" aria-labelledby="gp-tasks-title">
        <div className="gp-section-head">
          <div>
            <h2 id="gp-tasks-title" className="portal-section-title">
              کارهای امروز
            </h2>
            <p className="portal-section-support">
              فقط اقدام‌های مرتبط با انتخاب رشته
            </p>
          </div>
        </div>
        {tasks.length === 0 ? (
          <div className="gp-empty">
            <div className="gp-empty__icon" aria-hidden="true">
              <PortalIcon name="medal" className="size-6" />
            </div>
            <p className="gp-empty__title">فعلاً کار فوری نداری</p>
            <p className="gp-empty__desc">
              وقتی قدم بعدی باز شود، اینجا ظاهر می‌شود.
            </p>
            <Link
              href="/portal/student/services/guidance?view=journey"
              className="gp-empty__cta"
            >
              مرور سفر هدایت
            </Link>
          </div>
        ) : (
          <ul className="gp-tasks__grid">
            {tasks.map((task) => (
              <li key={task.id}>
                <Link
                  href={task.href}
                  className="gp-task"
                  data-portal-accent={task.accent}
                >
                  <span className="gp-task__icon" aria-hidden="true">
                    <PortalIcon name={task.icon} className="size-5" />
                  </span>
                  <span className="gp-task__body">
                    <span className="gp-task__title">{task.title}</span>
                    <span className="gp-task__desc">{task.description}</span>
                  </span>
                  <span className="gp-task__cta">{task.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Secondary rail — de-emphasized */}
      <section className="gp-rail" aria-label="همراهی و مدارک">
        <article className="gp-card gp-counselor">
          <div className="gp-card__head">
            <h2 className="gp-card__title">مشاور من</h2>
            <Link
              href="/portal/student/services/guidance?view=counselor"
              className="gp-section-link"
            >
              جزئیات
            </Link>
          </div>
          <div className="gp-counselor__avatar" aria-hidden="true">
            <PortalIcon name="users" className="size-7" />
          </div>
          <p className="gp-counselor__name">هنوز مشاوری اختصاص نیافته</p>
          <p className="gp-counselor__meta">تخصص: هدایت تحصیلی و انتخاب رشته</p>
          <p className="gp-counselor__msg">
            پیام اخیر: پس از آماده‌سازی پرونده، مشاور با شما هماهنگ می‌کند.
          </p>
          <div className="gp-counselor__actions">
            <Link
              href="/portal/student/services/guidance?view=messages"
              className="gp-card__btn"
            >
              پیام‌ها
            </Link>
            <Link
              href="/portal/student/services/guidance?view=sessions"
              className="gp-card__btn gp-card__btn--ghost"
            >
              جلسات
            </Link>
          </div>
        </article>

        <article className="gp-card gp-documents">
          <div className="gp-card__head">
            <h2 className="gp-card__title">مدارک</h2>
            <Link
              href="/portal/student/services/guidance?view=documents"
              className="gp-section-link"
            >
              همه مدارک
            </Link>
          </div>
          <ul className="gp-documents__list">
            <li>
              <span>کارنامه نهایی</span>
              <span className="gp-doc-status" data-status="check">
                از مسیر سفر بررسی کن
              </span>
            </li>
            <li>
              <span>سهمیه</span>
              <span className="gp-doc-status" data-status="missing">
                ناقص
              </span>
            </li>
            <li>
              <span>کارت ملی</span>
              <span className="gp-doc-status" data-status="missing">
                ناقص
              </span>
            </li>
            <li>
              <span>سایر مدارک</span>
              <span className="gp-doc-status" data-status="soon">
                به‌زودی
              </span>
            </li>
          </ul>
        </article>

        <article className="gp-card gp-activity">
          <div className="gp-card__head">
            <h2 className="gp-card__title">فعالیت اخیر</h2>
          </div>
          <ul className="gp-activity__list">
            <li>
              <span className="gp-activity__dot" aria-hidden="true" />
              به‌روزرسانی وضعیت سفر هدایت
            </li>
            <li>
              <span className="gp-activity__dot" aria-hidden="true" />
              آماده‌سازی فضای پیام مشاور
            </li>
            <li>
              <span className="gp-activity__dot" aria-hidden="true" />
              معماری مدارک پرونده
            </li>
          </ul>
          <Link
            href="/portal/student/services/guidance?view=messages"
            className="gp-card__btn gp-card__btn--block"
          >
            پیام‌های مشاور
          </Link>
        </article>
      </section>

      <section className="gp-future" aria-labelledby="gp-future-title">
        <div className="gp-section-head">
          <div>
            <h2 id="gp-future-title" className="portal-section-title">
              افق آینده
            </h2>
            <p className="portal-section-support">معماری آماده — فازهای بعدی</p>
          </div>
        </div>
        <div className="gp-future__grid">
          <Link
            href="/portal/student/services/guidance?view=majors"
            className="gp-future__card"
            data-portal-accent="gold"
          >
            <PortalIcon name="layers" className="size-6" />
            <span>رشته‌های پیشنهادی</span>
            <em>به‌زودی</em>
          </Link>
          <Link
            href="/portal/student/services/guidance?view=universities"
            className="gp-future__card"
            data-portal-accent="blue"
          >
            <PortalIcon name="grid" className="size-6" />
            <span>دانشگاه‌های پیشنهادی</span>
            <em>به‌زودی</em>
          </Link>
          <div className="gp-future__card" data-portal-accent="teal">
            <PortalIcon name="chart" className="size-6" />
            <span>احتمال قبولی</span>
            <em>به‌زودی</em>
          </div>
          <div className="gp-future__card" data-portal-accent="orange">
            <PortalIcon name="spark" className="size-6" />
            <span>بورسیه و تسهیلات</span>
            <em>به‌زودی</em>
          </div>
        </div>
      </section>

      <div className="gp-sticky-cta">
        <Link href={primaryHref} className="gp-sticky-cta__btn">
          {primaryLabel}
        </Link>
      </div>
    </div>
  );
}
