/**
 * Journey Step 2 results — same dashboard as the office lead-gen assessment.
 */

import { AssessmentResultsDashboard } from "@/components/guidance/office/assessment/AssessmentResultsDashboard";
import {
  buildAssessmentDashboard,
  type AssessmentAnswers,
  type AssessmentResult,
} from "@/lib/guidance/journey/assessment/scoring";

export function GuidanceInterestResultsView({
  result,
  answers,
}: {
  result: AssessmentResult;
  answers?: AssessmentAnswers;
}) {
  const model = buildAssessmentDashboard(answers ?? {}, result);
  return <AssessmentResultsDashboard model={model} />;
}
