import Link from "next/link";
import { ChamberPage } from "@/components/guidance/office/ChamberPage";
import { ChairMark } from "@/components/guidance/office/illustrations";
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
    <ChamberPage
      kicker="اتاق گفتگو"
      title={FIRST_SESSION_WHY.title}
      lead={FIRST_SESSION_WHY.lead}
      art={<ChairMark />}
      artCaption="صندلی چرم"
      action={
        <Link href={bookHref} className="chamber-go">
          رزرو جلسه تحلیل تخصصی
        </Link>
      }
    >
      <div className="chamber-desk">
        <dl>
          <div>
            <dt>مدت</dt>
            <dd>{FIRST_SESSION_DURATION}</dd>
          </div>
          <div>
            <dt>قالب</dt>
            <dd>{FIRST_SESSION_FORMATS.join(" / ")}</dd>
          </div>
        </dl>

        <section>
          <h2>در این جلسه چه می‌گذرد</h2>
          <ul>
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
          <ul>
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
      </div>
    </ChamberPage>
  );
}
