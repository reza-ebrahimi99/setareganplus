/**
 * Portal Intelligence Layer — shared contracts.
 * View models only. No React. No JSX.
 */

import type { PortalIconName } from "@/components/portal/icons";
import type { PortalAccentId } from "@/components/portal/theme/types";
import type { PortalWidgetModule } from "@/components/portal/PortalWidget";

/** Single status vocabulary for all Portal widgets / modules. */
export const PORTAL_INTELLIGENCE_STATUSES = [
  "healthy",
  "needs_attention",
  "blocked",
  "waiting",
  "completed",
] as const;

export type PortalIntelligenceStatus =
  (typeof PORTAL_INTELLIGENCE_STATUSES)[number];

export const PORTAL_WIDGET_PRIORITIES = [
  "primary",
  "secondary",
  "tertiary",
] as const;

export type PortalWidgetPriority = (typeof PORTAL_WIDGET_PRIORITIES)[number];

export type PortalIntelligenceAction = {
  href: string;
  label: string;
};

/**
 * Unified widget contract.
 * Future AI features must emit this shape — never invent per-module props.
 */
export type PortalWidgetModel = {
  id: string;
  title: string;
  status: PortalIntelligenceStatus;
  priority: PortalWidgetPriority;
  description?: string;
  actions?: readonly PortalIntelligenceAction[];
  /** Domain payload consumed by existing presentational widgets. */
  content?: unknown;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  /** Presentation hints (Portal OS) — optional. */
  module?: PortalWidgetModule;
  accent?: PortalAccentId;
  icon?: PortalIconName;
};

export type PortalRecommendationKind =
  | "guidance_start"
  | "guidance_continue"
  | "upload_grades"
  | "complete_profile"
  | "view_assessments"
  | "view_achievements"
  | "experience_continue"
  | "generic";

export type PortalRecommendation = {
  id: string;
  kind: PortalRecommendationKind;
  title: string;
  description: string;
  action: PortalIntelligenceAction;
  status: PortalIntelligenceStatus;
  /** Lower = higher urgency. Rule-based today; AI may replace ranking later. */
  rank: number;
  source: "rules" | "ai";
};

export type PortalRecommendationBundle = {
  primary: PortalRecommendation | null;
  secondary: readonly PortalRecommendation[];
};

export type PortalActivityKind =
  | "assessment_completed"
  | "badge_unlocked"
  | "guidance_progressed"
  | "profile_updated"
  | "portal_login"
  | "experience_event"
  | "ai_event";

export type PortalActivityItem = {
  id: string;
  kind: PortalActivityKind;
  title: string;
  summary?: string;
  occurredAt: Date;
  href?: string;
  status: PortalIntelligenceStatus;
};

export type PortalProgressSnapshot = {
  completedSteps: number;
  totalSteps: number;
  remainingSteps: number;
  percent: number;
  phaseLabel: string;
  status: PortalIntelligenceStatus;
};
