import Link from "next/link";
import { MAJOR_OFFICE_JOURNEY } from "@/lib/guidance/office/nav";
import {
  FIRST_SESSION_DOCUMENTS,
  FIRST_SESSION_DURATION,
} from "@/lib/guidance/office/first-session";
import { toPersianDigits } from "@/lib/persian";

export function FirstSessionBooked({
  counselorName,
  whenLabel,
  meetingLabel,
  trackingCode,
  countdownLabel,
  confirmationHref,
  calendarHref,
}: {
  counselorName: string;
  whenLabel: string;
  meetingLabel: string;
  trackingCode: string;
  countdownLabel: string;
  confirmationHref: string;
  calendarHref: string;
}) {
  return (
    <div className="office-session">
      <header className="office-session__hero">
        <p>صندلی شما روی تقویم است</p>
        <h1>{countdownLabel}</h1>
        <p>
          {whenLabel} · {meetingLabel} · مشاور: {counselorName}
        </p>
        <p className="office-session__code">
          کد پیگیری: {toPersianDigits(trackingCode)}
        </p>
      </header>
      <section>
        <h2>چک‌لیست آمادگی</h2>
        <ul className="office-session__docs">
          {FIRST_SESSION_DOCUMENTS.map((item) => (
            <li key={item.label}>
              <strong>{item.label}</strong>
              <span>{item.hint}</span>
            </li>
          ))}
        </ul>
        <p>مدت جلسه {FIRST_SESSION_DURATION} است.</p>
      </section>
      <div className="office-session__actions">
        <a href={calendarHref} className="office-session__cta">
          افزودن به تقویم
        </a>
        <Link href={confirmationHref} className="office-session__ghost">
          رسید رزرو
        </Link>
        <Link href={MAJOR_OFFICE_JOURNEY} className="office-session__ghost">
          ادامه نقشه مسیر
        </Link>
      </div>
    </div>
  );
}
