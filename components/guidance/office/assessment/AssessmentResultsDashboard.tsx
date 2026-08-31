import { ChamberScene } from "@/components/guidance/office/ChamberScene";
import { CompassMark } from "@/components/guidance/office/illustrations";
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
      <div className="chamber-analysis">
        <p className="chamber-kicker office-assess-print-hide">برگ تحلیل</p>
        <div className="office-assess-print-hide">
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
    <div className="chamber-analysis">
      <header className="chamber-hero">
        <div>
          <p className="chamber-kicker">برگ تحلیل</p>
          <h1 className="chamber-title">{model.result.personality.title}</h1>
          <p className="chamber-lead">{model.result.personality.description}</p>
        </div>
        <ChamberScene caption="نقشه ترجیح">
          <CompassMark />
        </ChamberScene>
      </header>

      <section>
        <h2>نمودار ابعاد</h2>
        <AssessmentRadar scores={model.result.categoryScores} />
      </section>

      <section>
        <h2>قوی‌ترین الگوها</h2>
        <ul className="chamber-analysis__traits">
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
        <ul className="chamber-analysis__traits">
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

      <AssessmentTopMatches matches={matches} confidence={model.confidence} />

      <section>
        <h2>گروه‌هایی که باید با احتیاط دیده شوند</h2>
        <ul className="chamber-analysis__traits">
          {model.cautionMajors.map((major) => (
            <li key={major.clusterId}>
              <p>
                <strong>{major.title}</strong>
                <span>{toPersianDigits(major.fitScore)}</span>
              </p>
              <span>{major.cautionNote}</span>
            </li>
          ))}
        </ul>
      </section>

      <aside role="note">
        {model.disclaimer.split("\n").map((line) => (
          <p key={line}>{line}</p>
        ))}
      </aside>
    </div>
  );
}
