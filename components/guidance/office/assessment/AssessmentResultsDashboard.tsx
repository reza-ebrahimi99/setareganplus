import Link from "next/link";
import { AssessmentRadar } from "@/components/guidance/office/assessment/AssessmentRadar";
import { toPersianDigits } from "@/lib/persian";
import type { AssessmentDashboardModel } from "@/lib/guidance/journey/assessment/scoring";

export function AssessmentResultsDashboard({
  model,
}: {
  model: AssessmentDashboardModel;
}) {
  const { result, confidence } = model;
  const width = Math.max(6, Math.min(100, confidence.percent));

  return (
    <div className="office-assess-results">
      <header className="office-assess-results__hero">
        <p>خروجی آزمون رغبت</p>
        <h1>{result.personality.title}</h1>
        <p className="office-assess-results__lead">{result.personality.description}</p>
      </header>

      <section className="office-assess-results__panel">
        <h2>نمودار ابعاد</h2>
        <AssessmentRadar scores={result.categoryScores} />
      </section>

      <div className="office-assess-results__grid">
        <section>
          <h2>قوی‌ترین الگوها</h2>
          <ul className="office-assess-results__traits">
            {model.strongest.map((item) => (
              <li key={item.categoryId}>
                <p>
                  <strong>{item.title}</strong>
                  <span>{toPersianDigits(item.score)}</span>
                </p>
                <em>{item.label}</em>
                <span>{item.explanation}</span>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2>الگوهای ضعیف‌تر در این آزمون</h2>
          <ul className="office-assess-results__traits is-low">
            {model.weaker.map((item) => (
              <li key={item.categoryId}>
                <p>
                  <strong>{item.title}</strong>
                  <span>{toPersianDigits(item.score)}</span>
                </p>
                <em>{item.label}</em>
                <span>{item.explanation}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="office-assess-results__panel">
        <h2>دسته‌های علاقه‌ی پررنگ</h2>
        <ul className="office-assess-results__pills">
          {model.topInterestCategories.map((item) => (
            <li key={item.categoryId}>
              {item.title}
              <em>{toPersianDigits(item.score)}</em>
            </li>
          ))}
        </ul>
      </section>

      <div className="office-assess-results__grid">
        <section>
          <h2>گروه‌های رشته پیشنهادی</h2>
          <ul className="office-assess-results__majors is-up">
            {model.suggestedMajors.map((major) => (
              <li key={major.clusterId}>
                <strong>{major.title}</strong>
                <span>هم‌خوانی پاسخ: {toPersianDigits(major.fitScore)}</span>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2>رشته‌هایی که باید با احتیاط دید</h2>
          <ul className="office-assess-results__majors is-caution">
            {model.cautionMajors.map((major) => (
              <li key={major.clusterId}>
                <strong>{major.title}</strong>
                <span>هم‌خوانی پاسخ: {toPersianDigits(major.fitScore)}</span>
                <p>{major.cautionNote}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="office-assess-results__cards">
        {model.explanations.map((card) => (
          <article key={card.id}>
            <h2>{card.title}</h2>
            <p>{card.body}</p>
          </article>
        ))}
      </section>

      <section className="office-assess-results__panel">
        <h2>بازخورد شخصی از همین آزمون</h2>
        <p>{model.feedback}</p>
      </section>

      <section className="office-assess-results__confidence">
        <h2>شاخص تمایز پاسخ‌ها</h2>
        <p className="office-assess-results__conf-label">
          {confidence.label} · {toPersianDigits(confidence.percent)}
        </p>
        <div
          className="office-assess__bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={confidence.percent}
        >
          <span style={{ width: `${width}%` }} />
        </div>
        <p>{confidence.explanation}</p>
      </section>

      <aside className="office-assess-results__disclaimer" role="note">
        {model.disclaimer.split("\n").map((line) => (
          <p key={line}>{line}</p>
        ))}
      </aside>

      <Link href={model.ctaHref} className="office-assess-results__cta">
        {model.ctaLabel}
      </Link>
    </div>
  );
}
