/**
 * Unified next-action card for steps 11–18 (student + counselor surfaces).
 */

import {
  getGuidanceV2StepDefinition,
  guidanceJourneyV2StepPath,
} from "@/lib/guidance/journey-v2/catalog";
import {
  buildLateJourneyTimeline,
  type LateJourneySignals,
} from "@/lib/guidance/journey-v2/late-status";
import type { GuidanceV2PlanSnapshot } from "@/lib/guidance/journey-v2/plan";
import { lastCompletedStep } from "@/lib/guidance/journey-v2/signals";

export type NextActionOwner = "student" | "counselor" | "admin";

export type NextActionState =
  | "ready"
  | "waiting_student"
  | "waiting_counselor"
  | "waiting_admin"
  | "blocked"
  | "overdue"
  | "completed";

export type LateStepProgressStatus =
  | "locked"
  | "ready"
  | "in_progress"
  | "waiting_other"
  | "done"
  | "needs_revision";

export type LateStepProgressChip = {
  step: number;
  shortTitle: string;
  status: LateStepProgressStatus;
};

export type NextActionCard = {
  currentStep: number;
  currentStepTitle: string;
  lastCompletedStep: number | null;
  actionLabel: string;
  owner: NextActionOwner;
  ownerLabel: string;
  state: NextActionState;
  blockerReason: string | null;
  href: string;
  dueLabel: string | null;
  progress11to18: LateStepProgressChip[];
};

export type NextActionLinkContext = {
  audience: "counselor" | "student";
  studentId: string;
  counselorCaseHref: string;
  choicesHref: string;
};

function ownerFromLate(owner: string): NextActionOwner {
  if (owner === "مشاور") return "counselor";
  if (owner === "سامانه") return "admin";
  return "student";
}

function ownerLabelFa(owner: NextActionOwner): string {
  if (owner === "counselor") return "مشاور";
  if (owner === "admin") return "مدیر / سامانه";
  return "دانش‌آموز";
}

function mapToneToProgress(
  step: number,
  currentStep: number,
  tone: string,
  status: string,
): LateStepProgressStatus {
  if (step < 11) return "done";
  if (step > currentStep && status === "در انتظار") return "locked";
  if (status === "تکمیل‌شده") return "done";
  if (status === "نیازمند اصلاح") return "needs_revision";
  if (tone === "waiting") return "waiting_other";
  if (step === currentStep) return "in_progress";
  if (tone === "ready" || tone === "action" || tone === "session" || tone === "confirm") {
    return step === currentStep ? "in_progress" : "ready";
  }
  return "locked";
}

function mapState(
  signals: LateJourneySignals,
  owner: NextActionOwner,
  tone: string,
  blocker: string | null,
): NextActionState {
  if (signals.currentStep > 18 || (signals.currentStep === 18 && signals.sanjeshVerified)) {
    return "completed";
  }
  if (blocker) return "blocked";
  if (!signals.packagePaid) return "blocked";
  if (tone === "waiting" && owner === "counselor") return "waiting_counselor";
  if (tone === "waiting" && owner === "student") return "waiting_student";
  if (owner === "counselor") return "waiting_counselor";
  if (owner === "student") return "ready";
  return "ready";
}

function hrefForStep(
  step: number,
  ctx: NextActionLinkContext,
  signals: LateJourneySignals,
): string {
  if (ctx.audience === "student") {
    return guidanceJourneyV2StepPath(step);
  }
  if (step === 13 || step === 14 || step === 16) {
    const phase =
      step === 13 ? "initial" : step === 14 ? "review" : "final";
    return `${ctx.choicesHref}?phase=${phase}`;
  }
  if (step === 18) {
    return `${ctx.choicesHref}?phase=sanjesh`;
  }
  if (step === 12) {
    return `${ctx.counselorCaseHref}#konkur`;
  }
  return ctx.counselorCaseHref;
}

function blockerReason(signals: LateJourneySignals): string | null {
  if (!signals.packagePaid) {
    return "پرداخت بسته انتخاب رشته انجام نشده است.";
  }
  if (!signals.hasArrangementEntitlement && signals.currentStep >= 13) {
    return "پلن فعلی شامل چیدمان ۱۵۰ انتخاب نیست.";
  }
  return null;
}

export function computeNextActionCard(params: {
  plan: GuidanceV2PlanSnapshot;
  signals: LateJourneySignals;
  links: NextActionLinkContext;
}): NextActionCard {
  const { plan, signals, links } = params;
  const timeline = buildLateJourneyTimeline(signals);
  const current = timeline.find((t) => t.current) ?? timeline.find((t) => t.step === signals.currentStep);
  const displayStep =
    plan.currentStep >= 11 && plan.currentStep <= 18 ? plan.currentStep : 11;
  const stepDef = getGuidanceV2StepDefinition(displayStep);

  const owner = current ? ownerFromLate(current.owner) : "student";
  const blocker = blockerReason(signals);
  const state = current
    ? mapState(signals, owner, current.tone, blocker)
    : "ready";

  const progress11to18: LateStepProgressChip[] = timeline.map((row) => ({
    step: row.step,
    shortTitle: getGuidanceV2StepDefinition(row.step).shortTitle,
    status: mapToneToProgress(row.step, signals.currentStep, row.tone, row.status),
  }));

  const actionLabel = current?.nextAction ?? "ادامه مسیر انتخاب رشته";
  const href = hrefForStep(signals.currentStep, links, signals);

  return {
    currentStep: plan.currentStep,
    currentStepTitle: stepDef.title,
    lastCompletedStep: lastCompletedStep(plan),
    actionLabel,
    owner,
    ownerLabel: ownerLabelFa(owner),
    state,
    blockerReason: blocker,
    href,
    dueLabel: null,
    progress11to18,
  };
}
