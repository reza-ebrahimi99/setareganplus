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

/**
 * Guidance Platform home — Major Selection dashboard.
 * Presentation only: composes existing journey / analysis models.
 * No school widgets (achievements, exams, XP, homework).
 */
export function GuidancePlatformDashboard({
  studentName,
  journey,
  analysis,
}: GuidancePlatformDashboardProps) {
  const { progress, hero, steps } = journey;
  const tasks = buildTodayTasks(steps);
  const primaryCta = hero.cta;
  const caseStatus =
    analysis?.analysisStatus.title ??
    JOURNEY_STATE_LABEL[
      steps.find((s) => s.state === "active" || s.state === "waiting")?.state ??
        "locked"
    ];

  return (
    <div className="gp-dashboard">
      {/* Hero */}
      <section
        className="gp-hero"
        data-portal-accent={hero.accent}
        aria-labelledby="gp-hero-title"
      >
        <div className="gp-hero__glow" aria-hidden="true" />
        <div className="gp-hero__orb gp-hero__orb--a" aria-hidden="true" />
        <div className="gp-hero__orb gp-hero__orb--b" aria-hidden="true" />
        <div className="gp-hero__art" aria-hidden="true">
          <PortalIcon name={hero.icon} className="size-14" />
        </div>
        <div className="gp-hero__content">
          <p className="gp-hero__eyebrow">{hero.eyebrow}</p>
          <p className="gp-hero__greeting">
            سلام {studentName} — آماده‌ای برای ادامه انتخاب رشته؟
          </p>
          <h1 id="gp-hero-title" className="gp-hero__headline">
            {hero.headline}
          </h1>
          <p className="gp-hero__support">{hero.support}</p>
          <div className="gp-hero__meta">
            <span className="gp-hero__chip">
              وضعیت: {progress.currentStageLabel}
            </span>
            <span className="gp-hero__chip">
              تکمیل {toPersianDigits(progress.percent)}٪
            </span>
            <span className="gp-hero__chip">مشاور: به‌زودی اختصاص می‌یابد</span>
          </div>
          {primaryCta ? (
            <Link href={primaryCta.href} className="gp-hero__cta">
              {primaryCta.label === "ادامه مسیر"
                ? "ادامه سفر هدایت"
                : primaryCta.label}
            </Link>
          ) : (
            <Link
              href="/portal/student/services/guidance?view=journey"
              className="gp-hero__cta"
            >
              مشاهده سفر هدایت
            </Link>
          )}
        </div>
      </section>

      {/* Summary cards */}
      <section className="gp-summary" aria-label="خلاصه پرونده">
        <article className="gp-summary__card" data-portal-accent="gold">
          <p className="gp-summary__label">وضعیت پرونده</p>
          <p className="gp-summary__value">{caseStatus}</p>
          <p className="gp-summary__hint">{progress.currentStageLabel}</p>
        </article>
        <article className="gp-summary__card" data-portal-accent="blue">
          <p className="gp-summary__label">مشاور اختصاصی</p>
          <p className="gp-summary__value gp-summary__value--sm">در صف تخصیص</p>
          <p className="gp-summary__hint">پس از آماده‌سازی پرونده</p>
        </article>
        <article className="gp-summary__card" data-portal-accent="orange">
          <p className="gp-summary__label">جلسه آینده</p>
          <p className="gp-summary__value gp-summary__value--sm">هنوز رزرو نشده</p>
          <p className="gp-summary__hint">
            <Link href="/portal/student/services/guidance?view=sessions">
              مشاهده جلسات
            </Link>
          </p>
        </article>
        <article className="gp-summary__card" data-portal-accent="purple">
          <p className="gp-summary__label">درصد تکمیل</p>
          <p className="gp-summary__value">
            {toPersianDigits(progress.percent)}٪
          </p>
          <div
            className="gp-summary__bar"
            role="progressbar"
            aria-valuenow={progress.percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="پیشرفت مسیر انتخاب رشته"
          >
            <span style={{ width: `${progress.percent}%` }} />
          </div>
        </article>
      </section>

      {/* Journey centerpiece */}
      <section className="gp-journey" aria-labelledby="gp-journey-title">
        <div className="gp-section-head">
          <div>
            <h2 id="gp-journey-title" className="portal-section-title">
              سفر هدایت
            </h2>
            <p className="portal-section-support">
              از ثبت‌نام تا انتخاب نهایی رشته — مرکز داشبورد شما
            </p>
          </div>
          <Link
            href="/portal/student/services/guidance?view=journey"
            className="gp-section-link"
          >
            نمای کامل سفر
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
              وقتی قدم بعدی باز شود، اینجا ظاهر می‌شود. می‌توانی سفر یا تحلیل را
              مرور کنی.
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

      {/* Counselor + Documents + Messages */}
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

      {/* Future placeholders */}
      <section className="gp-future" aria-labelledby="gp-future-title">
        <div className="gp-section-head">
          <div>
            <h2 id="gp-future-title" className="portal-section-title">
              افق آینده
            </h2>
            <p className="portal-section-support">
              معماری آماده — پیاده‌سازی در فازهای بعدی
            </p>
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

      {primaryCta ? (
        <div className="gp-sticky-cta">
          <Link href={primaryCta.href} className="gp-sticky-cta__btn">
            ادامه سفر هدایت
          </Link>
        </div>
      ) : null}
    </div>
  );
}
