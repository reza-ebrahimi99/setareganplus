import Link from "next/link";
import { PortalIcon } from "@/components/portal/icons";
import { toPersianDigits } from "@/lib/persian";
import type { PortalJourneyModel } from "@/components/portal/journey/types";
import type { AnalysisPresentationModel } from "@/lib/guidance/analysis/types";
import { GUIDANCE_PLATFORM_BRAND } from "@/lib/guidance/portal-nav";

type GuidanceCaseScreenProps = {
  studentName: string;
  journey: PortalJourneyModel;
  analysis: AnalysisPresentationModel | null;
  planPublicId: string;
};

/**
 * My Guidance Case — presentational dossier overview.
 * Reuses journey + analysis models only.
 */
export function GuidanceCaseScreen({
  studentName,
  journey,
  analysis,
  planPublicId,
}: GuidanceCaseScreenProps) {
  const { progress, steps } = journey;

  return (
    <div className="gp-case">
      <header className="gp-case__hero">
        <p className="gp-case__eyebrow">{GUIDANCE_PLATFORM_BRAND.eyebrow}</p>
        <h1 className="gp-case__title">پرونده هدایت من</h1>
        <p className="gp-case__support">
          {studentName} — خلاصه وضعیت پرونده انتخاب رشته بدون ویجت‌های مدرسه‌ای
        </p>
        <p className="gp-case__id">شناسه پرونده: {planPublicId}</p>
      </header>

      <section className="gp-summary" aria-label="وضعیت پرونده">
        <article className="gp-summary__card" data-portal-accent="purple">
          <p className="gp-summary__label">تکمیل مسیر</p>
          <p className="gp-summary__value">
            {toPersianDigits(progress.percent)}٪
          </p>
          <p className="gp-summary__hint">
            {toPersianDigits(progress.completedSteps)} از{" "}
            {toPersianDigits(progress.totalSteps)} قدم
          </p>
        </article>
        <article className="gp-summary__card" data-portal-accent="gold">
          <p className="gp-summary__label">مرحله فعلی</p>
          <p className="gp-summary__value gp-summary__value--sm">
            {progress.currentStageLabel}
          </p>
          <p className="gp-summary__hint">
            {analysis?.analysisStatus.title ?? "در حال آماده‌سازی"}
          </p>
        </article>
      </section>

      <section className="gp-case__steps" aria-labelledby="gp-case-steps">
        <h2 id="gp-case-steps" className="portal-section-title">
          گام‌های پرونده
        </h2>
        <ul className="gp-case__list">
          {steps.map((step) => (
            <li key={step.id} className="gp-case__item" data-state={step.state}>
              <span className="gp-case__item-icon" aria-hidden="true">
                <PortalIcon name={step.icon} className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="gp-case__item-title">{step.title}</p>
                <p className="gp-case__item-desc">{step.description}</p>
              </div>
              {step.action ? (
                <Link href={step.action.href} className="gp-card__btn">
                  {step.action.label}
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <div className="gp-case__footer">
        <Link
          href="/portal/student/services/guidance"
          className="gp-placeholder__cta"
        >
          بازگشت به داشبورد
        </Link>
      </div>
    </div>
  );
}
