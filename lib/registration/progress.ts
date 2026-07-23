import { WIZARD_TOTAL_STEPS } from "@/lib/registration/status";

export function computeCompletionPercent(
  lastCompletedStep: number,
  totalSteps: number = WIZARD_TOTAL_STEPS,
): number {
  if (totalSteps <= 0) return 0;
  const clamped = Math.max(0, Math.min(lastCompletedStep, totalSteps));
  return Math.round((clamped / totalSteps) * 100);
}

export function touchActivityNow(): Date {
  return new Date();
}
