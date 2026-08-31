import Link from "next/link";
import { ChamberPage } from "@/components/guidance/office/ChamberPage";
import { LampMark } from "@/components/guidance/office/illustrations";
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
    <ChamberPage
      kicker="چراغ میز روشن است"
      title={countdownLabel}
      lead={`${whenLabel} · ${meetingLabel} · مشاور: ${counselorName}`}
      now={`کد پیگیری: ${toPersianDigits(trackingCode)}`}
      art={<LampMark />}
      artCaption="چراغ میز"
      action={
        <a href={calendarHref} className="chamber-go">
          افزودن به تقویم
        </a>
      }
    >
      <div className="chamber-desk">
        <section>
          <h2>چک‌لیست آمادگی</h2>
          <ul>
            {FIRST_SESSION_DOCUMENTS.map((item) => (
              <li key={item.label}>
                <strong>{item.label}</strong>
                <span>{item.hint}</span>
              </li>
            ))}
          </ul>
          <p>مدت جلسه {FIRST_SESSION_DURATION} است.</p>
        </section>
        <div className="chamber-actions">
          <Link href={confirmationHref} className="chamber-quiet">
            رسید رزرو
          </Link>
          <Link href={MAJOR_OFFICE_JOURNEY} className="chamber-quiet">
            فهرست دفتر
          </Link>
        </div>
      </div>
    </ChamberPage>
  );
}
