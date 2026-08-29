/**
 * Deterministic lead scoring (0–100). No AI.
 */

import { LeadScoreBand } from "@/generated/prisma/enums";

export type LeadScoreSignals = {
  hasValidMobile: boolean;
  hasValidEmail: boolean;
  hasNationalId: boolean;
  consultationRequested: boolean;
  bookingCreated: boolean;
  bookingCompleted: boolean;
  hasOverdueTask: boolean;
  noContactDays?: number;
  duplicateSubmissionCount?: number;
  formCompletionRatio?: number; // 0–1
};

export type ScoreBreakdownItem = {
  key: string;
  label: string;
  points: number;
};

export type LeadScoreResult = {
  score: number;
  band: LeadScoreBand;
  breakdown: ScoreBreakdownItem[];
};

const WEIGHTS = {
  validMobile: 10,
  validEmail: 5,
  nationalId: 5,
  consultation: 15,
  bookingCreated: 20,
  bookingCompleted: 15,
  overdueTask: -10,
  noContactPerDay: -2,
  noContactCap: -10,
  duplicatePenalty: -5,
  formCompletionMax: 10,
} as const;

export function scoreBandFromScore(score: number): LeadScoreBand {
  if (score >= 80) return LeadScoreBand.QUALIFIED;
  if (score >= 60) return LeadScoreBand.HOT;
  if (score >= 35) return LeadScoreBand.WARM;
  return LeadScoreBand.COLD;
}

export function clampScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function calculateLeadScore(signals: LeadScoreSignals): LeadScoreResult {
  const breakdown: ScoreBreakdownItem[] = [];

  if (signals.hasValidMobile) {
    breakdown.push({
      key: "mobile",
      label: "موبایل معتبر",
      points: WEIGHTS.validMobile,
    });
  }
  if (signals.hasValidEmail) {
    breakdown.push({
      key: "email",
      label: "ایمیل معتبر",
      points: WEIGHTS.validEmail,
    });
  }
  if (signals.hasNationalId) {
    breakdown.push({
      key: "nationalId",
      label: "کد ملی کامل",
      points: WEIGHTS.nationalId,
    });
  }
  if (signals.consultationRequested) {
    breakdown.push({
      key: "consultation",
      label: "درخواست مشاوره",
      points: WEIGHTS.consultation,
    });
  }
  if (signals.bookingCreated) {
    breakdown.push({
      key: "bookingCreated",
      label: "رزرو ایجادشده",
      points: WEIGHTS.bookingCreated,
    });
  }
  if (signals.bookingCompleted) {
    breakdown.push({
      key: "bookingCompleted",
      label: "رزرو تکمیل‌شده",
      points: WEIGHTS.bookingCompleted,
    });
  }
  if (signals.hasOverdueTask) {
    breakdown.push({
      key: "overdueTask",
      label: "وظیفه سررسید گذشته",
      points: WEIGHTS.overdueTask,
    });
  }
  const noContactDays = signals.noContactDays ?? 0;
  if (noContactDays > 0) {
    const points = Math.max(
      WEIGHTS.noContactCap,
      -noContactDays * Math.abs(WEIGHTS.noContactPerDay),
    );
    breakdown.push({
      key: "noContact",
      label: `بدون تماس (${noContactDays} روز)`,
      points,
    });
  }
  const dup = signals.duplicateSubmissionCount ?? 0;
  if (dup > 1) {
    breakdown.push({
      key: "duplicates",
      label: "ارسال‌های تکراری",
      points: WEIGHTS.duplicatePenalty * (dup - 1),
    });
  }
  const ratio = signals.formCompletionRatio;
  if (typeof ratio === "number" && ratio > 0) {
    const points = Math.round(
      Math.max(0, Math.min(1, ratio)) * WEIGHTS.formCompletionMax,
    );
    if (points > 0) {
      breakdown.push({
        key: "formQuality",
        label: "کیفیت تکمیل فرم",
        points,
      });
    }
  }

  const raw = breakdown.reduce((sum, item) => sum + item.points, 0);
  const score = clampScore(raw);
  return { score, band: scoreBandFromScore(score), breakdown };
}

export const SCORE_BAND_LABELS: Record<LeadScoreBand, string> = {
  COLD: "سرد",
  WARM: "گرم",
  HOT: "داغ",
  QUALIFIED: "واجد شرایط",
};
