import Link from "next/link";
import { PortalIcon } from "@/components/portal/icons";
import type { OfficeDashboardModel } from "@/lib/guidance/office/dashboard";
import {
  DISCOVER_CENTER_MAJORS,
  DISCOVER_CENTER_SYSTEMS,
} from "@/lib/guidance/office/nav";
import { toPersianDigits } from "@/lib/persian";

const GUIDANCE_PLANS_HREF = "/portal/student/services/guidance/steps/3";

function firstName(full: string): string {
  const part = full.trim().split(/\s+/).filter(Boolean)[0];
  return part && part !== "داوطلب" ? part : full;
}

export function GuidanceStudentDashboardPanels({
  model,
}: {
  model: OfficeDashboardModel;
}) {
  const { pulse } = model;
  const name = firstName(model.studentName);
  const journeySubtitle = model.packagePaid
    ? `گام بعدی: ${model.todayTask.title}`
    : `گام بعدی: ${model.todayTask.title}${model.packageLabel ? " · بسته هنوز فعال نشده" : ""}`;

  return (
    <div className="guidance-command-center">
      <section className="guidance-command-hero" aria-labelledby="guidance-command-hero-title">
        <div className="guidance-command-hero__glow" aria-hidden="true" />
        <div className="guidance-command-hero__grid" aria-hidden="true" />

        <div className="guidance-command-hero__content">
          <p className="guidance-command-hero__eyebrow">انتخاب رشته هوشمند و تخصصی</p>
          <p className="guidance-command-hero__welcome">سلام، {name}.</p>
          <h1 id="guidance-command-hero-title" className="guidance-command-hero__headline">
            مسیر درست دانشگاه از یک انتخاب آگاهانه شروع می‌شود
          </h1>
          <p className="guidance-command-hero__support">
            از شناخت علایق و تحلیل وضعیت تحصیلی تا بررسی رشته‌ها، دانشگاه‌ها و ساخت
            مسیر نهایی انتخاب رشته.
          </p>

          <div className="guidance-command-hero__actions">
            <Link href={model.todayTask.href} className="guidance-command-hero__cta guidance-command-hero__cta--primary">
              <span>ادامه مسیر انتخاب رشته</span>
              <PortalIcon name="route" className="size-5" aria-hidden="true" />
            </Link>
            <Link
              href={DISCOVER_CENTER_MAJORS}
              className="guidance-command-hero__cta guidance-command-hero__cta--secondary"
            >
              <span>مشاهده رشته‌های دانشگاهی</span>
              <PortalIcon name="layers" className="size-5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section
        className="guidance-command-progress"
        aria-labelledby="guidance-command-progress-title"
      >
        <div className="guidance-command-progress__head">
          <h2 id="guidance-command-progress-title">وضعیت مسیر شما</h2>
          <span className="guidance-command-progress__badge">{pulse.statusLabel}</span>
        </div>

        <dl className="guidance-command-progress__facts">
          <div>
            <dt>فصل جاری</dt>
            <dd>{pulse.currentChapter}</dd>
          </div>
          <div>
            <dt>مرحله فعال</dt>
            <dd>{pulse.currentStepTitle}</dd>
          </div>
          <div>
            <dt>گام بعدی</dt>
            <dd>{model.todayTask.title}</dd>
          </div>
        </dl>

        <div className="guidance-command-progress__bar" aria-hidden="true">
          <span style={{ width: `${pulse.completionPercentage}%` }} />
        </div>
        <p className="guidance-command-progress__hint">{pulse.waitingBody}</p>
      </section>

      <section className="guidance-command-grid" aria-label="دسترسی‌های اصلی">
        <Link
          href={model.todayTask.href}
          className="guidance-command-card guidance-command-card--primary"
        >
          <span className="guidance-command-card__icon" aria-hidden="true">
            <PortalIcon name="route" className="size-6" />
          </span>
          <span className="guidance-command-card__eyebrow">مسیر همراهی</span>
          <strong className="guidance-command-card__title">ادامه مسیر انتخاب رشته</strong>
          <em className="guidance-command-card__desc">{journeySubtitle}</em>
          <span className="guidance-command-card__cta">
            {model.todayTask.label}
            <PortalIcon name="route" className="size-4" aria-hidden="true" />
          </span>
        </Link>

        <Link href={DISCOVER_CENTER_MAJORS} className="guidance-command-card">
          <span className="guidance-command-card__icon" aria-hidden="true">
            <PortalIcon name="layers" className="size-6" />
          </span>
          <span className="guidance-command-card__eyebrow">دانشنامه</span>
          <strong className="guidance-command-card__title">دانشنامه رشته‌های دانشگاهی</strong>
          <em className="guidance-command-card__desc">
            رشته‌ها را بر اساس گروه آزمایشی، علایق و مسیر آینده بررسی کنید.
          </em>
          <span className="guidance-command-card__cta">
            ورود به دانشنامه
            <PortalIcon name="layers" className="size-4" aria-hidden="true" />
          </span>
        </Link>

        <Link href={DISCOVER_CENTER_SYSTEMS} className="guidance-command-card">
          <span className="guidance-command-card__icon" aria-hidden="true">
            <PortalIcon name="grid" className="size-6" />
          </span>
          <span className="guidance-command-card__eyebrow">دانشنامه</span>
          <strong className="guidance-command-card__title">دانشنامه دانشگاه‌ها</strong>
          <em className="guidance-command-card__desc">
            نظام‌های آموزشی، مقاطع و انواع پذیرش را قبل از انتخاب نهایی بشناسید.
          </em>
          <span className="guidance-command-card__cta">
            ورود به دانشنامه
            <PortalIcon name="grid" className="size-4" aria-hidden="true" />
          </span>
        </Link>

        <Link href={GUIDANCE_PLANS_HREF} className="guidance-command-card">
          <span className="guidance-command-card__icon" aria-hidden="true">
            <PortalIcon name="clipboard" className="size-6" />
          </span>
          <span className="guidance-command-card__eyebrow">خدمات تخصصی</span>
          <strong className="guidance-command-card__title">پلن‌های انتخاب رشته</strong>
          <em className="guidance-command-card__desc">
            خدمات تخصصی انتخاب رشته با نظارت مهندس رضا ابراهیمی
          </em>
          <span className="guidance-command-card__cta">
            {model.packagePaid ? "مشاهده بسته" : "فعال‌سازی بسته"}
            <PortalIcon name="clipboard" className="size-4" aria-hidden="true" />
          </span>
        </Link>
      </section>

      <section className="guidance-command-checks" aria-label="خلاصه پرونده">
        <h2>خلاصه پرونده</h2>
        <ul>
          <li className={model.intakeComplete ? "is-done" : undefined}>
            تصویر تحصیلی و مدارک {model.intakeComplete ? "· تکمیل" : "· ناقص"}
          </li>
          <li className={model.interestCompleted ? "is-done" : undefined}>
            آزمون رغبت {model.interestCompleted ? "· انجام شد" : "· باقی مانده"}
          </li>
          <li className={model.packagePaid ? "is-done" : undefined}>
            بسته مشاوره {model.packagePaid ? "· فعال" : "· فعال نشده"}
          </li>
          <li>
            گروه آزمایشی · {model.examGroupLabel}
          </li>
          <li>
            تکمیل مسیر · {toPersianDigits(pulse.completionPercentage)}٪
          </li>
        </ul>
      </section>
    </div>
  );
}
