import Link from "next/link";
import { GUIDANCE_CANONICAL_HOME } from "@/lib/guidance/canonical-entry";
import { toPersianDigits } from "@/lib/persian";
import type { GuidanceV2SidebarStep } from "@/lib/guidance/journey-v2/state";
import { LateJourneyTimeline } from "@/components/guidance/v2-late/LateJourneyTimeline";
import type { LateStepStatusView } from "@/lib/guidance/journey-v2/late-status";
import { GUIDANCE_EDIT_WARNING } from "@/lib/guidance/journey-v2/step-access-policy";

function PrevChevron() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M7.5 4.5 13.5 10l-6 5.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LateStepPaymentLock(props: { paymentHref: string }) {
  return (
    <section className="gv2-pay-lock" role="alert">
      <p className="gv2-pay-lock__eyebrow">پرداخت بسته انتخاب رشته</p>
      <h2>ادامه مسیر نیازمند پرداخت بسته است</h2>
      <p>برای ادامه، بسته انتخاب رشته باید پرداخت شده باشد.</p>
      <Link className="gv2-late-nav__link gv2-late-nav__link--pay" href={props.paymentHref}>
        بازگشت به انتخاب پلن و پرداخت
      </Link>
    </section>
  );
}

export function LateStepLookBackNotice(props: {
  currentStep: number;
  currentHref: string;
}) {
  return (
    <section className="gv2-status-card gv2-status-card--premium">
      <p className="gv2-status-card__eyebrow">مرحله محافظت‌شده</p>
      <h2>این مرحله قابل ویرایش دانش‌آموز نیست</h2>
      <p>ادامه این بخش با مشاور یا ناظر است. برای ادامه به مرحله جاری پرونده برگردید.</p>
      <Link className="gv2-late-nav__link gv2-late-nav__link--prev" href={props.currentHref}>
        بازگشت به مرحله {toPersianDigits(props.currentStep)}
      </Link>
    </section>
  );
}

export function LateStepEditWarning() {
  return (
    <p className="gjv2-edit-warning" role="status">
      {GUIDANCE_EDIT_WARNING}
    </p>
  );
}

export function LateStepShell(props: {
  stepId: number;
  title: string;
  description: string;
  sidebarSteps: readonly GuidanceV2SidebarStep[];
  completionPercentage: number;
  packagePaid: boolean;
  previousHref: string;
  paymentHref: string;
  dashboardHref?: string;
  timeline?: readonly LateStepStatusView[];
  children: React.ReactNode;
}) {
  const dashboardHref = props.dashboardHref ?? GUIDANCE_CANONICAL_HOME;

  return (
    <div className="gjv2-shell gjv2-shell--compact gv2-late" dir="rtl">
      <header className="gjv2-header">
        <div className="gjv2-header__top">
          <Link href={dashboardHref} className="gjv2-header__back gv2-late-header-back">
            بازگشت به داشبورد
          </Link>
        </div>
        <div className="gjv2-header__intro">
          <div>
            <p className="gjv2-header__step">
              مرحله {toPersianDigits(props.stepId)} از {toPersianDigits(18)}
            </p>
            <h1>{props.title}</h1>
            <p>{props.description}</p>
          </div>
          <div className="gjv2-header__progress">
            <span>{toPersianDigits(props.completionPercentage)}٪</span>
            <div className="gjv2-header__progress-track">
              <div
                className="gjv2-header__progress-fill"
                style={{ width: `${Math.max(3, props.completionPercentage)}%` }}
              />
            </div>
          </div>
        </div>
      </header>
      <div className="gjv2-layout">
        <main className="gjv2-main">
          {props.timeline ? <LateJourneyTimeline items={props.timeline} /> : null}
          <nav className="gv2-late-nav" aria-label="ناوبری مراحل انتخاب رشته">
            {props.packagePaid ? null : (
              <Link className="gv2-late-nav__link gv2-late-nav__link--pay" href={props.paymentHref}>
                بازگشت به انتخاب پلن و پرداخت
              </Link>
            )}
            <Link className="gv2-late-nav__link gv2-late-nav__link--prev" href={props.previousHref}>
              <PrevChevron />
              <span>مرحله قبل</span>
            </Link>
            <Link className="gv2-late-nav__link gv2-late-nav__link--dash" href={dashboardHref}>
              بازگشت به داشبورد
            </Link>
          </nav>
          {props.children}
        </main>
        <aside className="gjv2-sidebar" aria-label="مراحل انتخاب رشته">
          <ol className="gjv2-sidebar__list">
            {props.sidebarSteps.map((step) => (
              <li
                key={step.id}
                className={`gjv2-sidebar__item gjv2-sidebar__item--${step.status}`}
              >
                <span className="gjv2-sidebar__number">
                  {toPersianDigits(step.id)}
                </span>
                <div className="gjv2-sidebar__content">
                  <span className="gjv2-sidebar__stage">
                    مرحله {toPersianDigits(step.id)}
                  </span>
                  <strong>{step.title}</strong>
                </div>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </div>
  );
}
