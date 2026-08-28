/**
 * SLA policy resolver — org config only, no hardcoded clocks in callers.
 */

import type { OpsSlaPolicyValues } from "@/lib/ops/types";
import { prisma } from "@/lib/prisma";

const FALLBACK: OpsSlaPolicyValues = {
  firstContactHours: 24,
  followUpGraceHours: 0,
  registrationNeedsCallHours: 48,
};

export async function resolveOpsSlaPolicy(
  organizationId: string,
): Promise<OpsSlaPolicyValues> {
  const existing = await prisma.opsSlaPolicy.findUnique({
    where: { organizationId },
    select: {
      firstContactHours: true,
      followUpGraceHours: true,
      registrationNeedsCallHours: true,
      isActive: true,
    },
  });
  if (existing?.isActive) {
    return {
      firstContactHours: existing.firstContactHours,
      followUpGraceHours: existing.followUpGraceHours,
      registrationNeedsCallHours: existing.registrationNeedsCallHours,
    };
  }

  try {
    const created = await prisma.opsSlaPolicy.create({
      data: {
        organizationId,
        ...FALLBACK,
        isActive: true,
      },
      select: {
        firstContactHours: true,
        followUpGraceHours: true,
        registrationNeedsCallHours: true,
      },
    });
    return created;
  } catch {
    const raced = await prisma.opsSlaPolicy.findUnique({
      where: { organizationId },
      select: {
        firstContactHours: true,
        followUpGraceHours: true,
        registrationNeedsCallHours: true,
      },
    });
    return raced ?? FALLBACK;
  }
}

export function hoursAgo(hours: number, now = new Date()): Date {
  return new Date(now.getTime() - hours * 3_600_000);
}

export function evaluateFirstContactSla(params: {
  createdAt: Date;
  lastContactAt: Date | null;
  policy: OpsSlaPolicyValues;
  now?: Date;
}): "OK" | "AT_RISK" | "BREACHED" {
  const now = params.now ?? new Date();
  if (params.lastContactAt) return "OK";
  const deadline =
    params.createdAt.getTime() + params.policy.firstContactHours * 3_600_000;
  const atRisk =
    params.createdAt.getTime() +
    params.policy.firstContactHours * 3_600_000 * 0.75;
  if (now.getTime() >= deadline) return "BREACHED";
  if (now.getTime() >= atRisk) return "AT_RISK";
  return "OK";
}

export function evaluateFollowUpSla(params: {
  dueAt: Date;
  policy: OpsSlaPolicyValues;
  now?: Date;
}): "OK" | "AT_RISK" | "BREACHED" {
  const now = params.now ?? new Date();
  const graceMs = params.policy.followUpGraceHours * 3_600_000;
  const breachAt = params.dueAt.getTime() + graceMs;
  if (now.getTime() >= breachAt) return "BREACHED";
  if (now.getTime() >= params.dueAt.getTime()) return "AT_RISK";
  return "OK";
}
