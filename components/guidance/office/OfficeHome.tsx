import Link from "next/link";
import { toPersianDigits } from "@/lib/persian";
import type { OfficeDashboardModel } from "@/lib/guidance/office/dashboard";
import { MAJOR_OFFICE_JOURNEY, MAJOR_OFFICE_SESSION } from "@/lib/guidance/office/nav";
import { ChamberReveal } from "@/components/guidance/office/ChamberMotion";
import { ChamberScene } from "@/components/guidance/office/ChamberScene";
import {
  ChairMark,
  ConstellationMark,
  LampMark,
} from "@/components/guidance/office/illustrations";

function firstName(full: string): string {
  const part = full.trim().split(/\s+/).filter(Boolean)[0];
  return part && part !== "داوطلب" ? part : full;
}

function ProgressArc({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  const r = 46;
  const c = 2 * Math.PI * r;
  return (
    <svg
      className="chamber-orb"
      viewBox="0 0 108 108"
      role="img"
      aria-label={`پیشرفت ${toPersianDigits(clamped)} درصد`}
    >
      <circle className="chamber-orb__track" cx="54" cy="54" r={r} />
      <circle
        className="chamber-orb__value"
        cx="54"
        cy="54"
        r={r}
        strokeDasharray={c}
        strokeDashoffset={c * (1 - clamped / 100)}
      />
    </svg>
  );
}

export function OfficeHome({ model }: { model: OfficeDashboardModel }) {
  const { pulse } = model;
  const name = firstName(model.studentName);
  const nowLeft = `${Math.max(8, Math.min(88, pulse.completionPercentage))}%`;

  return (
    <div>
      <ChamberReveal>
        <section className="chamber-open">
          <div>
            <p className="chamber-kicker">دفتر خصوصی انتخاب رشته</p>
            <h1 className="chamber-title">سلام، {name}.</h1>
            <p className="chamber-lead">
              آینده‌تان اینجا مدیریت می‌شود. امشب فقط یک حرکت. بقیهٔ مسیر آرام
              روی میز مهندس رضا ابراهیمی می‌ماند.
            </p>
            <Link href={model.todayTask.href} className="chamber-go">
              {model.todayTask.label}
            </Link>
          </div>
          <div className="chamber-open__art">
            <ChamberScene caption={pulse.waitingTitle}>
              <ConstellationMark />
            </ChamberScene>
            <ProgressArc value={pulse.completionPercentage} />
          </div>
        </section>
      </ChamberReveal>

      <div className="chamber-folio">
        <ChamberReveal delay={0.12}>
          <article className="chamber-letter">
            <Link href={MAJOR_OFFICE_JOURNEY}>
              <time>از میز مشاور</time>
              {model.latestCounselorActivity ? (
                <>
                  <h2>{model.latestCounselorActivity.title}</h2>
                  <p>{model.latestCounselorActivity.body}</p>
                </>
              ) : (
                <>
                  <h2>هنوز نامه‌ای نرسیده.</h2>
                  <p>
                    سکوت دفتر یعنی پرونده سر جایش است. وقتی مدرکی به میز مهندس
                    برسد، همین کاغذ طلا می‌گیرد.
                  </p>
                </>
              )}
              <footer>رضا ابراهیمی</footer>
            </Link>
          </article>
        </ChamberReveal>

        <ChamberReveal delay={0.2}>
          <article className="chamber-wait">
            <Link href={MAJOR_OFFICE_SESSION}>
              {model.firstSession.booked ? <LampMark /> : <ChairMark />}
              <h2>
                {model.firstSession.booked
                  ? model.firstSession.countdownLabel || "صندلی شما رزرو است"
                  : "صندلی چرم هنوز خالی است"}
              </h2>
              <p>
                {model.firstSession.booked
                  ? `نخستین گفتگو با ${model.counselorName}.`
                  : "وقتی تصویر تحصیلی کامل شد، این صندلی برای شما روشن می‌شود."}
              </p>
            </Link>
          </article>
        </ChamberReveal>
      </div>

      <ChamberReveal delay={0.28}>
        <Link href={MAJOR_OFFICE_JOURNEY} className="chamber-spine">
          <div className="chamber-spine__meta">
            <span>{pulse.currentChapter}</span>
            <span>{toPersianDigits(pulse.completionPercentage)}٪ شکل گرفته</span>
          </div>
          <div className="chamber-spine__line">
            <i className="chamber-spine__now" style={{ insetInlineStart: nowLeft }} />
          </div>
        </Link>
      </ChamberReveal>
    </div>
  );
}
