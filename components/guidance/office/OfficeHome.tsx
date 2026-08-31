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

function ProgressRing({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  const r = 34;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - clamped / 100);
  return (
    <svg
      className="office-dash__ring"
      viewBox="0 0 88 88"
      role="img"
      aria-label={`پیشرفت ${toPersianDigits(clamped)} درصد`}
    >
      <circle className="office-dash__ring-track" cx="44" cy="44" r={r} />
      <circle
        className="office-dash__ring-value"
        cx="44"
        cy="44"
        r={r}
        strokeDasharray={c}
        strokeDashoffset={offset}
      />
      <text x="44" y="48" textAnchor="middle">
        {toPersianDigits(clamped)}٪
      </text>
    </svg>
  );
}

export function OfficeHome({ model }: { model: OfficeDashboardModel }) {
  const { pulse } = model;
  const width = Math.max(4, Math.min(100, pulse.completionPercentage));

  return (
    <div className="office-dash" dir="rtl">
      <header className="office-dash__welcome">
        <p>دپارتمان انتخاب رشته قلم‌چی نسیم‌شهر</p>
        <h1>{model.studentName}</h1>
        <p className="office-dash__meta">
          {model.examGroupLabel}
          {model.packageLabel ? ` · بسته ${model.packageLabel}` : ""}
          {" · مشاور: "}
          {model.counselorName}
        </p>
      </header>

      <div className="office-dash__grid">
        <section className="office-dash__hero" data-kind={pulse.waitingKind}>
          <div>
            <p className="office-dash__kicker">{pulse.statusLabel}</p>
            <h2>{pulse.waitingTitle}</h2>
            <p>{pulse.waitingBody}</p>
            <p className="office-dash__chapter">فصل جاری: {pulse.currentChapter}</p>
          </div>
          <ProgressRing value={pulse.completionPercentage} />
        </section>

        <section className="office-dash__card office-dash__task">
          <p className="office-dash__kicker">کار امروز</p>
          <h2>{model.todayTask.title}</h2>
          <p>{model.todayTask.body}</p>
          <Link href={model.todayTask.href}>{model.todayTask.label}</Link>
        </section>

        <section className="office-dash__card">
          <p className="office-dash__kicker">نوبت پیش رو</p>
          {model.firstSession.booked ? (
            <>
              <h2>{model.firstSession.countdownLabel || "نوبت ثبت شده"}</h2>
              <p>جلسه اول با {model.counselorName}</p>
              <Link href={MAJOR_OFFICE_SESSION}>آمادگی جلسه</Link>
            </>
          ) : (
            <>
              <h2>هنوز جلسه‌ای رزرو نشده</h2>
              <p>بعد از آزمون رغبت، اولین جلسه مشاوره را رزرو کنید.</p>
              <Link href={MAJOR_OFFICE_SESSION}>رزرو جلسه اول</Link>
            </>
          )}
        </section>

        <section className="office-dash__card">
          <p className="office-dash__kicker">پیام‌های مشاور</p>
          <h2>{toPersianDigits(model.unreadMessages)} پیام قابل مشاهده</h2>
          {model.latestCounselorActivity ? (
            <p>{model.latestCounselorActivity.body}</p>
          ) : (
            <p>پیام جدیدی از دفتر ثبت نشده است.</p>
          )}
          <Link href={MAJOR_OFFICE_JOURNEY}>نقشه مسیر</Link>
        </section>

        <section className="office-dash__card">
          <p className="office-dash__kicker">آخرین فعالیت مشاور</p>
          {model.latestCounselorActivity ? (
            <>
              <h2>{model.latestCounselorActivity.title}</h2>
              <p>{model.latestCounselorActivity.body}</p>
            </>
          ) : (
            <>
              <h2>منتظر اقدام شما</h2>
              <p>وقتی مدرک یا مرحله‌ای به میز مهندس برسد، وضعیت اینجا به‌روز می‌شود.</p>
            </>
          )}
        </section>

        <section className="office-dash__card office-dash__journey">
          <p className="office-dash__kicker">پیشرفت مسیر</p>
          <h2>تکمیل پرونده {toPersianDigits(pulse.completionPercentage)}٪</h2>
          <div
            className="office-dash__bar"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pulse.completionPercentage}
          >
            <span style={{ width: `${width}%` }} />
          </div>
          <p>شناسنامه تا اینجا {toPersianDigits(model.intakePercent)}٪ کامل است.</p>
          <Link href={MAJOR_OFFICE_JOURNEY}>مشاهده نقشه کامل</Link>
        </section>
      </div>

      <nav className="office-dash__actions" aria-label="اقدام سریع">
        <Link href={MAJOR_OFFICE_IDENTITY}>هویت</Link>
        <Link href={MAJOR_OFFICE_GRADES}>نمرات نهایی</Link>
        <Link href={MAJOR_OFFICE_TRANSCRIPT}>کارنامه PDF</Link>
        <Link href={MAJOR_OFFICE_INTEREST}>آزمون رغبت</Link>
        <Link href={MAJOR_OFFICE_SESSION}>جلسه اول</Link>
        <Link href={MAJOR_OFFICE_JOURNEY}>نقشه مسیر</Link>
      </nav>
    </div>
  );
}
