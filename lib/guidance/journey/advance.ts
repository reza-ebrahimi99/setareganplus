/**
 * Guidance Journey Engine — server-side step completion/advance (Phase 1).
 *
 * The ONLY function allowed to move plan.currentStep forward. Every step
 * action must call this after its own server-side validation passes.
 * Re-derives the plan fresh and refuses to advance unless the plan is
 * actually sitting on `stepId` right now — never trusts a client-submitted
 * step number.
 */

import { AuditAction, GuidancePlanStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { loadGuidanceJourneyPlan } from "@/lib/guidance/journey/plan";
import {
  computeGuidanceCompletionPercentage,
  mergeCompletedSteps,
  nextGuidanceStep,
} from "@/lib/guidance/journey/state";
import { guidanceStepCompletedStatus } from "@/lib/guidance/journey/steps";
import type { GuidanceJourneyStepId } from "@/lib/guidance/journey/steps";
import type { GuidanceJourneyPlanSnapshot } from "@/lib/guidance/journey/types";

export type AdvanceGuidanceStepResult =
  | { ok: true; plan: GuidanceJourneyPlanSnapshot }
  | { ok: false; error: string };

/**
 * Marks `stepId` complete and unlocks the next step.
 * Idempotent: if the plan already advanced past `stepId` (e.g. duplicate
 * submit), it is treated as success and the current snapshot is returned.
 */
export async function advanceGuidanceJourneyStep(params: {
  organizationId: string;
  actorUserId: string;
  studentId: string;
  stepId: GuidanceJourneyStepId;
  metadata?: Record<string, unknown>;
}): Promise<AdvanceGuidanceStepResult> {
  const plan = await loadGuidanceJourneyPlan({
    organizationId: params.organizationId,
    userId: params.actorUserId,
    studentId: params.studentId,
  });

  if (!plan) {
    return { ok: false, error: "پرونده انتخاب رشته یافت نشد." };
  }

  if (plan.completedSteps.includes(params.stepId)) {
    // Already advanced — idempotent no-op (double submit / back button).
    return { ok: true, plan };
  }

  if (plan.currentStep !== params.stepId) {
    return {
      ok: false,
      error: "این مرحله در حال حاضر مرحله فعال پرونده شما نیست.",
    };
  }

  const completedSteps = mergeCompletedSteps(plan.completedSteps, params.stepId);
  const completionPercentage = computeGuidanceCompletionPercentage(completedSteps);
  const nextStep = nextGuidanceStep(params.stepId);
  const nextStatus =
    GuidancePlanStatus[guidanceStepCompletedStatus(params.stepId)];

  await prisma.$transaction([
    prisma.guidancePlan.update({
      where: { id: plan.id },
      data: {
        currentStep: nextStep,
        completedSteps,
        completionPercentage,
        status: nextStatus,
      },
    }),
    prisma.auditLog.create({
      data: {
        organizationId: params.organizationId,
        actorUserId: params.actorUserId,
        action: AuditAction.GUIDANCE_STEP_ADVANCED,
        entityType: "GuidancePlan",
        entityId: plan.id,
        metadata: {
          publicId: plan.publicId,
          stepCompleted: params.stepId,
          nextStep,
          completionPercentage,
          ...(params.metadata ?? {}),
        },
      },
    }),
  ]);

  const fresh = await loadGuidanceJourneyPlan({
    organizationId: params.organizationId,
    userId: params.actorUserId,
    studentId: params.studentId,
  });

  if (!fresh) {
    return { ok: false, error: "به‌روزرسانی پرونده ناموفق بود." };
  }

  return { ok: true, plan: fresh };
}
