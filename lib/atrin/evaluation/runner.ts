/**
 * Automated evaluation runner for Education Engine benchmarks.
 */

import { ATRIN_EDUCATION_BENCHMARKS } from "@/lib/atrin/evaluation/benchmarks";
import { evaluateEducationResponse } from "@/lib/atrin/evaluation/evaluate";
import type {
  EvaluationBenchmarkItem,
  EvaluationDimension,
  EvaluationSuiteResult,
} from "@/lib/atrin/evaluation/types";
import { recordEvaluationSuite } from "@/lib/atrin/evaluation/analytics";

function ratio(passed: number, total: number): number {
  return total === 0 ? 0 : passed / total;
}

export function runEducationEvaluationSuite(
  items: EvaluationBenchmarkItem[] = ATRIN_EDUCATION_BENCHMARKS,
  options?: { persistAnalytics?: boolean },
): EvaluationSuiteResult {
  const results = items.map(evaluateEducationResponse);

  const dimPass = {
    subject: 0,
    grade: 0,
    intent: 0,
    questionType: 0,
    strategy: 0,
    normalization: 0,
  };
  const dimTotal = { ...dimPass };

  for (const r of results) {
    for (const s of r.scores) {
      if (s.dimension === "structure") continue;
      if (s.dimension in dimTotal) {
        dimTotal[s.dimension as keyof typeof dimTotal] += 1;
        if (s.passed) dimPass[s.dimension as keyof typeof dimPass] += 1;
      }
    }
  }

  const accuracy = {
    subject: ratio(dimPass.subject, dimTotal.subject),
    grade: ratio(dimPass.grade, dimTotal.grade),
    intent: ratio(dimPass.intent, dimTotal.intent),
    questionType: ratio(dimPass.questionType, dimTotal.questionType),
    strategy: ratio(dimPass.strategy, dimTotal.strategy),
    normalization: ratio(dimPass.normalization, dimTotal.normalization),
  };

  const entries = Object.entries(accuracy) as Array<
    [EvaluationDimension, number]
  >;
  entries.sort((a, b) => a[1] - b[1]);
  const weakest = entries[0]?.[0] ?? null;

  const passed = results.filter((r) => r.qualityScore >= 0.7).length;
  const averageConfidence =
    results.reduce((s, r) => s + r.averageConfidence, 0) /
    (results.length || 1);
  const averageQuality =
    results.reduce((s, r) => s + r.qualityScore, 0) / (results.length || 1);

  const suite: EvaluationSuiteResult = {
    ranAt: Date.now(),
    total: results.length,
    passed,
    accuracy,
    averageConfidence,
    averageQuality,
    weakest,
    items: results,
  };

  if (options?.persistAnalytics !== false) {
    recordEvaluationSuite(suite, items);
  }

  return suite;
}

export function formatEvaluationReport(suite: EvaluationSuiteResult): string {
  const lines = [
    `Atrin Education Evaluation`,
    `Total: ${suite.total} | Passed (≥0.7): ${suite.passed}`,
    `Avg quality: ${suite.averageQuality.toFixed(3)}`,
    `Avg confidence: ${suite.averageConfidence.toFixed(3)}`,
    `Subject acc: ${suite.accuracy.subject.toFixed(3)}`,
    `Grade acc: ${suite.accuracy.grade.toFixed(3)}`,
    `Intent acc: ${suite.accuracy.intent.toFixed(3)}`,
    `QType acc: ${suite.accuracy.questionType.toFixed(3)}`,
    `Strategy acc: ${suite.accuracy.strategy.toFixed(3)}`,
    `Normalize acc: ${suite.accuracy.normalization.toFixed(3)}`,
    `Weakest: ${suite.weakest ?? "n/a"}`,
  ];
  return lines.join("\n");
}
