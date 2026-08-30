/**
 * Guidance Initial Analysis Center — presentation contracts only.
 * No JSX. Future AI replaces field values inside this model, not the screen layout.
 */

import type { PortalIconName } from "@/components/portal/icons";
import type { PortalAccentId } from "@/components/portal/theme/types";

/** Analysis pipeline status (document/verification derived — not AI). */
export const ANALYSIS_PIPELINE_STATUSES = [
  "waiting",
  "processing",
  "ready",
  "needs_review",
] as const;

export type AnalysisPipelineStatus =
  (typeof ANALYSIS_PIPELINE_STATUSES)[number];

export type AnalysisCardStatus =
  | AnalysisPipelineStatus
  | "complete"
  | "active"
  | "locked"
  | "info";

export type AnalysisCardAction = {
  href: string;
  label: string;
};

/**
 * Universal analysis card contract:
 * Icon · Title · Status · Description · CTA
 */
export type AnalysisCardModel = {
  id: string;
  icon: PortalIconName;
  title: string;
  status: AnalysisCardStatus;
  statusLabel: string;
  description: string;
  cta: AnalysisCardAction | null;
  accent?: PortalAccentId;
  meta?: string | null;
};

export type AnalysisAcademicSummary = {
  averageLabel: string;
  averageValue: string | null;
  averageHint: string | null;
  examGroupCode: string;
  examGroupLabel: string;
  graduationLabel: string;
  graduationValue: string | null;
  graduationHint: string | null;
  gradeName: string | null;
  schoolYear: string | null;
};

export type AnalysisUploadedGradeVersion = {
  id: string;
  versionNumber: number;
  originalFilename: string;
  verificationStatus: string;
  verificationLabel: string;
  createdAtIso: string;
  isLatest: boolean;
};

export type AnalysisUploadedGrades = {
  latest: AnalysisUploadedGradeVersion | null;
  history: readonly AnalysisUploadedGradeVersion[];
  replaceAction: AnalysisCardAction;
};

export type AnalysisStatusBlock = {
  status: AnalysisPipelineStatus;
  title: string;
  description: string;
  cards: readonly AnalysisCardModel[];
};

export type AnalysisJourneyBlock = {
  completedCount: number;
  currentLabel: string | null;
  remainingCount: number;
  cards: readonly AnalysisCardModel[];
};

export type AnalysisChecklistItem = {
  id: string;
  key: string;
  title: string;
  status: AnalysisCardStatus;
  statusLabel: string;
  description: string;
  cta: AnalysisCardAction | null;
  icon: PortalIconName;
};

export type AnalysisChecklistBlock = {
  items: readonly AnalysisChecklistItem[];
};

/**
 * Insights are architecture-only until a real provider exists.
 * Never invent AI copy here.
 */
export type AnalysisInsightSlot =
  | "rank_estimation"
  | "probability"
  | "ai_explanation"
  | "quota_analysis"
  | "university_fit";

export type AnalysisInsightsBlock = {
  items: readonly AnalysisCardModel[];
  empty: {
    title: string;
    description: string;
  };
  /** Reserved slots for future AI without screen redesign. */
  futureSlots: readonly AnalysisInsightSlot[];
};

export type AnalysisRecommendation = {
  id: string;
  title: string;
  description: string;
  status: AnalysisCardStatus;
  statusLabel: string;
  icon: PortalIconName;
  cta: AnalysisCardAction | null;
  /** Always "rules" in this phase; AI may set "ai" later. */
  source: "rules" | "ai";
  rank: number;
};

export type AnalysisRecommendationsBlock = {
  primary: AnalysisRecommendation | null;
  secondary: readonly AnalysisRecommendation[];
};

/**
 * Single presentation model for the Initial Analysis Center.
 * Screens consume this only — no duplicated calculations in JSX.
 */
export type AnalysisPresentationModel = {
  planPublicId: string;
  studentName: string;
  hero: {
    eyebrow: string;
    headline: string;
    support: string;
    accent: PortalAccentId;
    icon: PortalIconName;
    statusLabel: string;
    primaryCta: AnalysisCardAction;
    secondaryCta: AnalysisCardAction | null;
  };
  academic: AnalysisAcademicSummary;
  grades: AnalysisUploadedGrades;
  analysisStatus: AnalysisStatusBlock;
  journey: AnalysisJourneyBlock;
  checklist: AnalysisChecklistBlock;
  insights: AnalysisInsightsBlock;
  recommendations: AnalysisRecommendationsBlock;
  /** True when grades exist and the Analysis Center should be shown. */
  visible: boolean;
};
