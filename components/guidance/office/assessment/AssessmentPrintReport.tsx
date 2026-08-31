import { AssessmentRadar } from "@/components/guidance/office/assessment/AssessmentRadar";
import { toPersianDigits } from "@/lib/persian";
import type { InterestResultsView } from "@/lib/guidance/office/interest-report";

export function AssessmentPrintReport({ view }: { view: InterestResultsView }) {
  const { dashboard, identity, qrDataUrl } = view;

  return (
    <article className="office-report" aria-label="گزارش آزمون رغبت">
      <header className="office-report__letterhead">
        <div>
          <p className="office-report__brand">{identity.institute}</p>
          <p>{identity.partner}</p>
          <p>{identity.department}</p>
          <p>مشاور مسئول: {identity.counselorName}</p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrDataUrl}
          alt={`کد QR گزارش ${identity.reportId}`}
          width={96}
          height={96}
        />
      </header>

      <h1>گزارش آزمون رغبت</h1>
      <p className="office-report__meta">
        شناسه گزارش: {toPersianDigits(identity.reportId)} · تاریخ آزمون:{" "}
        {identity.assessmentDateLabel}
      </p>

      <table className="office-report__table">
        <tbody>
          <tr>
            <th>دانش‌آموز</th>
            <td>{identity.studentName}</td>
          </tr>
          <tr>
            <th>گروه آزمایشی</th>
            <td>{identity.examGroupLabel}</td>
          </tr>
          <tr>
            <th>تاریخ آزمون</th>
            <td>{identity.assessmentDateLabel}</td>
          </tr>
          <tr>
            <th>شناسه گزارش</th>
            <td>{toPersianDigits(identity.reportId)}</td>
          </tr>
          <tr>
            <th>پرونده</th>
            <td>{identity.planPublicId}</td>
          </tr>
          <tr>
            <th>مشاور مسئول</th>
            <td>{identity.counselorName}</td>
          </tr>
        </tbody>
      </table>

      <section className="office-report__block">
        <h2>نمودار ابعاد همین آزمون</h2>
        <AssessmentRadar scores={dashboard.result.categoryScores} />
      </section>

      <div className="office-report__split">
        <section>
          <h2>قوی‌ترین الگوها</h2>
          <ul>
            {dashboard.strongest.map((item) => (
              <li key={item.categoryId}>
                <strong>
                  {item.title} · {toPersianDigits(item.score)}
                </strong>
                <span>
                  {item.label} — {item.explanation}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2>الگوهای ضعیف‌تر در این آزمون</h2>
          <ul>
            {dashboard.weaker.map((item) => (
              <li key={item.categoryId}>
                <strong>
                  {item.title} · {toPersianDigits(item.score)}
                </strong>
                <span>
                  {item.label} — {item.explanation}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="office-report__block">
        <h2>گروه‌های دانشگاهی با بیشترین هم‌خوانی پاسخ</h2>
        <p className="office-report__note">
          این فهرست توصیه قطعی نیست؛ فقط هم‌خوانی وزن‌دار پاسخ‌های همین پرسشنامه است.
        </p>
        <ul>
          {dashboard.suggestedMajors.map((major) => (
            <li key={major.clusterId}>
              {major.title} — هم‌خوانی پاسخ: {toPersianDigits(major.fitScore)}
            </li>
          ))}
        </ul>
      </section>

      <section className="office-report__block">
        <h2>گروه‌هایی که باید با احتیاط دیده شوند</h2>
        <ul>
          {dashboard.cautionMajors.map((major) => (
            <li key={major.clusterId}>
              <strong>
                {major.title} · {toPersianDigits(major.fitScore)}
              </strong>
              <span>{major.cautionNote}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="office-report__block">
        <h2>توضیح روش</h2>
        {dashboard.explanations.map((card) => (
          <p key={card.id}>
            <strong>{card.title}. </strong>
            {card.body}
          </p>
        ))}
        <p>{dashboard.feedback}</p>
      </section>

      <aside className="office-report__disclaimer" role="note">
        {dashboard.disclaimer.split("\n").map((line) => (
          <p key={line}>{line}</p>
        ))}
      </aside>

      <footer className="office-report__footer">
        <p>
          {identity.institute} · {identity.partner} · {identity.counselorName}
        </p>
        <p>
          شناسه گزارش: {toPersianDigits(identity.reportId)} · راستی‌آزمایی با QR همین صفحه
        </p>
      </footer>
    </article>
  );
}
