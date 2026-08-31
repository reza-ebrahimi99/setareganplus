import Link from "next/link";
import type { OfficeDashboardModel } from "@/lib/guidance/office/dashboard";
import { MAJOR_OFFICE_JOURNEY, MAJOR_OFFICE_SESSION } from "@/lib/guidance/office/nav";
import { ChamberReveal } from "@/components/guidance/office/ChamberMotion";
import { ChamberScene } from "@/components/guidance/office/ChamberScene";
import {
  ChairMark,
  LampMark,
} from "@/components/guidance/office/illustrations";

function firstName(full: string): string {
  const part = full.trim().split(/\s+/).filter(Boolean)[0];
  return part && part !== "داوطلب" ? part : full;
}

export function OfficeHome({ model }: { model: OfficeDashboardModel }) {
  const { pulse } = model;
  const name = firstName(model.studentName);

  return (
    <div>
      <ChamberReveal>
        <section className="chamber-open">
          <div>
            <p className="chamber-kicker">دفتر خصوصی</p>
            <h1 className="chamber-title">سلام، {name}.</h1>
            <p className="chamber-lead">
              اینجا دفتر مهندس رضا ابراهیمی است. آینده‌تان مدیریت می‌شود — نه
              پرونده‌ای که باید پر کنید. امشب فقط یک کار.
            </p>
            <Link href={model.todayTask.href} className="chamber-go">
              {model.todayTask.label}
            </Link>
          </div>
          <ChamberScene caption={pulse.waitingTitle}>
            {model.firstSession.booked ? <LampMark /> : <ChairMark />}
          </ChamberScene>
        </section>
      </ChamberReveal>

      <ChamberReveal delay={0.08}>
        <article className="chamber-letter">
          <Link href={MAJOR_OFFICE_JOURNEY}>
            <time>نامهٔ مشاور</time>
            {model.latestCounselorActivity ? (
              <>
                <h2>{model.latestCounselorActivity.title}</h2>
                <p>{model.latestCounselorActivity.body}</p>
              </>
            ) : (
              <>
                <h2>میز هنوز ساکت است.</h2>
                <p>
                  وقتی مدرکی برسد، همین صفحه طلا می‌گیرد. سکوت یعنی همه‌چیز سر
                  جایش است.
                </p>
              </>
            )}
            <footer>رضا ابراهیمی</footer>
          </Link>
        </article>
      </ChamberReveal>

      <ChamberReveal delay={0.12}>
        <Link href={MAJOR_OFFICE_SESSION} className="chamber-wait">
          <h2>
            {model.firstSession.booked
              ? model.firstSession.countdownLabel || "صندلی شما منتظر است"
              : "صندلی چرم خالی است"}
          </h2>
          <p>
            {model.firstSession.booked
              ? `نخستین گفتگو با ${model.counselorName}.`
              : "وقتی تصویر تحصیلی کامل شد، چراغ میز روشن می‌شود."}
          </p>
        </Link>
      </ChamberReveal>

      <ChamberReveal delay={0.16}>
        <Link href={MAJOR_OFFICE_JOURNEY} className="chamber-chapter">
          <p className="chamber-kicker">فصل جاری</p>
          <h2>{pulse.currentChapter}</h2>
          <p>{pulse.waitingTitle}</p>
        </Link>
      </ChamberReveal>
    </div>
  );
}
