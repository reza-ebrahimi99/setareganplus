/**
 * Interest Assessment — deterministic scoring (no AI, no clinical claims).
 * Likert 1–5, reverse items as (6 - answer), category mean → 0–100.
 */

import {
  ASSESSMENT_CATEGORIES,
  getAssessmentCategory,
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
  cautionNote: string;
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

export type AssessmentTraitCard = {
  categoryId: AssessmentCategoryId;
  title: string;
  score: number;
  label: string;
  explanation: string;
};

export type AssessmentExplanationCard = {
  id: string;
  title: string;
  body: string;
};

export type AssessmentConfidence = {
  percent: number;
  label: string;
  explanation: string;
};

export type AssessmentDashboardModel = {
  result: AssessmentResult;
  strongest: AssessmentTraitCard[];
  weaker: AssessmentTraitCard[];
  topInterestCategories: AssessmentTraitCard[];
  suggestedMajors: MajorFitScore[];
  cautionMajors: MajorFitScore[];
  explanations: AssessmentExplanationCard[];
  feedback: string;
  confidence: AssessmentConfidence;
  disclaimer: string;
  ctaLabel: string;
  ctaHref: string;
};

export const ASSESSMENT_DISCLAIMER =
  "نتیجه بالا صرفاً خروجی آزمون است.\nتفسیر تخصصی این نتایج، بررسی بازار کار، شرایط دانشگاهها و انطباق با رتبه و سوابق تحصیلی، فقط در جلسه مشاوره با مهندس رضا ابراهیمی انجام میشود.";

export const ASSESSMENT_RESULTS_CTA_LABEL = "رزرو جلسه تحلیل تخصصی";
export const ASSESSMENT_RESULTS_CTA_HREF = "/book/guidance-first-session";

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
  const primaryDef = getAssessmentCategory(primary.categoryId)!;
  const secondaryDef = getAssessmentCategory(secondary.categoryId)!;

  return {
    primaryCategoryId: primary.categoryId,
    secondaryCategoryId: secondary.categoryId,
    title: `${primaryDef.highTraitLabel} · ${secondaryDef.highTraitLabel}`,
    description: `${primaryDef.highTraitDescription} همچنین ${secondaryDef.highTraitDescription} این فقط الگوی همین پرسشنامه است، نه تشخیص روان‌شناختی.`,
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
    return {
      clusterId: cluster.id,
      title: cluster.title,
      fitScore,
      cautionNote: cluster.cautionNote,
    };
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

function traitCard(
  score: CategoryScore,
  side: "high" | "low",
): AssessmentTraitCard {
  const def = getAssessmentCategory(score.categoryId)!;
  return {
    categoryId: score.categoryId,
    title: def.title,
    score: score.normalizedScore,
    label: side === "high" ? def.highTraitLabel : def.lowTraitLabel,
    explanation:
      side === "high" ? def.highTraitDescription : def.lowTraitDescription,
  };
}

function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function stddev(values: readonly number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const variance =
    values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Confidence is explainable from this questionnaire only:
 * differentiation of dimension scores + agreement of reverse items
 * with their category. Not a clinical reliability coefficient.
 */
export function computeAssessmentConfidence(
  answers: AssessmentAnswers,
  categoryScores: readonly CategoryScore[],
): AssessmentConfidence {
  const scores = categoryScores.map((row) => row.normalizedScore);
  const spread = stddev(scores);
  const differentiation = Math.max(0, Math.min(100, Math.round((spread / 35) * 100)));

  const reverseItems = ASSESSMENT_QUESTIONS.filter((q) => q.reverse);
  let reverseAgree = differentiation;
  if (isAssessmentComplete(answers) && reverseItems.length > 0) {
    const scoreMap = new Map(
      categoryScores.map((row) => [row.categoryId, row.rawAverage]),
    );
    const deltas = reverseItems.map((question) => {
      const raw = scoreForQuestion(question, answers[question.id] ?? 3);
      const cat = scoreMap.get(question.categoryId) ?? 3;
      return Math.abs(raw - cat);
    });
    const avgDelta = mean(deltas);
    reverseAgree = Math.max(0, Math.min(100, Math.round((1 - avgDelta / 2) * 100)));
  }

  const percent = Math.round(0.55 * differentiation + 0.45 * reverseAgree);
  let label = "تمایز متوسط پاسخ‌ها";
  let explanation =
    "برخی ابعاد از بقیه فاصله گرفته‌اند. این عدد فقط از پراکندگی پاسخ‌های همین آزمون ساخته شده، نه از روایی علمی یک تست روان‌سنجی.";
  if (percent >= 70) {
    label = "پاسخ‌ها الگوی متمایزی ساخته‌اند";
    explanation =
      "نمره‌های ابعاد از هم فاصله گرفته‌اند و سؤال‌های معکوس با همان بُعد هم‌خوان‌تر بوده‌اند. این فقط کیفیت تمایز در همین پرسشنامه است، نه روایی علمی یک تست روان‌سنجی.";
  } else if (percent <= 40) {
    label = "پاسخ‌ها به هم نزدیک‌اند";
    explanation =
      "بسیاری از ابعاد نزدیک به میانه‌اند یا سؤال‌های معکوس با بقیه‌ی همان بخش فاصله دارند. این شاخص روایی علمی یک تست روان‌سنجی نیست؛ تفسیر را به جلسه تخصصی بسپارید.";
  }

  return { percent, label, explanation };
}

export function buildAssessmentDashboard(
  answers: AssessmentAnswers,
  result: AssessmentResult = computeAssessmentResult(answers),
): AssessmentDashboardModel {
  const sorted = [...result.categoryScores].sort(
    (a, b) => b.normalizedScore - a.normalizedScore,
  );
  const strongest = sorted.slice(0, 3).map((row) => traitCard(row, "high"));
  const weaker = sorted
    .slice(-3)
    .reverse()
    .map((row) => traitCard(row, "low"));
  const interestOrder: AssessmentCategoryId[] = [
    "interests",
    "technical",
    "helping",
    "creativity",
    "business",
    "research",
    "environmental",
  ];
  const topInterestCategories = interestOrder
    .map((id) => sorted.find((row) => row.categoryId === id))
    .filter((row): row is CategoryScore => Boolean(row))
    .sort((a, b) => b.normalizedScore - a.normalizedScore)
    .slice(0, 4)
    .map((row) => traitCard(row, "high"));

  const suggestedMajors = result.suitableMajors;
  const cautionMajors = result.lessSuitableMajors;
  const primary = getAssessmentCategory(result.personality.primaryCategoryId);
  const topMajor = suggestedMajors[0];
  const caution = cautionMajors[0];

  const explanations: AssessmentExplanationCard[] = [
    {
      id: "method",
      title: "این عددها از کجا آمده‌اند؟",
      body: "هر سؤال یک مقیاس ۱ تا ۵ است. بعضی سؤال‌ها معکوس حساب می‌شوند. میانگین هر بُعد به مقیاس ۰ تا ۱۰۰ تبدیل می‌شود. گروه رشته‌ها هم میانگین وزن‌دار همین ابعاد است — نه پیش‌بینی قبولی و نه توصیه قطعی.",
    },
    {
      id: "strong",
      title: "قوی‌ترین الگو در پاسخ شما",
      body: strongest
        .map((item) => `${item.title}: ${item.explanation}`)
        .join(" "),
    },
    {
      id: "majors",
      title: "چرا این گروه‌های رشته؟",
      body: topMajor
        ? `گروه «${topMajor.title}» بالاترین هم‌خوانی وزن‌دار را با الگوی پاسخ شما داشته است. این هم‌خوانی علاقه است، نه ظرفیت دانشگاه و نه رتبه.`
        : "گروه رشته‌ای برای نمایش ساخته نشد.",
    },
    {
      id: "caution",
      title: "رشته‌هایی که باید با احتیاط دید",
      body: caution
        ? `${caution.cautionNote} فاصله عددی یعنی در این آزمون کمترین هم‌خوانی را داشته‌اند.`
        : "موردی برای احتیاط محاسبه نشد.",
    },
  ];

  const feedback = [
    `بر اساس همین آزمون، پررنگ‌ترین ترجیح شما «${primary?.highTraitLabel ?? "ترجیح غالب"}» است.`,
    topMajor
      ? `از نظر هم‌خوانی پاسخ‌ها، گروه «${topMajor.title}» بالاتر ایستاده است.`
      : "",
    caution
      ? `گروه «${caution.title}» در پایین فهرست هم‌خوانی این آزمون است و باید در جلسه تخصصی بررسی شود.`
      : "",
    "هیچ‌کدام از این جمله‌ها جای مشورت مهندس رضا ابراهیمی با رتبه، سهمیه و کارنامه را نمی‌گیرد.",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    result,
    strongest,
    weaker,
    topInterestCategories,
    suggestedMajors,
    cautionMajors,
    explanations,
    feedback,
    confidence: computeAssessmentConfidence(answers, result.categoryScores),
    disclaimer: ASSESSMENT_DISCLAIMER,
    ctaLabel: ASSESSMENT_RESULTS_CTA_LABEL,
    ctaHref: ASSESSMENT_RESULTS_CTA_HREF,
  };
}
