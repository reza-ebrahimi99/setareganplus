/**
 * Guidance Journey Engine — GuidancePlan loader/mapper (Phase 1).
 * The only place that reads currentStep/completedSteps off the DB row —
 * every other module must go through this to stay consistent.
 */

import { prisma } from "@/lib/prisma";
import {
  GUIDANCE_JOURNEY_STEP_COUNT,
  isGuidanceJourneyStepId,
  type GuidanceJourneyStepId,
} from "@/lib/guidance/journey/steps";
import type { GuidanceJourneyPlanSnapshot } from "@/lib/guidance/journey/types";

const PLAN_JOURNEY_SELECT = {
  id: true,
  publicId: true,
  organizationId: true,
  userId: true,
  studentId: true,
  examGroup: true,
  status: true,
  currentStep: true,
  completedSteps: true,
  completionPercentage: true,
  quota: true,
  highSchoolAverage: true,
  personalInfoConfirmedAt: true,
  guidancePackageCode: true,
  packagePaidAt: true,
  choicesApprovedAt: true,
  finalApprovedAt: true,
} as const;

type RawPlanRow = {
  id: string;
  publicId: string;
  organizationId: string;
  userId: string;
  studentId: string;
  examGroup: string;
  status: string;
  currentStep: number;
  completedSteps: unknown;
  completionPercentage: number;
  quota: string | null;
  highSchoolAverage: number | null;
  personalInfoConfirmedAt: Date | null;
  guidancePackageCode: string | null;
  packagePaidAt: Date | null;
  choicesApprovedAt: Date | null;
  finalApprovedAt: Date | null;
};

function parseCompletedSteps(raw: unknown): GuidanceJourneyStepId[] {
  if (!Array.isArray(raw)) return [];
  const steps = raw.filter(isGuidanceJourneyStepId);
  return Array.from(new Set(steps)).sort((a, b) => a - b);
}

function clampCurrentStep(raw: number): GuidanceJourneyStepId {
  if (isGuidanceJourneyStepId(raw)) return raw;
  if (raw < 1) return 1;
  return GUIDANCE_JOURNEY_STEP_COUNT as GuidanceJourneyStepId;
}

export function mapGuidanceJourneyPlan(
  row: RawPlanRow,
): GuidanceJourneyPlanSnapshot {
  return {
    id: row.id,
    publicId: row.publicId,
    organizationId: row.organizationId,
    userId: row.userId,
    studentId: row.studentId,
    examGroup: row.examGroup as GuidanceJourneyPlanSnapshot["examGroup"],
    status: row.status,
    currentStep: clampCurrentStep(row.currentStep),
    completedSteps: parseCompletedSteps(row.completedSteps),
    completionPercentage: row.completionPercentage,
    quota: row.quota,
    highSchoolAverage: row.highSchoolAverage,
    personalInfoConfirmedAtIso:
      row.personalInfoConfirmedAt?.toISOString() ?? null,
    guidancePackageCode: row.guidancePackageCode,
    packagePaidAtIso: row.packagePaidAt?.toISOString() ?? null,
    choicesApprovedAtIso: row.choicesApprovedAt?.toISOString() ?? null,
    finalApprovedAtIso: row.finalApprovedAt?.toISOString() ?? null,
  };
}

/** Loads the active plan owned by this portal user (org + user + student scoped). */
export async function loadGuidanceJourneyPlan(params: {
  organizationId: string;
  userId: string;
  studentId: string;
}): Promise<GuidanceJourneyPlanSnapshot | null> {
  const row = await prisma.guidancePlan.findFirst({
    where: {
      organizationId: params.organizationId,
      userId: params.userId,
      studentId: params.studentId,
      deletedAt: null,
    },
    orderBy: { createdAt: "desc" },
    select: PLAN_JOURNEY_SELECT,
  });
  if (!row) return null;
  return mapGuidanceJourneyPlan(row as RawPlanRow);
}

/** Loads a plan by publicId (staff/admin surfaces — org scoped, no ownership check). */
export async function loadGuidanceJourneyPlanByPublicId(params: {
  organizationId: string;
  publicId: string;
}): Promise<GuidanceJourneyPlanSnapshot | null> {
  const row = await prisma.guidancePlan.findFirst({
    where: {
      organizationId: params.organizationId,
      publicId: params.publicId,
      deletedAt: null,
    },
    select: PLAN_JOURNEY_SELECT,
  });
  if (!row) return null;
  return mapGuidanceJourneyPlan(row as RawPlanRow);
}
