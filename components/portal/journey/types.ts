/**
 * Portal Journey — future-ready milestone system.
 * Guidance / Admissions / Homework / Career / Mentoring / AI Coaching
 * plug in via configuration — UI does not hardcode a product domain.
 */

import type { PortalIconName } from "@/components/portal/icons";
import type { PortalAccentId } from "@/components/portal/theme/types";

export const PORTAL_JOURNEY_STATES = [
  "completed",
  "active",
  "waiting",
  "locked",
] as const;

export type PortalJourneyState = (typeof PORTAL_JOURNEY_STATES)[number];

export type PortalJourneyStepAction = {
  href: string;
  label: string;
};

export type PortalJourneyStep = {
  id: string;
  title: string;
  description: string;
  /** Short outcome teaser — hide when unavailable. */
  outcome?: string;
  /** Optional help under the action. */
  helpText?: string;
  /** Optional ETA label — only when real data exists. */
  eta?: string;
  state: PortalJourneyState;
  icon: PortalIconName;
  accent: PortalAccentId;
  action?: PortalJourneyStepAction;
};

export type PortalJourneyHero = {
  eyebrow: string;
  headline: string;
  support: string;
  accent: PortalAccentId;
  icon: PortalIconName;
  cta?: PortalJourneyStepAction;
};

export type PortalJourneyProgress = {
  completedSteps: number;
  totalSteps: number;
  remainingSteps: number;
  percent: number;
  currentStageLabel: string;
};

export type PortalJourneyModel = {
  /** Domain id for analytics / theming hooks (e.g. guidance). */
  journeyId: string;
  title: string;
  subtitle?: string;
  hero: PortalJourneyHero;
  progress: PortalJourneyProgress;
  steps: readonly PortalJourneyStep[];
  /** Optional meta line (e.g. public plan id) — omit when empty. */
  metaLine?: string;
};

export const JOURNEY_STATE_LABEL: Record<PortalJourneyState, string> = {
  completed: "انجام شد",
  active: "اقدام لازم",
  waiting: "در انتظار",
  locked: "قفل — به‌زودی",
};

export const JOURNEY_STATE_ACCENT: Record<PortalJourneyState, PortalAccentId> = {
  completed: "emerald",
  active: "gold",
  waiting: "orange",
  locked: "purple",
};

export const JOURNEY_STATE_ICON: Record<PortalJourneyState, PortalIconName> = {
  completed: "medal",
  active: "spark",
  waiting: "bell",
  locked: "layers",
};

export function buildJourneyProgress(
  steps: readonly PortalJourneyStep[],
): PortalJourneyProgress {
  const totalSteps = steps.length;
  const completedSteps = steps.filter((step) => step.state === "completed").length;
  const remainingSteps = totalSteps - completedSteps;
  const percent =
    totalSteps === 0 ? 0 : Math.round((completedSteps / totalSteps) * 100);
  const current =
    steps.find((step) => step.state === "active" || step.state === "waiting") ??
    steps.find((step) => step.state === "completed");

  return {
    completedSteps,
    totalSteps,
    remainingSteps,
    percent,
    currentStageLabel: current?.title ?? "آغاز مسیر",
  };
}
