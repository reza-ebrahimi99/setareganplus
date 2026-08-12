import { detectEducationDifficulty } from "@/lib/atrin/education/detect-difficulty";
import { detectEducationGrade } from "@/lib/atrin/education/detect-grade";
import { detectEducationIntent } from "@/lib/atrin/education/detect-intent";
import { detectEducationQuestionType } from "@/lib/atrin/education/detect-question-type";
import { detectEducationSubject } from "@/lib/atrin/education/detect-subject";
import {
  detectChemistryTopics,
  detectLanguageTopics,
  detectMathTopics,
  detectPhysicsTopics,
} from "@/lib/atrin/education/engines/topics";
import { formatEducationPlan } from "@/lib/atrin/education/format";
import { normalizeEducationInput } from "@/lib/atrin/education/normalize";
import { chooseTeachingStrategy } from "@/lib/atrin/education/strategy";
import type {
  EducationAnalysis,
  EducationFormattedPlan,
} from "@/lib/atrin/education/types";

/**
 * Full Education Engine pipeline (client-side intelligence only).
 * Does not call AI APIs.
 */
export function analyzeEducationInput(text: string): EducationAnalysis {
  const { original, normalized } = normalizeEducationInput(text);
  const subject = detectEducationSubject(normalized);
  const grade = detectEducationGrade(normalized);
  const difficulty = detectEducationDifficulty(normalized);
  const intent = detectEducationIntent(normalized);
  const questionType = detectEducationQuestionType(normalized);

  const homeworkMode =
    intent.value === "homework" || /حلش\s*کن|حل\s*کن/.test(normalized);
  const examMode =
    intent.value === "exam" || /آزمون|امتحان|کنکور/.test(normalized);

  const draft = {
    subject,
    intent,
    homeworkMode,
    examMode,
  };

  const strategy = chooseTeachingStrategy(draft);

  const isEducational =
    subject.value !== "unknown" ||
    intent.value !== "general" ||
    questionType.value !== "unknown" ||
    homeworkMode ||
    examMode ||
    /درس|تمرین|سؤال|سوال|معادله|توضیح/.test(normalized);

  return {
    original,
    normalized,
    subject,
    grade,
    difficulty,
    intent,
    questionType,
    strategy,
    isEducational,
    homeworkMode,
    examMode,
    mathTopics: detectMathTopics(normalized),
    chemistryTopics: detectChemistryTopics(normalized),
    physicsTopics: detectPhysicsTopics(normalized),
    languageTopics: detectLanguageTopics(normalized),
  };
}

export function runEducationEngine(text: string): {
  analysis: EducationAnalysis;
  plan: EducationFormattedPlan;
} {
  const analysis = analyzeEducationInput(text);
  const plan = formatEducationPlan(analysis);
  return { analysis, plan };
}
