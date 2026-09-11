/**
 * V2-only advance helper (18 steps, journeyVersion = 2).
 * Does not change the legacy 12-step advanceGuidanceJourneyStep.
 */

import { AuditAction, GuidancePlanStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  GUIDANCE_V2_STEP_COUNT,
  guidanceV2StepCompletedStatus,
  type GuidanceV2StepId,
} from "@/lib/guidance/journey-v2/catalog";
import {
  loadGuidanceV2Plan,
  type GuidanceV2PlanSnapshot,
} from "@/lib/guidance/journey-v2/plan";
import {
  computeV2CompletionPercentage,
  mergeV2CompletedSteps,
  nextV2Step,
} from "@/lib/guidance/journey-v2/state";

export type AdvanceV2Result =
  | { ok: true; plan: GuidanceV2PlanSnapshot }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function advanceGuidanceJourneyV2Step(params: {
  organizationId: string;
  actorUserId: string;
  studentId: string;
  stepId: GuidanceV2StepId;
  metadata?: Record<string, unknown>;
      extraPlanData?: {
        choicesApprovedAt?: Date;
        choicesApprovedByUserId?: string;
        finalApprovedAt?: Date;
        v2InformedAckVersion?: string | null;
        v2InformedRevisionId?: string | null;
        v2SanjeshStatus?: string | null;
      };
}): Promise<AdvanceV2Result> {
  const plan = await loadGuidanceV2Plan({
    organizationId: params.organizationId,
    studentId: params.studentId,
  });

  if (!plan) {
    return { ok: false, error: "پرونده انتخاب رشته یافت نشد." };
  }
  if (plan.journeyVersion !== 2) {
    return { ok: false, error: "این پرونده روی مسیر ۱۸ مرحله‌ای نیست." };
  }

  if (plan.completedSteps.includes(params.stepId)) {
    return { ok: true, plan };
  }

  if (plan.currentStep !== params.stepId) {
    return {
      ok: false,
      error: "این مرحله در حال حاضر مرحله فعال پرونده شما نیست.",
    };
  }

  const completedSteps = mergeV2CompletedSteps(plan.completedSteps, params.stepId);
  const completionPercentage = computeV2CompletionPercentage(completedSteps);
  const nextStep = nextV2Step(params.stepId);
  const statusKey = guidanceV2StepCompletedStatus(params.stepId);
  const nextStatus = GuidancePlanStatus[statusKey];

  await prisma.$transaction([
    prisma.guidancePlan.update({
      where: { id: plan.id },
      data: {
        currentStep: nextStep,
        completedSteps,
        completionPercentage,
        status: nextStatus,
        ...(params.extraPlanData ?? {}),
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
          journeyVersion: 2,
          stepCompleted: params.stepId,
          nextStep,
          completionPercentage,
          totalSteps: GUIDANCE_V2_STEP_COUNT,
          ...(params.metadata ?? {}),
        },
      },
    }),
  ]);

  const fresh = await loadGuidanceV2Plan({
    organizationId: params.organizationId,
    studentId: params.studentId,
  });
  if (!fresh) return { ok: false, error: "به‌روزرسانی پرونده ناموفق بود." };
  return { ok: true, plan: fresh };
}

export async function reopenV2FromStep(params: {
  organizationId: string;
  actorUserId: string;
  studentId: string;
  resumeAt: GuidanceV2StepId;
  dropFrom: GuidanceV2StepId;
  metadata?: Record<string, unknown>;
}): Promise<AdvanceV2Result> {
  const plan = await loadGuidanceV2Plan({
    organizationId: params.organizationId,
    studentId: params.studentId,
  });
  if (!plan) return { ok: false, error: "پرونده انتخاب رشته یافت نشد." };

  const completedSteps = plan.completedSteps.filter((s) => s < params.dropFrom);
  const completionPercentage = computeV2CompletionPercentage(completedSteps);

  await prisma.$transaction([
    prisma.guidancePlan.update({
      where: { id: plan.id },
      data: {
        currentStep: params.resumeAt,
        completedSteps,
        completionPercentage,
        finalApprovedAt: null,
        v2InformedAckVersion: null,
        v2InformedRevisionId: null,
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
          reopen: true,
          resumeAt: params.resumeAt,
          dropFrom: params.dropFrom,
          ...(params.metadata ?? {}),
        },
      },
    }),
  ]);

  const fresh = await loadGuidanceV2Plan({
    organizationId: params.organizationId,
    studentId: params.studentId,
  });
  if (!fresh) return { ok: false, error: "بازگشایی پرونده ناموفق بود." };
  return { ok: true, plan: fresh };
}
