import Link from "next/link";
import { ChamberPage } from "@/components/guidance/office/ChamberPage";
import { LampMark } from "@/components/guidance/office/illustrations";
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
    <ChamberPage
      kicker="صندلی شما روی تقویم است"
      title={countdownLabel}
      lead="این اولین نشست استراتژیک پرونده انتخاب رشته شماست."
      art={<LampMark />}
      artCaption="چراغ میز"
      action={
        <a href={calendarHref} className="chamber-go">
          افزودن به تقویم
        </a>
      }
    >
      <div className="chamber-desk">
        <dl>
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
        {locationNote ? <p>{locationNote}</p> : null}

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
          <ul>
            {FIRST_SESSION_DOCUMENTS.map((item) => (
              <li key={item.label}>
                <strong>{item.label}</strong>
                <span>{item.hint}</span>
              </li>
            ))}
          </ul>
        </section>
        <div className="chamber-actions">
          <Link href={MAJOR_OFFICE_SESSION} className="chamber-quiet">
            آمادگی جلسه در دفتر
          </Link>
          <Link href={MAJOR_OFFICE_JOURNEY} className="chamber-quiet">
            فهرست دفتر
          </Link>
        </div>
      </div>
    </ChamberPage>
  );
}
