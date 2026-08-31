/**
 * Free Interest Assessment — unit tests (no DB).
 * Run: npm run test:guidance-assessment
 */

import assert from "node:assert/strict";
import { ASSESSMENT_CATEGORIES } from "../lib/guidance/journey/assessment/categories";
import {
  ASSESSMENT_QUESTION_COUNT,
  ASSESSMENT_QUESTIONS,
  ASSESSMENT_SECTIONS,
  getQuestionsForSection,
} from "../lib/guidance/journey/assessment/question-bank";
import {
  ASSESSMENT_DISCLAIMER,
  ASSESSMENT_RESULTS_CTA_LABEL,
  buildAssessmentDashboard,
  computeAssessmentResult,
  isAssessmentComplete,
  type AssessmentAnswers,
} from "../lib/guidance/journey/assessment/scoring";

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

function fillAll(value: number): AssessmentAnswers {
  const answers: AssessmentAnswers = {};
  for (const question of ASSESSMENT_QUESTIONS) {
    answers[question.id] = value;
  }
  return answers;
}

test("question bank is 50–70 items in short sections", () => {
  assert.ok(ASSESSMENT_QUESTION_COUNT >= 50);
  assert.ok(ASSESSMENT_QUESTION_COUNT <= 70);
  assert.equal(ASSESSMENT_QUESTIONS.length, ASSESSMENT_QUESTION_COUNT);
  for (const section of ASSESSMENT_SECTIONS) {
    const count = getQuestionsForSection(section.id).length;
    assert.ok(count >= 5, section.id);
    assert.ok(count <= 8, section.id);
  }
});

test("fifteen required dimensions are scored", () => {
  assert.equal(ASSESSMENT_CATEGORIES.length, 15);
  const ids = new Set(ASSESSMENT_CATEGORIES.map((row) => row.id as string));
  for (const required of [
    "interests",
    "personality",
    "work_style",
    "learning_style",
    "social",
    "leadership",
    "research",
    "creativity",
    "helping",
    "technical",
    "business",
    "environmental",
    "decision_making",
    "stress_tolerance",
    "future_goals",
  ]) {
    assert.equal(ids.has(required), true, required);
  }
  for (const category of ASSESSMENT_CATEGORIES) {
    const count = ASSESSMENT_QUESTIONS.filter((q) => q.categoryId === category.id).length;
    assert.ok(count >= 4, category.id);
  }
});

test("reverse items invert the Likert score", () => {
  const high = fillAll(5);
  const low = fillAll(1);
  const highResult = computeAssessmentResult(high);
  const lowResult = computeAssessmentResult(low);
  const highSocial = highResult.categoryScores.find((row) => row.categoryId === "social")!;
  const lowSocial = lowResult.categoryScores.find((row) => row.categoryId === "social")!;
  assert.ok(highSocial.normalizedScore > lowSocial.normalizedScore);
});

test("incomplete answers are not complete", () => {
  assert.equal(isAssessmentComplete({}), false);
  assert.equal(isAssessmentComplete(fillAll(4)), true);
  const missing = fillAll(4);
  delete missing.p1;
  assert.equal(isAssessmentComplete(missing), false);
});

test("dashboard is explainable and includes conversion CTA", () => {
  const answers = fillAll(5);
  answers.s4 = 1;
  answers.h4 = 1;
  const dashboard = buildAssessmentDashboard(answers);
  assert.equal(dashboard.strongest.length, 3);
  assert.equal(dashboard.weaker.length, 3);
  assert.ok(dashboard.suggestedMajors.length >= 3);
  assert.ok(dashboard.cautionMajors.length >= 1);
  assert.ok(dashboard.explanations.length >= 4);
  assert.ok(dashboard.feedback.includes("همین آزمون"));
  assert.equal(dashboard.disclaimer, ASSESSMENT_DISCLAIMER);
  assert.equal(dashboard.ctaLabel, ASSESSMENT_RESULTS_CTA_LABEL);
  assert.equal(dashboard.ctaHref, "/book/guidance-first-session");
  assert.equal(dashboard.result.categoryScores.length, 15);
  const blob = `${dashboard.result.personality.description} ${dashboard.feedback} ${dashboard.confidence.explanation} ${dashboard.explanations.map((c) => c.body).join(" ")}`;
  assert.equal(blob.includes("RIASEC"), false);
  assert.equal(blob.includes("MBTI"), false);
  assert.ok(blob.includes("روان‌شناختی") || blob.includes("همین آزمون"));
  assert.ok(dashboard.confidence.explanation.includes("روان‌سنجی"));
});

test("flat answers produce a cautious confidence label", () => {
  const dashboard = buildAssessmentDashboard(fillAll(3));
  assert.ok(dashboard.confidence.percent <= 45);
});

console.log("guidance assessment unit tests passed");
