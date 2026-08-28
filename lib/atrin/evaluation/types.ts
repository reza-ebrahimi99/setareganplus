/**
 * Atrin Evaluation Engine — quality scoring over Education Engine outputs.
 */

import type {
  EducationGrade,
  EducationIntent,
  EducationQuestionType,
  EducationResponseSection,
  EducationSubject,
  TeachingStrategyId,
} from "@/lib/atrin/education/types";

export type EvaluationBenchmarkItem = {
  id: string;
  gradeFolder: `Grade${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12}`;
  subjectFolder:
    | "Math"
    | "Science"
    | "Persian"
    | "English"
    | "Arabic"
    | "Chemistry"
    | "Physics"
    | "Biology"
    | "Programming"
    | "Gifted"
    | "Konkur";
  question: string;
  expectedSubject: EducationSubject;
  expectedGrade: EducationGrade;
  expectedIntent: EducationIntent;
  expectedQuestionType?: EducationQuestionType;
  expectedStrategy: TeachingStrategyId;
  expectedResponseStructure: EducationResponseSection[];
  /** Optional expected normalized form fragment */
  expectedNormalizedIncludes?: string[];
};

export type EvaluationDimension =
  | "subject"
  | "grade"
  | "intent"
  | "questionType"
  | "strategy"
  | "normalization"
  | "structure";

export type EvaluationDimensionScore = {
  dimension: EvaluationDimension;
  passed: boolean;
  expected: string;
  actual: string;
  weight: number;
};

export type EvaluationItemResult = {
  itemId: string;
  scores: EvaluationDimensionScore[];
  qualityScore: number;
  averageConfidence: number;
  suggestions: string[];
};

export type EvaluationSuiteResult = {
  ranAt: number;
  total: number;
  passed: number;
  accuracy: {
    subject: number;
    grade: number;
    intent: number;
    questionType: number;
    strategy: number;
    normalization: number;
  };
  averageConfidence: number;
  averageQuality: number;
  weakest: EvaluationDimension | null;
  items: EvaluationItemResult[];
};

export type EvaluationAnalyticsSnapshot = {
  updatedAt: number;
  mostAskedSubjects: Array<{ subject: string; count: number }>;
  weakestDetection: EvaluationDimension | null;
  commonMistakes: string[];
  mostRequestedGrades: Array<{ grade: string; count: number }>;
  popularTopics: Array<{ topic: string; count: number }>;
  lastSuite: EvaluationSuiteResult | null;
};
