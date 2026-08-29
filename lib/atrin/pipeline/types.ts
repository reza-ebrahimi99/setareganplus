/**
 * Atrin 3.0 turn intelligence types — brain pipeline (not UI).
 */

import type { AtrinModeId } from "@/content/atrin";
import type { EducationAnalysis, EducationFormattedPlan } from "@/lib/atrin/education/types";
import type { AtrinMemoryFact } from "@/lib/atrin/memory";
import type { WebsiteGuideIntent } from "@/types/action-card";
import type { AiAction } from "@/types/ai-actions";

export type AtrinPrimaryIntent =
  | "admissions"
  | "registration"
  | "school_info"
  | "events"
  | "news"
  | "homework"
  | "teaching"
  | "exam"
  | "study_plan"
  | "career"
  | "parent"
  | "teacher"
  | "math"
  | "physics"
  | "chemistry"
  | "biology"
  | "persian"
  | "english"
  | "general_chat"
  | "unknown";

export type ScoredIntent = {
  intent: AtrinPrimaryIntent;
  confidence: number;
  signals: string[];
};

export type AtrinEntityBag = {
  name: string | null;
  parentName: string | null;
  grade: string | null;
  major: string | null;
  lesson: string | null;
  topic: string | null;
  exam: string | null;
  goal: string | null;
  difficulty: string | null;
  school: string | null;
  course: string | null;
  competition: string | null;
  hoursPerDay: string | null;
};

export type MemoryCategory =
  | "identity"
  | "education"
  | "goals"
  | "preferences"
  | "weaknesses"
  | "strengths"
  | "recent"
  | "plans"
  | "parent"
  | "summary";

export type RankedMemoryFact = AtrinMemoryFact & {
  category: MemoryCategory;
  relevance: number;
};

export type ReasoningDecision = {
  userGoal: string;
  missingInfo: string[];
  shouldAskClarifying: boolean;
  clarifyingQuestions: string[];
  shouldSearchCms: boolean;
  shouldSearchCurriculum: boolean;
  shouldTeach: boolean;
  shouldBuildStudyPlan: boolean;
  shouldRecommendConsultation: boolean;
  responseShape:
    | "teach"
    | "advise"
    | "plan"
    | "school_guide"
    | "clarify"
    | "chat";
  notes: string[];
};

export type StudyPlanDraft = {
  title: string;
  horizon: "daily" | "weekly" | "exam";
  blocks: Array<{ label: string; detail: string }>;
};

export type AtrinTurnContext = {
  query: string;
  modeId: AtrinModeId;
  intents: ScoredIntent[];
  primaryIntent: AtrinPrimaryIntent;
  guideIntent: WebsiteGuideIntent;
  entities: AtrinEntityBag;
  rankedMemory: RankedMemoryFact[];
  education: EducationAnalysis | null;
  educationPlan: EducationFormattedPlan | null;
  educationActive: boolean;
  reasoning: ReasoningDecision;
  studyPlan: StudyPlanDraft | null;
  followUps: AiAction[];
  extraSections: string[];
  conversationSummary: string | null;
};
