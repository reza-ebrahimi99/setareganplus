/**
 * Evaluate a single Education Engine analysis against benchmark expectations.
 */

import { runEducationEngine } from "@/lib/atrin/education/analyze";
import type { EvaluationBenchmarkItem, EvaluationItemResult } from "@/lib/atrin/evaluation/types";
import type { EducationResponseSection } from "@/lib/atrin/education/types";

function structureScore(
  expected: EducationResponseSection[],
  actual: EducationResponseSection[],
): boolean {
  if (!expected.length) return true;
  const set = new Set(actual);
  const covered = expected.filter((s) => set.has(s)).length;
  return covered / expected.length >= 0.6;
}

export function evaluateEducationResponse(
  item: EvaluationBenchmarkItem,
): EvaluationItemResult {
  const { analysis, plan } = runEducationEngine(item.question);
  const suggestions: string[] = [];

  const subjectPass = analysis.subject.value === item.expectedSubject;
  if (!subjectPass) {
    suggestions.push(
      `Subject: expected ${item.expectedSubject}, got ${analysis.subject.value}`,
    );
  }

  const gradePass =
    item.expectedGrade == null ||
    analysis.grade.value === item.expectedGrade;
  if (!gradePass) {
    suggestions.push(
      `Grade: expected ${item.expectedGrade}, got ${analysis.grade.value}`,
    );
  }

  const intentPass = analysis.intent.value === item.expectedIntent;
  if (!intentPass) {
    suggestions.push(
      `Intent: expected ${item.expectedIntent}, got ${analysis.intent.value}`,
    );
  }

  const qTypePass =
    !item.expectedQuestionType ||
    analysis.questionType.value === item.expectedQuestionType;
  if (!qTypePass && item.expectedQuestionType) {
    suggestions.push(
      `QuestionType: expected ${item.expectedQuestionType}, got ${analysis.questionType.value}`,
    );
  }

  const strategyPass = analysis.strategy === item.expectedStrategy;
  if (!strategyPass) {
    suggestions.push(
      `Strategy: expected ${item.expectedStrategy}, got ${analysis.strategy}`,
    );
  }

  let normalizationPass = true;
  if (item.expectedNormalizedIncludes?.length) {
    normalizationPass = item.expectedNormalizedIncludes.every((frag) =>
      analysis.normalized.includes(frag),
    );
    if (!normalizationPass) {
      suggestions.push(
        `Normalization missing: ${item.expectedNormalizedIncludes.join(", ")}`,
      );
    }
  }

  const structurePass = structureScore(
    item.expectedResponseStructure,
    plan.sections,
  );
  if (!structurePass) {
    suggestions.push("Response structure missing expected sections");
  }

  const scores = [
    {
      dimension: "subject" as const,
      passed: subjectPass,
      expected: item.expectedSubject,
      actual: analysis.subject.value,
      weight: 2,
    },
    {
      dimension: "grade" as const,
      passed: gradePass,
      expected: String(item.expectedGrade),
      actual: String(analysis.grade.value),
      weight: 1,
    },
    {
      dimension: "intent" as const,
      passed: intentPass,
      expected: item.expectedIntent,
      actual: analysis.intent.value,
      weight: 2,
    },
    {
      dimension: "questionType" as const,
      passed: qTypePass,
      expected: String(item.expectedQuestionType ?? "any"),
      actual: analysis.questionType.value,
      weight: 1,
    },
    {
      dimension: "strategy" as const,
      passed: strategyPass,
      expected: item.expectedStrategy,
      actual: analysis.strategy,
      weight: 2,
    },
    {
      dimension: "normalization" as const,
      passed: normalizationPass,
      expected: (item.expectedNormalizedIncludes ?? []).join("|") || "n/a",
      actual: analysis.normalized.slice(0, 80),
      weight: 1,
    },
    {
      dimension: "structure" as const,
      passed: structurePass,
      expected: item.expectedResponseStructure.join(">"),
      actual: plan.sections.join(">"),
      weight: 1,
    },
  ];

  const totalWeight = scores.reduce((s, x) => s + x.weight, 0);
  const earned = scores.reduce((s, x) => s + (x.passed ? x.weight : 0), 0);
  const qualityScore = totalWeight ? earned / totalWeight : 0;

  const averageConfidence =
    (analysis.subject.confidence +
      analysis.grade.confidence +
      analysis.intent.confidence +
      analysis.questionType.confidence +
      analysis.difficulty.confidence) /
    5;

  return {
    itemId: item.id,
    scores,
    qualityScore,
    averageConfidence,
    suggestions,
  };
}
