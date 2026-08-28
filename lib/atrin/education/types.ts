/**
 * Atrin Education Engine — shared types (UI intelligence layer only).
 */

export type EducationSubject =
  | "math"
  | "science"
  | "physics"
  | "chemistry"
  | "biology"
  | "geometry"
  | "statistics"
  | "calculus"
  | "discrete_math"
  | "persian"
  | "writing"
  | "dictation"
  | "arabic"
  | "english"
  | "religion"
  | "history"
  | "geography"
  | "social_studies"
  | "gifted"
  | "konkur"
  | "programming"
  | "general_knowledge"
  | "unknown";

export type EducationGrade =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | null;

export type EducationDifficulty = "easy" | "medium" | "hard" | "unknown";

export type EducationIntent =
  | "learn"
  | "solve"
  | "hint"
  | "practice"
  | "explain"
  | "check"
  | "homework"
  | "exam"
  | "translate"
  | "improve_writing"
  | "general";

export type EducationQuestionType =
  | "multiple_choice"
  | "true_false"
  | "fill_blank"
  | "essay"
  | "proof"
  | "calculation"
  | "equation"
  | "geometry"
  | "diagram"
  | "definition"
  | "translation"
  | "grammar"
  | "programming"
  | "word_problem"
  | "experiment"
  | "reading"
  | "listening"
  | "unknown";

export type TeachingStrategyId =
  | "math_steps"
  | "chemistry_reaction"
  | "physics_formula"
  | "language_grammar"
  | "writing_improve"
  | "biology_concept"
  | "history_narrative"
  | "programming_debug"
  | "homework_progressive"
  | "exam_tricks"
  | "generic_teach";

export type EducationNormalizeResult = {
  original: string;
  normalized: string;
};

export type DetectionScore<T extends string> = {
  value: T;
  confidence: number;
  signals: string[];
};

export type EducationAnalysis = {
  original: string;
  normalized: string;
  subject: DetectionScore<EducationSubject>;
  grade: { value: EducationGrade; confidence: number; signals: string[] };
  difficulty: DetectionScore<EducationDifficulty>;
  intent: DetectionScore<EducationIntent>;
  questionType: DetectionScore<EducationQuestionType>;
  strategy: TeachingStrategyId;
  isEducational: boolean;
  homeworkMode: boolean;
  examMode: boolean;
  mathTopics: string[];
  chemistryTopics: string[];
  physicsTopics: string[];
  languageTopics: string[];
};

export type EducationResponseSection =
  | "summary"
  | "hint"
  | "step"
  | "final_answer"
  | "common_mistakes"
  | "exam_tips"
  | "similar"
  | "practice";

export type EducationFormattedPlan = {
  strategy: TeachingStrategyId;
  sections: EducationResponseSection[];
  actions: EducationActionId[];
  block: EducationBlockKind;
  labels: {
    title: string;
    accent: string;
    tip: string;
  };
};

export type EducationActionId =
  | "learn_topic"
  | "more_exercises"
  | "similar_question"
  | "easier"
  | "harder"
  | "related_chapter"
  | "explain_teacher"
  | "explain_elementary"
  | "explain_highschool"
  | "hint_only"
  | "show_steps"
  | "show_answer"
  | "another_exercise";

export type EducationBlockKind =
  | "math"
  | "chemistry"
  | "physics"
  | "language"
  | "history"
  | "programming"
  | "generic";

/** Future vision / OCR — interfaces only, no implementation. */
export type EducationVisionInputKind =
  | "book_photo"
  | "homework_photo"
  | "exam_sheet"
  | "handwriting"
  | "diagram"
  | "chart";

export type EducationVisionInput = {
  kind: EducationVisionInputKind;
  /** Future: blob/url — not used yet */
  sourceRef?: string;
  mimeType?: string;
  createdAt: number;
};

export type EducationVisionResult = {
  ok: false;
  reason: "not_implemented";
  input: EducationVisionInput;
};

export type StudyProfile = {
  preferredGrade: EducationGrade;
  favoriteSubject: EducationSubject | null;
  preferredSubject: EducationSubject | null;
  weakness: string | null;
  weakTopics: string[];
  strongTopics: string[];
  preferredStyle: "step_by_step" | "hint_first" | "full_solution" | null;
  learningHistory: string[];
  completedLessons: string[];
  recentExercises: string[];
  recentLessons: string[];
  recentMistakes: string[];
  recentPrompts: string[];
  updatedAt: number | null;
};
