import Link from "next/link";
import { PortalIcon } from "@/components/portal/icons";
import { PortalSurface } from "@/components/portal/PortalSurface";
import {
  AnalysisCard,
  AnalysisEmptyState,
} from "@/components/guidance/analysis/AnalysisCard";
import { formatJalaliDateShort } from "@/lib/datetime/jalali";
import { toPersianDigits } from "@/lib/persian";
import type { AnalysisPresentationModel } from "@/lib/guidance/analysis/types";

type GuidanceAnalysisScreenProps = {
  model: AnalysisPresentationModel;
};

/**
 * Initial Analysis Center — presentational only.
 * Consumes AnalysisPresentationModel; no fetching / mutations.
 */
export function GuidanceAnalysisScreen({ model }: GuidanceAnalysisScreenProps) {
  const { hero, academic, grades, analysisStatus, journey, checklist, insights, recommendations } =
    model;

  return (
    <div className="guidance-analysis" data-analysis-status={analysisStatus.status}>
      <header
        className="guidance-analysis-hero"
        data-portal-accent={hero.accent}
      >
        <div className="guidance-analysis-hero__glow" aria-hidden="true" />
        <div className="guidance-analysis-hero__inner">
          <span className="guidance-analysis-hero__icon" aria-hidden="true">
            <PortalIcon name={hero.icon} className="size-6" />
          </span>
          <p className="guidance-analysis-hero__eyebrow">{hero.eyebrow}</p>
          <p className="guidance-analysis-hero__chip">{hero.statusLabel}</p>
          <h1 className="guidance-analysis-hero__headline">{hero.headline}</h1>
          <p className="guidance-analysis-hero__support">{hero.support}</p>
          <div className="guidance-analysis-hero__actions">
            <Link href={hero.primaryCta.href} className="guidance-analysis-hero__cta">
              {hero.primaryCta.label}
            </Link>
            {hero.secondaryCta ? (
              <Link
                href={hero.secondaryCta.href}
                className="guidance-analysis-hero__cta guidance-analysis-hero__cta--ghost"
              >
                {hero.secondaryCta.label}
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      {/* 1. Academic Summary */}
      <section className="guidance-analysis-section" aria-labelledby="analysis-academic">
        <div className="guidance-analysis-section__head">
          <h2 id="analysis-academic" className="portal-section-title">
            خلاصه تحصیلی
          </h2>
          <p className="portal-section-support">
            میانگین، گروه آزمایشی و وضعیت پایه — بدون داده ساختگی.
          </p>
        </div>
        <div className="guidance-analysis-stats">
          <PortalSurface accent="blue" padding="md" className="guidance-analysis-stat">
            <p className="guidance-analysis-stat__label">{academic.averageLabel}</p>
            <p className="guidance-analysis-stat__value">
              {academic.averageValue
                ? toPersianDigits(academic.averageValue)
                : "—"}
            </p>
            {academic.averageHint ? (
              <p className="guidance-analysis-stat__hint">{academic.averageHint}</p>
            ) : null}
          </PortalSurface>
          <PortalSurface accent="gold" padding="md" className="guidance-analysis-stat">
            <p className="guidance-analysis-stat__label">گروه آزمایشی</p>
            <p className="guidance-analysis-stat__value">{academic.examGroupLabel}</p>
            <p className="guidance-analysis-stat__hint">{academic.examGroupCode}</p>
          </PortalSurface>
          <PortalSurface accent="teal" padding="md" className="guidance-analysis-stat">
            <p className="guidance-analysis-stat__label">{academic.graduationLabel}</p>
            <p className="guidance-analysis-stat__value">
              {academic.graduationValue ?? "—"}
            </p>
            {academic.graduationHint ? (
              <p className="guidance-analysis-stat__hint">{academic.graduationHint}</p>
            ) : null}
          </PortalSurface>
        </div>
      </section>

      {/* 2. Uploaded Grades */}
      <section className="guidance-analysis-section" aria-labelledby="analysis-grades">
        <div className="guidance-analysis-section__head">
          <h2 id="analysis-grades" className="portal-section-title">
            کارنامه بارگذاری‌شده
          </h2>
          <p className="portal-section-support">
            آخرین نسخه، تاریخچه و امکان جایگزینی.
          </p>
        </div>
        <div className="guidance-analysis-grades">
          <PortalSurface accent="orange" padding="md" className="guidance-analysis-grades__latest">
            {grades.latest ? (
              <>
                <p className="guidance-analysis-grades__kicker">آخرین نسخه</p>
                <p className="guidance-analysis-grades__file">
                  {grades.latest.originalFilename}
                </p>
                <p className="guidance-analysis-grades__meta">
                  نسخه {toPersianDigits(grades.latest.versionNumber)} ·{" "}
                  {grades.latest.verificationLabel} ·{" "}
                  {formatJalaliDateShort(new Date(grades.latest.createdAtIso))}
                </p>
              </>
            ) : (
              <p className="guidance-analysis-grades__file">هنوز کارنامه‌ای نیست</p>
            )}
            <Link
              href={grades.replaceAction.href}
              className="guidance-analysis-card__cta"
            >
              {grades.replaceAction.label}
            </Link>
          </PortalSurface>

          <PortalSurface accent="blue" padding="md" className="guidance-analysis-grades__history">
            <p className="guidance-analysis-grades__kicker">تاریخچه بارگذاری</p>
            {grades.history.length === 0 ? (
              <p className="guidance-analysis-stat__hint">تاریخچه‌ای ثبت نشده است.</p>
            ) : (
              <ul className="guidance-analysis-history">
                {grades.history.map((item) => (
                  <li key={item.id} className="guidance-analysis-history__item">
                    <span className="guidance-analysis-history__ver">
                      v{toPersianDigits(item.versionNumber)}
                      {item.isLatest ? " · فعلی" : ""}
                    </span>
                    <span className="guidance-analysis-history__name">
                      {item.originalFilename}
                    </span>
                    <span className="guidance-analysis-history__status">
                      {item.verificationLabel}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </PortalSurface>
        </div>
      </section>

      {/* 3. Analysis Status */}
      <section className="guidance-analysis-section" aria-labelledby="analysis-status">
        <div className="guidance-analysis-section__head">
          <h2 id="analysis-status" className="portal-section-title">
            وضعیت تحلیل
          </h2>
          <p className="portal-section-support">{analysisStatus.description}</p>
        </div>
        <div className="guidance-analysis-grid">
          {analysisStatus.cards.map((card) => (
            <AnalysisCard
              key={card.id}
              card={card}
              emphasized={card.status === analysisStatus.status}
            />
          ))}
        </div>
      </section>

      {/* 4. Student Journey */}
      <section className="guidance-analysis-section" aria-labelledby="analysis-journey">
        <div className="guidance-analysis-section__head">
          <h2 id="analysis-journey" className="portal-section-title">
            مسیر دانش‌آموز
          </h2>
          <p className="portal-section-support">
            انجام‌شده {toPersianDigits(journey.completedCount)}
            {journey.currentLabel
              ? ` · فعلی: ${journey.currentLabel}`
              : ""}
            {" · "}
            باقیمانده {toPersianDigits(journey.remainingCount)}
          </p>
        </div>
        <div className="guidance-analysis-grid guidance-analysis-grid--journey">
          {journey.cards.map((card) => (
            <AnalysisCard key={card.id} card={card} />
          ))}
        </div>
      </section>

      {/* 5. Preparation Checklist */}
      <section className="guidance-analysis-section" aria-labelledby="analysis-checklist">
        <div className="guidance-analysis-section__head">
          <h2 id="analysis-checklist" className="portal-section-title">
            چک‌لیست آماده‌سازی
          </h2>
          <p className="portal-section-support">
            پروفایل، کارنامه، آزمون رغبت، جلسه و مدارک.
          </p>
        </div>
        <div className="guidance-analysis-grid">
          {checklist.items.map((item) => (
            <AnalysisCard
              key={item.id}
              card={{
                id: item.id,
                icon: item.icon,
                title: item.title,
                status: item.status,
                statusLabel: item.statusLabel,
                description: item.description,
                cta: item.cta,
                accent:
                  item.status === "complete"
                    ? "emerald"
                    : item.status === "active"
                      ? "gold"
                      : "blue",
              }}
            />
          ))}
        </div>
      </section>

      {/* 6. Insights — architecture only */}
      <section className="guidance-analysis-section" aria-labelledby="analysis-insights">
        <div className="guidance-analysis-section__head">
          <h2 id="analysis-insights" className="portal-section-title">
            بینش‌ها
          </h2>
          <p className="portal-section-support">
            خلاصه قاعده‌محور پس از بررسی مشاور.
          </p>
        </div>
        {insights.items.length === 0 ? (
          <AnalysisEmptyState
            title={insights.empty.title}
            description={insights.empty.description}
          />
        ) : (
          <div className="guidance-analysis-grid">
            {insights.items.map((card) => (
              <AnalysisCard key={card.id} card={card} />
            ))}
          </div>
        )}
      </section>

      {/* 7. Recommendations — rule-based */}
      <section className="guidance-analysis-section" aria-labelledby="analysis-recs">
        <div className="guidance-analysis-section__head">
          <h2 id="analysis-recs" className="portal-section-title">
            پیشنهادها
          </h2>
          <p className="portal-section-support">
            قاعده‌محور — گام بعدی مسیر.
          </p>
        </div>
        {recommendations.primary ? (
          <div className="guidance-analysis-recs">
            <AnalysisCard card={{
              id: recommendations.primary.id,
              icon: recommendations.primary.icon,
              title: recommendations.primary.title,
              status: recommendations.primary.status,
              statusLabel: recommendations.primary.statusLabel,
              description: recommendations.primary.description,
              cta: recommendations.primary.cta,
              accent: "gold",
            }} emphasized />
            <div className="guidance-analysis-grid">
              {recommendations.secondary.map((rec) => (
                <AnalysisCard
                  key={rec.id}
                  card={{
                    id: rec.id,
                    icon: rec.icon,
                    title: rec.title,
                    status: rec.status,
                    statusLabel: rec.statusLabel,
                    description: rec.description,
                    cta: rec.cta,
                    accent: "teal",
                  }}
                />
              ))}
            </div>
          </div>
        ) : (
          <AnalysisEmptyState
            icon="medal"
            title="فعلاً پیشنهاد فوری نیست"
            description="وقتی گامی باز شود، پیشنهاد قاعده‌محور اینجا می‌آید."
          />
        )}
      </section>
    </div>
  );
}
