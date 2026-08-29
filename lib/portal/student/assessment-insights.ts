/**
 * Assessment Center — presentation insights from existing result DTOs only.
 */

import type { PortalAssessmentResultDto } from "@/lib/portal/student/assessments";

export type AssessmentSubjectInsight = {
  name: string;
  percentage: number;
};

export type AssessmentCenterInsights = {
  count: number;
  latest: PortalAssessmentResultDto | null;
  averageScore: number | null;
  trend: Array<{
    id: string;
    title: string;
    score: number | null;
    date: Date | null;
  }>;
  bestSubject: AssessmentSubjectInsight | null;
  needsImprovement: AssessmentSubjectInsight | null;
  subjectCards: AssessmentSubjectInsight[];
};

export function buildAssessmentCenterInsights(
  results: readonly PortalAssessmentResultDto[],
): AssessmentCenterInsights {
  const latest = results[0] ?? null;
  const scored = results.filter((row) => row.score != null);
  const averageScore =
    scored.length > 0
      ? Math.round(
          scored.reduce((sum, row) => sum + (row.score as number), 0) /
            scored.length,
        )
      : null;

  const subjectMap = new Map<string, number[]>();
  for (const row of results) {
    for (const subject of row.subjects) {
      if (subject.percentage == null) continue;
      const list = subjectMap.get(subject.name) ?? [];
      list.push(subject.percentage);
      subjectMap.set(subject.name, list);
    }
  }

  const subjectCards: AssessmentSubjectInsight[] = [...subjectMap.entries()]
    .map(([name, values]) => ({
      name,
      percentage: Math.round(
        values.reduce((sum, value) => sum + value, 0) / values.length,
      ),
    }))
    .sort((a, b) => b.percentage - a.percentage);

  return {
    count: results.length,
    latest,
    averageScore,
    trend: results.slice(0, 8).map((row) => ({
      id: row.id,
      title: row.assessmentTitle,
      score: row.score,
      date: row.assessmentDate,
    })),
    bestSubject: subjectCards[0] ?? null,
    needsImprovement:
      subjectCards.length > 1
        ? subjectCards[subjectCards.length - 1]
        : null,
    subjectCards: subjectCards.slice(0, 6),
  };
}
