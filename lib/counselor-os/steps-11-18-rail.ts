/**
 * Visual rail states for counselor steps 11–18 workspace (pure).
 */

import type { LateStepProgressStatus } from "@/lib/guidance/journey-v2/next-action";
import type { LateStepStatusView } from "@/lib/guidance/journey-v2/late-status";

export type Steps1118VisualState =
  | "locked"
  | "ready"
  | "in_progress"
  | "waiting_student"
  | "waiting_counselor"
  | "needs_revision"
  | "completed";

export type Steps1118RailItem = {
  step: number;
  title: string;
  visualState: Steps1118VisualState;
  statusLabel: string;
  ownerLabel: string;
};

const STEP_TITLES: Record<number, string> = {
  11: "جلسه اول",
  12: "نتایج کنکور",
  13: "چیدمان اولیه",
  14: "بازبینی دانش‌آموز",
  15: "جلسه دوم",
  16: "فهرست نهایی",
  17: "تأیید آگاهانه",
  18: "ثبت سنجش",
};

function progressToVisual(
  progress: LateStepProgressStatus,
  tone: string,
  owner: string,
): Steps1118VisualState {
  if (progress === "locked") return "locked";
  if (progress === "done") return "completed";
  if (progress === "needs_revision" || tone === "revision") return "needs_revision";
  if (progress === "in_progress") return "in_progress";
  if (progress === "waiting_other") {
    return owner === "مشاور" ? "waiting_counselor" : "waiting_student";
  }
  if (tone === "waiting") {
    return owner === "مشاور" ? "waiting_counselor" : "waiting_student";
  }
  if (tone === "action" || progress === "ready") return "ready";
  return "ready";
}

export function buildSteps1118Rail(params: {
  timeline: readonly LateStepStatusView[];
  currentStep: number;
  progressChips: Array<{ step: number; status: LateStepProgressStatus }>;
}): Steps1118RailItem[] {
  const chipByStep = new Map(params.progressChips.map((c) => [c.step, c.status]));
  return [11, 12, 13, 14, 15, 16, 17, 18].map((step) => {
    const row = params.timeline.find((t) => t.step === step);
    const progress = chipByStep.get(step) ?? (step > params.currentStep ? "locked" : "ready");
    const visualState = row
      ? progressToVisual(progress, row.tone, row.owner)
      : step > params.currentStep
        ? "locked"
        : step === params.currentStep
          ? "in_progress"
          : "completed";
    return {
      step,
      title: STEP_TITLES[step] ?? `مرحله ${step}`,
      visualState,
      statusLabel: row?.status ?? "—",
      ownerLabel: row?.owner ?? "—",
    };
  });
}

export type ChoiceStudioPhase = "initial" | "final" | "review" | "sanjesh";

export function phaseForStep1118(step: number): ChoiceStudioPhase | null {
  if (step === 13) return "initial";
  if (step === 14) return "review";
  if (step === 16 || step === 17) return "final";
  if (step === 18) return "sanjesh";
  return null;
}

export function visualStateLabelFa(state: Steps1118VisualState): string {
  switch (state) {
    case "locked":
      return "قفل‌شده";
    case "ready":
      return "آماده اقدام";
    case "in_progress":
      return "در حال انجام";
    case "waiting_student":
      return "منتظر دانش‌آموز";
    case "waiting_counselor":
      return "منتظر مشاور";
    case "needs_revision":
      return "نیازمند اصلاح";
    case "completed":
      return "تکمیل‌شده";
    default:
      return state;
  }
}
