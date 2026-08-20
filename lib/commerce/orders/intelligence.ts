/**
 * Derived operations intelligence — priority, delay, health.
 * Pure functions; persistence stays on timestamps + events.
 */

import type { CommerceOpsStageValue } from "@/lib/commerce/orders/ops-stage";

export const PRODUCTION_DELAY_MS = 3 * 24 * 60 * 60 * 1000;
export const READY_DELAY_MS = 5 * 24 * 60 * 60 * 1000;

export const COMMERCE_OPS_PRIORITIES = [
  "URGENT",
  "OVERDUE",
  "TODAY_PICKUP",
  "VIP",
  "NORMAL",
] as const;

export type CommerceOpsPriority = (typeof COMMERCE_OPS_PRIORITIES)[number];

export const COMMERCE_OPS_PRIORITY_LABELS: Record<CommerceOpsPriority, string> = {
  URGENT: "فوری",
  OVERDUE: "معوق",
  TODAY_PICKUP: "دریافت امروز",
  VIP: "VIP",
  NORMAL: "عادی",
};

export const COMMERCE_OPS_PRIORITY_RANK: Record<CommerceOpsPriority, number> = {
  URGENT: 0,
  OVERDUE: 1,
  TODAY_PICKUP: 2,
  VIP: 3,
  NORMAL: 4,
};

export type CommerceOpsHealthLevel = "healthy" | "warning" | "critical";

export type CommerceOpsDelayKind = "production" | "ready" | null;

export type CommerceOpsIntelligence = {
  priority: CommerceOpsPriority;
  delayKind: CommerceOpsDelayKind;
  delayed: boolean;
  healthScore: number;
  healthLevel: CommerceOpsHealthLevel;
};

function startOfUtcDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function detectCommerceOpsDelay(params: {
  opsStage: CommerceOpsStageValue;
  inProductionAt?: Date | null;
  readyForPickupAt?: Date | null;
  now?: Date;
}): CommerceOpsDelayKind {
  const now = params.now ?? new Date();
  if (params.opsStage === "IN_PRODUCTION" && params.inProductionAt) {
    if (now.getTime() - params.inProductionAt.getTime() > PRODUCTION_DELAY_MS) {
      return "production";
    }
  }
  if (params.opsStage === "READY_FOR_PICKUP" && params.readyForPickupAt) {
    if (now.getTime() - params.readyForPickupAt.getTime() > READY_DELAY_MS) {
      return "ready";
    }
  }
  return null;
}

export function resolveCommerceOpsPriority(params: {
  urgentDelivery: boolean;
  opsVip: boolean;
  delayKind: CommerceOpsDelayKind;
  preferredPickupAt?: Date | null;
  now?: Date;
}): CommerceOpsPriority {
  if (params.urgentDelivery) return "URGENT";
  if (params.delayKind) return "OVERDUE";
  if (params.preferredPickupAt) {
    const now = params.now ?? new Date();
    if (startOfUtcDay(params.preferredPickupAt) === startOfUtcDay(now)) {
      return "TODAY_PICKUP";
    }
  }
  if (params.opsVip) return "VIP";
  return "NORMAL";
}

export function scoreCommerceOpsHealth(params: {
  paymentPaid: boolean;
  delayed: boolean;
  delayKind: CommerceOpsDelayKind;
  rollbackCount: number;
  priority: CommerceOpsPriority;
  completed: boolean;
}): { score: number; level: CommerceOpsHealthLevel } {
  if (params.completed && params.paymentPaid) {
    const penalty = Math.min(20, params.rollbackCount * 8);
    const score = Math.max(70, 100 - penalty);
    return { score, level: score >= 85 ? "healthy" : "warning" };
  }
  let score = 100;
  if (!params.paymentPaid) score -= 25;
  if (params.delayKind === "production") score -= 30;
  else if (params.delayKind === "ready") score -= 20;
  score -= Math.min(25, params.rollbackCount * 10);
  if (params.priority === "URGENT" && params.delayed) score -= 10;
  score = Math.max(0, Math.min(100, score));
  const level: CommerceOpsHealthLevel =
    score >= 80 ? "healthy" : score >= 50 ? "warning" : "critical";
  return { score, level };
}

export function buildCommerceOpsIntelligence(params: {
  opsStage: CommerceOpsStageValue;
  paymentPaid: boolean;
  urgentDelivery: boolean;
  opsVip: boolean;
  preferredPickupAt?: Date | null;
  inProductionAt?: Date | null;
  readyForPickupAt?: Date | null;
  rollbackCount?: number;
  now?: Date;
}): CommerceOpsIntelligence {
  const delayKind = detectCommerceOpsDelay(params);
  const priority = resolveCommerceOpsPriority({
    urgentDelivery: params.urgentDelivery,
    opsVip: params.opsVip,
    delayKind,
    preferredPickupAt: params.preferredPickupAt,
    now: params.now,
  });
  const health = scoreCommerceOpsHealth({
    paymentPaid: params.paymentPaid,
    delayed: Boolean(delayKind),
    delayKind,
    rollbackCount: params.rollbackCount ?? 0,
    priority,
    completed: params.opsStage === "DELIVERED_TO_STUDENT",
  });
  return {
    priority,
    delayKind,
    delayed: Boolean(delayKind),
    healthScore: health.score,
    healthLevel: health.level,
  };
}

export const COMMERCE_OPS_HEALTH_LABELS: Record<CommerceOpsHealthLevel, string> = {
  healthy: "سالم",
  warning: "هشدار",
  critical: "بحرانی",
};

export const COMMERCE_OPS_DELAY_LABELS: Record<Exclude<CommerceOpsDelayKind, null>, string> = {
  production: "تأخیر تولید",
  ready: "تأخیر تحویل",
};
