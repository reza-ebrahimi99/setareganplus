/**
 * Counselor Workspace Phase 2 — rewind journey to a rejected/revision step.
 * Uses GuidancePlan columns and Journey Engine pure helpers only.
 * Does not modify lib/guidance/journey/advance.ts.
 */

import { AuditAction, GuidancePlanStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  computeGuidanceCompletionPercentage,
} from "@/lib/guidance/journey/state";
import {
  guidanceStepCompletedStatus,
  isGuidanceJourneyStepId,
  type GuidanceJourneyStepId,
} from "@/lib/guidance/journey/steps";
type RewindResult = { ok: true } | { ok: false; error: string };

function parseCompletedSteps(raw: unknown): GuidanceJourneyStepId[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isGuidanceJourneyStepId);
}

export function computeRewindPlanState(params: {
  targetStep: GuidanceJourneyStepId;
  currentStep: GuidanceJourneyStepId;
  completedSteps: readonly GuidanceJourneyStepId[];
}): {
  needsRewind: boolean;
  nextCompleted: GuidanceJourneyStepId[];
  completionPercentage: number;
  nextStatusKey: string;
} {
  const needsRewind =
    params.currentStep > params.targetStep ||
    params.completedSteps.includes(params.targetStep);
  const nextCompleted = params.completedSteps.filter(
    (step) => step < params.targetStep,
  );
  const previousStep = (params.targetStep - 1) as number;
  const nextStatusKey =
    params.targetStep === 1
      ? "PRE_REGISTERED"
      : isGuidanceJourneyStepId(previousStep)
        ? guidanceStepCompletedStatus(previousStep)
        : "PRE_REGISTERED";
  return {
    needsRewind,
    nextCompleted,
    completionPercentage: computeGuidanceCompletionPercentage(nextCompleted),
    nextStatusKey,
  };
}

export async function rewindGuidanceJourneyToStep(params: {
  organizationId: string;
  actorUserId: string;
  planId: string;
  publicId: string;
  studentId: string;
  userId: string;
  currentStep: number;
  completedSteps: unknown;
  targetStep: GuidanceJourneyStepId;
}): Promise<RewindResult> {
  const current = isGuidanceJourneyStepId(params.currentStep)
    ? params.currentStep
    : 1;
  const completed = parseCompletedSteps(params.completedSteps);
  const computed = computeRewindPlanState({
    targetStep: params.targetStep,
    currentStep: current,
    completedSteps: completed,
  });
  if (!computed.needsRewind) {
    return { ok: true };
  }

  const { nextCompleted, completionPercentage } = computed;
  const nextStatus =
    GuidancePlanStatus[computed.nextStatusKey as keyof typeof GuidancePlanStatus] ??
    GuidancePlanStatus.PRE_REGISTERED;

  await prisma.$transaction([
    prisma.guidancePlan.update({
      where: { id: params.planId },
      data: {
        currentStep: params.targetStep,
        completedSteps: nextCompleted,
        completionPercentage,
        status: nextStatus,
      },
    }),
    prisma.auditLog.create({
      data: {
        organizationId: params.organizationId,
        actorUserId: params.actorUserId,
        action: AuditAction.GUIDANCE_STEP_REWOUND,
        entityType: "GuidancePlan",
        entityId: params.planId,
        metadata: {
          publicId: params.publicId,
          fromStep: current,
          toStep: params.targetStep,
          previousCompleted: completed,
          nextCompleted,
          completionPercentage,
        },
      },
    }),
  ]);

  return { ok: true };
}
