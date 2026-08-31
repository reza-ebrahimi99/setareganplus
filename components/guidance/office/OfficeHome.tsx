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
import { AtelierScene } from "@/components/guidance/office/AtelierScene";
import {
  ChairMark,
  CompassMark,
  ConstellationMark,
  EnvelopeMark,
  LampMark,
  PortraitMark,
  ScoresMark,
  SealMark,
} from "@/components/guidance/office/illustrations";

function firstName(full: string): string {
  const part = full.trim().split(/\s+/).filter(Boolean)[0];
  return part && part !== "داوطلب" ? part : full;
}

function ProgressOrb({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  const r = 52;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - clamped / 100);
  return (
    <svg
      className="atelier-orb"
      viewBox="0 0 140 140"
      role="img"
      aria-label={`پیشرفت ${toPersianDigits(clamped)} درصد`}
    >
      <defs>
        <filter id="atelier-orb-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle className="atelier-orb__track" cx="70" cy="70" r={r} />
      <circle
        className="atelier-orb__value"
        cx="70"
        cy="70"
        r={r}
        strokeDasharray={c}
        strokeDashoffset={offset}
        filter="url(#atelier-orb-glow)"
      />
      <text x="70" y="66" textAnchor="middle">
        {toPersianDigits(clamped)}٪
      </text>
      <text className="atelier-orb__caption" x="70" y="86" textAnchor="middle">
        مسیر
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
        <header className="atelier-hero atelier-hero--flagship">
          <div className="atelier-hero__copy">
            <p className="atelier-kicker">دفتر خصوصی انتخاب رشته</p>
            <h1 className="atelier-title">سلام، {name}.</h1>
            <p className="atelier-lead">
              آینده‌تان اینجا مدیریت می‌شود — آرام، دقیق، با نظارت مهندس رضا
              ابراهیمی. امروز فقط یک حرکت لازم است.
            </p>
            <Link href={model.todayTask.href} className="atelier-now__cta">
              {model.todayTask.label}
            </Link>
          </div>
          <div className="atelier-hero__focus">
            <AtelierScene caption={pulse.currentChapter}>
              <ConstellationMark />
            </AtelierScene>
            <div className="atelier-hero__orb">
              <ProgressOrb value={pulse.completionPercentage} />
            </div>
          </div>
        </header>
      </AtelierReveal>

      <AtelierReveal delay={0.1}>
        <section className="atelier-glass atelier-now" data-kind={pulse.waitingKind} aria-live="polite">
          <div>
            <p className="atelier-kicker">{pulse.statusLabel}</p>
            <h2>{pulse.waitingTitle}</h2>
            <p>{pulse.waitingBody}</p>
          </div>
          <p className="atelier-now-line">
            <span>حالا</span>
            {model.todayTask.title}
          </p>
        </section>
      </AtelierReveal>

      <div className="atelier-duo">
        <AtelierReveal delay={0.16}>
          <AtelierPress>
            <section className="atelier-glass atelier-appoint">
              <AtelierScene>
                {model.firstSession.booked ? <LampMark /> : <ChairMark />}
              </AtelierScene>
              <p className="atelier-kicker">نوبت روی میز</p>
              {model.firstSession.booked ? (
                <>
                  <h2>{model.firstSession.countdownLabel || "گفتگوی شما ثبت شده"}</h2>
                  <p>
                    نخستین جلسه با {model.counselorName}. چراغ میز روشن است؛ مدارک
                    را آرام آماده کنید.
                  </p>
                  <Link href={MAJOR_OFFICE_SESSION}>ورود به اتاق جلسه</Link>
                </>
              ) : (
                <>
                  <h2>صندلی هنوز خالی است</h2>
                  <p>
                    وقتی تصویر تحصیلی و نگاه اول کامل شد، این صندلی برای گفتگو با
                    مهندس منتظر شماست.
                  </p>
                  <Link href={MAJOR_OFFICE_SESSION}>آمادگی نخستین گفتگو</Link>
                </>
              )}
            </section>
          </AtelierPress>
        </AtelierReveal>

        <AtelierReveal delay={0.22}>
          <AtelierPress>
            <section className="atelier-glass atelier-letter">
              <AtelierScene>
                <EnvelopeMark />
              </AtelierScene>
              <p className="atelier-kicker">صدای مشاور</p>
              {model.latestCounselorActivity ? (
                <>
                  <h2>{model.latestCounselorActivity.title}</h2>
                  <p>{model.latestCounselorActivity.body}</p>
                </>
              ) : (
                <>
                  <h2>نامهٔ دفتر هنوز نرسیده</h2>
                  <p>
                    وقتی مدرکی به میز مهندس برسد، مهر طلایی همین‌جا ظاهر می‌شود.
                    {model.unreadMessages
                      ? ` ${toPersianDigits(model.unreadMessages)} پیام قابل مشاهده.`
                      : " سکوت الان یعنی همه‌چیز سر جایش است."}
                  </p>
                </>
              )}
              <Link href={MAJOR_OFFICE_JOURNEY}>خواندن مسیر کامل</Link>
            </section>
          </AtelierPress>
        </AtelierReveal>
      </div>

      <AtelierReveal delay={0.28}>
        <nav className="atelier-ribbon" aria-label="چهار اتاق زنده">
          <Link href={MAJOR_OFFICE_IDENTITY} className="atelier-ribbon__node">
            <PortraitMark />
            <span>هویت</span>
            <strong>کی هستید</strong>
          </Link>
          <Link href={MAJOR_OFFICE_GRADES} className="atelier-ribbon__node">
            <ScoresMark />
            <span>توانایی</span>
            <strong>شناخت توانایی‌ها</strong>
          </Link>
          <Link href={MAJOR_OFFICE_TRANSCRIPT} className="atelier-ribbon__node">
            <SealMark />
            <span>سند</span>
            <strong>آخرین قطعه</strong>
          </Link>
          <Link href={MAJOR_OFFICE_INTEREST} className="atelier-ribbon__node">
            <CompassMark />
            <span>شخصیت</span>
            <strong>نگاه اول</strong>
          </Link>
        </nav>
      </AtelierReveal>

      <p className="atelier-whisper">
        {model.examGroupLabel}
        {model.packageLabel ? ` · بسته ${model.packageLabel}` : ""} · مسیر تا اینجا{" "}
        {toPersianDigits(pulse.completionPercentage)}٪ شکل گرفته است.
      </p>
    </div>
  );
}
