/**
 * Interest Discovery Center — presentation contracts.
 * No JSX. Future RIASEC / Holland / Big Five / AI fill these models without redesign.
 */

import type { PortalIconName } from "@/components/portal/icons";
import type { PortalAccentId } from "@/components/portal/theme/types";

export const INTEREST_QUESTION_TYPES = [
  "single_choice",
  "multiple_choice",
  "scale",
  "priority_ranking",
  "card_selection",
  "image_selection",
  "drag_drop",
] as const;

export type InterestQuestionType = (typeof INTEREST_QUESTION_TYPES)[number];

export const INTEREST_SECTION_IDS = [
  "introduction",
  "career_interests",
  "learning_style",
  "personality",
  "working_preferences",
  "review",
  "completed",
] as const;

export type InterestSectionId = (typeof INTEREST_SECTION_IDS)[number];

export type InterestOption = {
  id: string;
  label: string;
  description?: string;
  /** Architecture for image / card art — null until assets exist. */
  illustrationSlot?: string | null;
  /** Optional RIASEC / trait tag for future scoring — not shown as AI. */
  traitTag?: string | null;
};

export type InterestQuestion = {
  id: string;
  sectionId: InterestSectionId;
  type: InterestQuestionType;
  title: string;
  description: string;
  required: boolean;
  options: readonly InterestOption[];
  /** scale: 1–5 labels */
  scaleMin?: number;
  scaleMax?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
  /** multiple_choice / priority max selections */
  maxSelections?: number;
  /** Architecture flags */
  supportsDragDrop?: boolean;
  illustrationSlot?: string | null;
  estimatedSeconds?: number;
};

export type InterestAnswerValue =
  | { kind: "single"; optionId: string }
  | { kind: "multiple"; optionIds: string[] }
  | { kind: "scale"; value: number }
  | { kind: "priority"; orderedOptionIds: string[] }
  | { kind: "card"; optionId: string }
  | { kind: "image"; optionId: string }
  | { kind: "drag_drop"; orderedOptionIds: string[] };

export type InterestAnswersMap = Record<string, InterestAnswerValue>;

export type InterestSessionStatus = "not_started" | "in_progress" | "completed";

export type InterestSessionRecord = {
  planId: string;
  planPublicId: string;
  status: InterestSessionStatus;
  currentSectionId: InterestSectionId;
  currentQuestionId: string | null;
  answers: InterestAnswersMap;
  startedAtIso: string | null;
  updatedAtIso: string | null;
  completedAtIso: string | null;
  mediaAssetId: string | null;
};

export type InterestSectionProgress = {
  id: InterestSectionId;
  title: string;
  description: string;
  icon: PortalIconName;
  accent: PortalAccentId;
  questionCount: number;
  answeredCount: number;
  percent: number;
  state: "locked" | "current" | "complete" | "upcoming";
};

export type InterestProgressModel = {
  overallPercent: number;
  answeredCount: number;
  totalQuestions: number;
  remainingQuestions: number;
  estimatedRemainingSeconds: number;
  estimatedRemainingLabel: string;
  sections: readonly InterestSectionProgress[];
  ringPercent: number;
};

export type InterestQuestionCardModel = {
  question: InterestQuestion;
  answer: InterestAnswerValue | null;
  indexInAssessment: number;
  totalQuestions: number;
  sectionTitle: string;
  canGoPrevious: boolean;
  canGoNext: boolean;
  isLastQuestion: boolean;
};

/**
 * Primary presentation model for the Interest Discovery journey.
 */
export type InterestAssessmentPresentationModel = {
  planPublicId: string;
  studentName: string;
  session: InterestSessionRecord;
  progress: InterestProgressModel;
  sections: readonly InterestSectionProgress[];
  questions: readonly InterestQuestion[];
  currentQuestion: InterestQuestionCardModel | null;
  phase:
    | "introduction"
    | "questions"
    | "review"
    | "completed";
  hero: {
    eyebrow: string;
    headline: string;
    support: string;
    accent: PortalAccentId;
    icon: PortalIconName;
    statusLabel: string;
  };
  reviewItems: readonly {
    questionId: string;
    title: string;
    answerLabel: string;
    sectionTitle: string;
  }[];
  returnHref: string;
  /** Results architecture — empty premium cards until scoring exists. */
  profile: InterestProfileModel;
  widget: InterestDashboardWidgetModel;
  futureFrameworks: readonly InterestFutureFramework[];
};

export type InterestFutureFramework =
  | "RIASEC"
  | "Holland Codes"
  | "Big Five"
  | "Multiple Intelligence"
  | "AI Career Advisor"
  | "University Matching";

export type InterestProfileBand = {
  id: string;
  title: string;
  description: string;
  items: readonly string[];
  emptyTitle: string;
  emptyDescription: string;
};

/**
 * InterestProfile — architecture only (no AI scoring in this phase).
 */
export type InterestProfileModel = {
  status: InterestSessionStatus;
  strongInterests: InterestProfileBand;
  moderateInterests: InterestProfileBand;
  weakInterests: InterestProfileBand;
  learningStyle: InterestProfileBand;
  workEnvironment: InterestProfileBand;
  communicationStyle: InterestProfileBand;
  futureAiPlaceholder: InterestProfileBand;
};

export type InterestDashboardWidgetModel = {
  title: string;
  status: InterestSessionStatus;
  statusLabel: string;
  progressPercent: number;
  completionLabel: string;
  description: string;
  cta: { href: string; label: string } | null;
  accent: PortalAccentId;
  icon: PortalIconName;
};
