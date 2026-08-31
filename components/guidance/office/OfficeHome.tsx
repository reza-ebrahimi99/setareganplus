import Link from "next/link";
import { toPersianDigits } from "@/lib/persian";
import type { OfficeDashboardModel } from "@/lib/guidance/office/dashboard";
import {
  MAJOR_OFFICE_INTEREST,
  MAJOR_OFFICE_JOURNEY,
  MAJOR_OFFICE_SESSION,
} from "@/lib/guidance/office/nav";
import {
  MAJOR_OFFICE_GRADES,
  MAJOR_OFFICE_IDENTITY,
  MAJOR_OFFICE_TRANSCRIPT,
} from "@/lib/guidance/office/intake-href";
import { AtelierPress, AtelierReveal } from "@/components/guidance/office/AtelierMotion";

function firstName(full: string): string {
  const part = full.trim().split(/\s+/).filter(Boolean)[0];
  return part && part !== "داوطلب" ? part : full;
}

function ProgressRing({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  const r = 40;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - clamped / 100);
  return (
    <svg
      className="atelier-ring"
      viewBox="0 0 104 104"
      role="img"
      aria-label={`پیشرفت ${toPersianDigits(clamped)} درصد`}
    >
      <circle className="atelier-ring-track" cx="52" cy="52" r={r} />
      <circle
        className="atelier-ring-value"
        cx="52"
        cy="52"
        r={r}
        strokeDasharray={c}
        strokeDashoffset={offset}
      />
      <text x="52" y="57" textAnchor="middle">
        {toPersianDigits(clamped)}٪
      </text>
    </svg>
  );
}

export function OfficeHome({ model }: { model: OfficeDashboardModel }) {
  const { pulse } = model;
  const name = firstName(model.studentName);

  return (
    <div>
      <AtelierReveal>
        <header className="atelier-page__hero">
          <p className="atelier-kicker">دفتر خصوصی انتخاب رشته</p>
          <h1 className="atelier-title">سلام، {name}.</h1>
          <p className="atelier-lead">
            آینده‌تان اینجا مدیریت می‌شود — آرام، دقیق، و با نظارت مهندس رضا
            ابراهیمی. لازم نیست همه چیز را امروز تمام کنید.
          </p>
        </header>
      </AtelierReveal>

      <AtelierReveal delay={0.08}>
        <section className="atelier-now" data-kind={pulse.waitingKind} aria-live="polite">
          <div>
            <p className="atelier-kicker">{pulse.statusLabel}</p>
            <h2>{pulse.waitingTitle}</h2>
            <p>{pulse.waitingBody}</p>
            <Link href={model.todayTask.href} className="atelier-now__cta">
              {model.todayTask.label}
            </Link>
          </div>
          <ProgressRing value={pulse.completionPercentage} />
        </section>
      </AtelierReveal>

      <div className="atelier-duo">
        <AtelierReveal delay={0.14}>
          <AtelierPress>
            <section className="atelier-appoint">
              <p className="atelier-kicker">نوبت روی میز</p>
              {model.firstSession.booked ? (
                <>
                  <h2>{model.firstSession.countdownLabel || "گفتگوی شما ثبت شده"}</h2>
                  <p>
                    نخستین جلسه با {model.counselorName}. مدارک را آرام آماده کنید؛
                    عجله‌ای در کار نیست.
                  </p>
                  <Link href={MAJOR_OFFICE_SESSION}>ورود به اتاق جلسه</Link>
                </>
              ) : (
                <>
                  <h2>هنوز گفتگویی روی تقویم نیست</h2>
                  <p>
                    وقتی تصویر تحصیلی و نگاه اول به شخصیت کامل شد، صندلی مقابل
                    مهندس برای شما خالی می‌شود.
                  </p>
                  <Link href={MAJOR_OFFICE_SESSION}>آمادگی نخستین گفتگو</Link>
                </>
              )}
            </section>
          </AtelierPress>
        </AtelierReveal>

        <AtelierReveal delay={0.2}>
          <AtelierPress>
            <section className="atelier-letter">
              <p className="atelier-kicker">صدای مشاور</p>
              {model.latestCounselorActivity ? (
                <>
                  <h2>{model.latestCounselorActivity.title}</h2>
                  <p>{model.latestCounselorActivity.body}</p>
                </>
              ) : (
                <>
                  <h2>مهندس هنوز چیزی روی میز نگذاشته</h2>
                  <p>
                    وقتی مدرکی برسد یا مرحله‌ای بازبینی شود، نامهٔ دفتر همین‌جا
                    ظاهر می‌شود — {toPersianDigits(model.unreadMessages)} پیام
                    قابل مشاهده.
                  </p>
                </>
              )}
              <Link href={MAJOR_OFFICE_JOURNEY}>خواندن مسیر کامل</Link>
            </section>
          </AtelierPress>
        </AtelierReveal>
      </div>

      <nav className="atelier-rooms" aria-label="اتاق‌های زنده دفتر">
        <AtelierReveal delay={0.24}>
          <Link href={MAJOR_OFFICE_IDENTITY} className="atelier-room">
            <span>هویت</span>
            <strong>کی هستید</strong>
            <em>نام و جای شما در پرونده، قبل از هر انتخاب.</em>
          </Link>
        </AtelierReveal>
        <AtelierReveal delay={0.28}>
          <Link href={MAJOR_OFFICE_GRADES} className="atelier-room">
            <span>توانایی</span>
            <strong>شناخت توانایی‌های شما</strong>
            <em>هر نمره، یک قطعه از تصویر تحصیلی.</em>
          </Link>
        </AtelierReveal>
        <AtelierReveal delay={0.32}>
          <Link href={MAJOR_OFFICE_TRANSCRIPT} className="atelier-room">
            <span>سند</span>
            <strong>آخرین قطعه تصویر</strong>
            <em>کارنامه رسمی، برای تطبیق روی میز مشاور.</em>
          </Link>
        </AtelierReveal>
        <AtelierReveal delay={0.36}>
          <Link href={MAJOR_OFFICE_INTEREST} className="atelier-room">
            <span>شخصیت</span>
            <strong>نگاه اول به شخصیت</strong>
            <em>ترجیح‌ها، نه برچسب؛ تفسیر نهایی با مهندس است.</em>
          </Link>
        </AtelierReveal>
      </nav>

      <p className="atelier-whisper">
        {model.examGroupLabel}
        {model.packageLabel ? ` · بسته ${model.packageLabel}` : ""} · مسیر تا اینجا{" "}
        {toPersianDigits(pulse.completionPercentage)}٪ شکل گرفته است.
      </p>
    </div>
  );
}
