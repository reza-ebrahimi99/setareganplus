/**
 * Guidance Journey Engine Step 2 — deterministic scoring engine.
 * Pure functions only — no I/O. Rule-based, not AI (matches spec: "quality
 * assessment", auto-calculated profile — no black box).
 */

import {
  ASSESSMENT_CATEGORIES,
  type AssessmentCategoryId,
} from "@/lib/guidance/journey/assessment/categories";
import {
  ASSESSMENT_QUESTIONS,
  type AssessmentQuestion,
} from "@/lib/guidance/journey/assessment/question-bank";
import { MAJOR_CLUSTERS } from "@/lib/guidance/journey/assessment/major-clusters";

export type AssessmentAnswers = Record<string, number>;

export type CategoryScore = {
  categoryId: AssessmentCategoryId;
  rawAverage: number;
  /** 0-100 normalized from the 1-5 Likert average. */
  normalizedScore: number;
};

export type MajorFitScore = {
  clusterId: string;
  title: string;
  fitScore: number;
};

export type AssessmentResult = {
  categoryScores: CategoryScore[];
  personality: {
    primaryCategoryId: AssessmentCategoryId;
    secondaryCategoryId: AssessmentCategoryId;
    title: string;
    description: string;
  };
  suitableMajors: MajorFitScore[];
  lessSuitableMajors: MajorFitScore[];
  completedAtIso: string;
};

function scoreForQuestion(question: AssessmentQuestion, answer: number): number {
  const clamped = Math.min(5, Math.max(1, answer));
  return question.reverse ? 6 - clamped : clamped;
}

export function isAssessmentComplete(answers: AssessmentAnswers): boolean {
  return ASSESSMENT_QUESTIONS.every((q) => {
    const value = answers[q.id];
    return typeof value === "number" && value >= 1 && value <= 5;
  });
}

export function computeCategoryScores(
  answers: AssessmentAnswers,
): CategoryScore[] {
  return ASSESSMENT_CATEGORIES.map((category) => {
    const questions = ASSESSMENT_QUESTIONS.filter(
      (q) => q.categoryId === category.id,
    );
    const scored = questions.map((q) => scoreForQuestion(q, answers[q.id] ?? 3));
    const rawAverage =
      scored.reduce((sum, v) => sum + v, 0) / Math.max(1, scored.length);
    const normalizedScore = Math.round(((rawAverage - 1) / 4) * 100);
    return { categoryId: category.id, rawAverage, normalizedScore };
  });
}

function buildPersonalityProfile(
  categoryScores: readonly CategoryScore[],
): AssessmentResult["personality"] {
  const sorted = [...categoryScores].sort(
    (a, b) => b.normalizedScore - a.normalizedScore,
  );
  const primary = sorted[0]!;
  const secondary = sorted[1]!;
  const primaryDef = ASSESSMENT_CATEGORIES.find((c) => c.id === primary.categoryId)!;
  const secondaryDef = ASSESSMENT_CATEGORIES.find(
    (c) => c.id === secondary.categoryId,
  )!;

  return {
    primaryCategoryId: primary.categoryId,
    secondaryCategoryId: secondary.categoryId,
    title: `${primaryDef.highTraitLabel} · ${secondaryDef.highTraitLabel}`,
    description: `${primaryDef.highTraitDescription} همچنین ${secondaryDef.highTraitDescription}`,
  };
}

function computeMajorFit(
  categoryScores: readonly CategoryScore[],
): MajorFitScore[] {
  const scoreMap = new Map(
    categoryScores.map((s) => [s.categoryId, s.normalizedScore]),
  );

  return MAJOR_CLUSTERS.map((cluster) => {
    const entries = Object.entries(cluster.weights) as [
      AssessmentCategoryId,
      number,
    ][];
    const totalWeight = entries.reduce((sum, [, w]) => sum + w, 0);
    const weightedSum = entries.reduce(
      (sum, [categoryId, weight]) => sum + weight * (scoreMap.get(categoryId) ?? 0),
      0,
    );
    const fitScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
    return { clusterId: cluster.id, title: cluster.title, fitScore };
  }).sort((a, b) => b.fitScore - a.fitScore);
}

export function computeAssessmentResult(
  answers: AssessmentAnswers,
): AssessmentResult {
  const categoryScores = computeCategoryScores(answers);
  const majorFit = computeMajorFit(categoryScores);

  return {
    categoryScores,
    personality: buildPersonalityProfile(categoryScores),
    suitableMajors: majorFit.slice(0, 4),
    lessSuitableMajors: majorFit.slice(-3).reverse(),
    completedAtIso: new Date().toISOString(),
  };
}
