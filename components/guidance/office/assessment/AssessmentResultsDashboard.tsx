import { AssessmentConsultationCard } from "@/components/guidance/office/assessment/AssessmentConsultationCard";
import { AssessmentPrintButton } from "@/components/guidance/office/assessment/AssessmentPrintButton";
import { AssessmentPrintReport } from "@/components/guidance/office/assessment/AssessmentPrintReport";
import { AssessmentRadar } from "@/components/guidance/office/assessment/AssessmentRadar";
import { AssessmentTopMatches } from "@/components/guidance/office/assessment/AssessmentTopMatches";
import { toPersianDigits } from "@/lib/persian";
import type { AssessmentDashboardModel } from "@/lib/guidance/journey/assessment/scoring";
import {
  buildTopMajorMatches,
  type InterestResultsView,
} from "@/lib/guidance/office/interest-report";

export function AssessmentResultsDashboard({
  model,
  view,
}: {
  model: AssessmentDashboardModel;
  view?: InterestResultsView;
}) {
  if (view) {
    return (
      <div className="office-assess-results">
        <div className="office-assess-print-hide office-report__toolbar">
          <p>گزارش قابل چاپ برای خانواده آماده است.</p>
          <AssessmentPrintButton />
        </div>
        <AssessmentPrintReport view={view} />
        <AssessmentTopMatches
          matches={view.topMatches}
          confidence={view.dashboard.confidence}
        />
        <AssessmentConsultationCard />
      </div>
    );
  }

  const matches = buildTopMajorMatches(model.suggestedMajors, 3);
  return (
    <div className="office-assess-results">
      <header className="office-assess-results__hero">
        <p>خروجی آزمون رغبت</p>
        <h1>{model.result.personality.title}</h1>
        <p className="office-assess-results__lead">{model.result.personality.description}</p>
      </header>

      <section className="office-assess-results__panel">
        <h2>نمودار ابعاد</h2>
        <AssessmentRadar scores={model.result.categoryScores} />
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

      <AssessmentTopMatches matches={matches} confidence={model.confidence} />

      <section className="office-assess-results__panel">
        <h2>گروه‌هایی که باید با احتیاط دیده شوند</h2>
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

      <aside className="office-assess-results__disclaimer" role="note">
        {model.disclaimer.split("\n").map((line) => (
          <p key={line}>{line}</p>
        ))}
      </aside>
    </div>
  );
}
