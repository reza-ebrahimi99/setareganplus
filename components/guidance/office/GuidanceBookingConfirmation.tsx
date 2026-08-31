import Link from "next/link";
import { MAJOR_OFFICE_JOURNEY, MAJOR_OFFICE_SESSION } from "@/lib/guidance/office/nav";
import {
  FIRST_SESSION_DOCUMENTS,
  FIRST_SESSION_DURATION,
  FIRST_SESSION_PREPARE,
} from "@/lib/guidance/office/first-session";
import { toPersianDigits } from "@/lib/persian";

export function GuidanceBookingConfirmation({
  trackingCode,
  counselorName,
  whenLabel,
  meetingLabel,
  branchName,
  locationNote,
  countdownLabel,
  calendarHref,
}: {
  trackingCode: string;
  counselorName: string;
  whenLabel: string;
  meetingLabel: string;
  branchName: string | null;
  locationNote: string | null;
  countdownLabel: string;
  calendarHref: string;
}) {
  return (
    <article className="office-session office-session--confirm">
      <header className="office-session__hero">
        <p>جلسه اول رزرو شد</p>
        <h1>{countdownLabel}</h1>
        <p>این اولین نشست استراتژیک پرونده انتخاب رشته شماست.</p>
      </header>
      <dl className="office-session__meta">
        <div>
          <dt>مشاور</dt>
          <dd>{counselorName}</dd>
        </div>
        <div>
          <dt>زمان</dt>
          <dd>{whenLabel}</dd>
        </div>
        <div>
          <dt>قالب</dt>
          <dd>{meetingLabel}</dd>
        </div>
        <div>
          <dt>مدت</dt>
          <dd>{FIRST_SESSION_DURATION}</dd>
        </div>
        {branchName ? (
          <div>
            <dt>شعبه</dt>
            <dd>{branchName}</dd>
          </div>
        ) : null}
        <div>
          <dt>کد پیگیری</dt>
          <dd>{toPersianDigits(trackingCode)}</dd>
        </div>
      </dl>
      {locationNote ? <p className="office-session__note">{locationNote}</p> : null}

      <section>
        <h2>چک‌لیست آمادگی</h2>
        <ul>
          {FIRST_SESSION_PREPARE.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>
      <section>
        <h2>مدارک</h2>
        <ul className="office-session__docs">
          {FIRST_SESSION_DOCUMENTS.map((item) => (
            <li key={item.label}>
              <strong>{item.label}</strong>
              <span>{item.hint}</span>
            </li>
          ))}
        </ul>
      </section>
      <p>
        گام بعد در نقشه مسیر، ادامه پرونده پس از جلسه است — نه بستن فهرست در همین
        نوبت.
      </p>
      <div className="office-session__actions">
        <a href={calendarHref} className="office-session__cta">
          افزودن به تقویم
        </a>
        <Link href={MAJOR_OFFICE_SESSION} className="office-session__ghost">
          آمادگی جلسه در دفتر
        </Link>
        <Link href={MAJOR_OFFICE_JOURNEY} className="office-session__ghost">
          ادامه نقشه مسیر
        </Link>
      </div>
    </article>
  );
}
