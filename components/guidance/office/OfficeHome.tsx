import Link from "next/link";
import { toPersianDigits } from "@/lib/persian";
import type { OfficeDashboardModel } from "@/lib/guidance/office/dashboard";
import { MAJOR_OFFICE_INTEREST, MAJOR_OFFICE_JOURNEY } from "@/lib/guidance/office/nav";

export function OfficeHome({ model }: { model: OfficeDashboardModel }) {
  const { pulse } = model;
  const width = Math.max(4, Math.min(100, pulse.completionPercentage));

  return (
    <div className="major-office__home">
      <header className="major-office__welcome">
        <p>دپارتمان انتخاب رشته قلم‌چی نسیم‌شهر</p>
        <h1>{model.studentName}</h1>
        <p className="major-office__meta">
          {model.examGroupLabel}
          {model.packageLabel ? ` · بسته ${model.packageLabel}` : ""}
          {" · مشاور: "}
          {model.counselorName}
        </p>
      </header>

      <section
        className="major-office__wait"
        data-kind={pulse.waitingKind}
        aria-live="polite"
      >
        <p className="major-office__wait-kicker">{pulse.statusLabel}</p>
        <h2>{pulse.waitingTitle}</h2>
        <p>{pulse.waitingBody}</p>
      </section>

      <section className="major-office__progress" aria-label="پیشرفت پرونده">
        <div className="major-office__progress-row">
          <span>تکمیل پرونده</span>
          <strong>{toPersianDigits(pulse.completionPercentage)}٪</strong>
        </div>
        <div
          className="major-office__bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pulse.completionPercentage}
        >
          <span style={{ width: `${width}%` }} />
        </div>
        <p className="major-office__chapter">فصل جاری: {pulse.currentChapter}</p>
      </section>

      <p className="major-office__note">{model.departmentNote}</p>

      <div className="major-office__cta-row">
        <Link href={MAJOR_OFFICE_JOURNEY} className="major-office__journey-cta">
          نقشه کامل مسیر مشاوره
        </Link>
        <Link href={MAJOR_OFFICE_INTEREST} className="major-office__journey-cta is-gold">
          آزمون رغبت رایگان
        </Link>
      </div>
    </div>
  );
}
