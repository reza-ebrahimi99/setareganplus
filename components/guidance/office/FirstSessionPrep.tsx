import Link from "next/link";
import { ChamberScene } from "@/components/guidance/office/ChamberScene";
import { LampMark } from "@/components/guidance/office/illustrations";
import {
  FIRST_SESSION_BOOK_HREF,
  FIRST_SESSION_DOCUMENTS,
  FIRST_SESSION_DURATION,
  FIRST_SESSION_FORMATS,
  FIRST_SESSION_PARENTS,
  FIRST_SESSION_PREPARE,
  FIRST_SESSION_WHY,
} from "@/lib/guidance/office/first-session";

export function FirstSessionPrep({ bookHref = FIRST_SESSION_BOOK_HREF }: { bookHref?: string }) {
  return (
    <div className="office-session">
      <header className="chamber-hero">
        <div>
          <p className="chamber-kicker">نخستین گفتگو</p>
          <h1 className="chamber-title">{FIRST_SESSION_WHY.title}</h1>
          <p className="chamber-lead">{FIRST_SESSION_WHY.lead}</p>
        <dl className="office-session__meta">
          <div>
            <dt>مدت</dt>
            <dd>{FIRST_SESSION_DURATION}</dd>
          </div>
          <div>
            <dt>قالب</dt>
            <dd>{FIRST_SESSION_FORMATS.join(" / ")}</dd>
          </div>
        </dl>
        </div>
        <ChamberScene caption="صندلی در انتظار">
          <LampMark />
        </ChamberScene>
      </header>

      <section>
        <h2>در این جلسه چه می‌گذرد</h2>
        <ul className="office-session__list">
          {FIRST_SESSION_WHY.items.map((item) => (
            <li key={item.title}>
              <strong>{item.title}</strong>
              <span>{item.body}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>دانش‌آموز چه آماده کند</h2>
        <ul>
          {FIRST_SESSION_PREPARE.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2>مدارکی که بهتر است در دسترس باشد</h2>
        <ul className="office-session__docs">
          {FIRST_SESSION_DOCUMENTS.map((item) => (
            <li key={item.label}>
              <strong>{item.label}</strong>
              <span>{item.hint}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>خانواده باید بداند</h2>
        <ul>
          {FIRST_SESSION_PARENTS.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>

      <Link href={bookHref} className="chamber-go">
        رزرو جلسه تحلیل تخصصی
      </Link>
    </div>
  );
}
