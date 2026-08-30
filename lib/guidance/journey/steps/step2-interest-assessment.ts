/**
 * Guidance Journey Engine — Step 2: Interest Assessment (Phase 1).
 * ~50-question quality assessment across 11 dimensions, scored deterministically
 * (no AI/black box) into a personality profile + suitable/unsuitable majors.
 */

import { AuditAction } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { advanceGuidanceJourneyStep } from "@/lib/guidance/journey/advance";
import {
  loadGuidanceStepData,
  saveGuidanceStepData,
} from "@/lib/guidance/journey/step-store";
import {
  ASSESSMENT_QUESTIONS,
} from "@/lib/guidance/journey/assessment/question-bank";
import {
  computeAssessmentResult,
  isAssessmentComplete,
  type AssessmentAnswers,
  type AssessmentResult,
} from "@/lib/guidance/journey/assessment/scoring";

export const STEP2_CATEGORY = "guidance-journey-step2";
export const STEP2_KIND = "guidance-journey-step2";

export type Step2StoredData = {
  answers: AssessmentAnswers;
  result: AssessmentResult | null;
};

function validateStoredData(raw: unknown): Step2StoredData | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (!obj.answers || typeof obj.answers !== "object") return null;
  return {
    answers: obj.answers as AssessmentAnswers,
    result: (obj.result as AssessmentResult | null) ?? null,
  };
}

export async function loadGuidanceStep2Session(params: {
  organizationId: string;
  planPublicId: string;
}): Promise<Step2StoredData> {
  const stored = await loadGuidanceStepData<Step2StoredData>({
    organizationId: params.organizationId,
    category: STEP2_CATEGORY,
    kind: STEP2_KIND,
    planPublicId: params.planPublicId,
    validate: validateStoredData,
  });
  return stored.data ?? { answers: {}, result: null };
}

/** Counselor panel visibility — same store, org-scoped only (no ownership check). */
export async function loadGuidanceStep2ResultForCounselor(params: {
  organizationId: string;
  planPublicId: string;
}): Promise<AssessmentResult | null> {
  const session = await loadGuidanceStep2Session(params);
  return session.result;
}

export async function saveGuidanceStep2Draft(params: {
  organizationId: string;
  actorUserId: string;
  planId: string;
  planPublicId: string;
  answers: AssessmentAnswers;
}): Promise<void> {
  await saveGuidanceStepData<Step2StoredData>({
    organizationId: params.organizationId,
    actorUserId: params.actorUserId,
    category: STEP2_CATEGORY,
    kind: STEP2_KIND,
    planId: params.planId,
    planPublicId: params.planPublicId,
    data: { answers: params.answers, result: null },
    filenamePrefix: "guidance-step2-draft",
  });
}

export type CompleteStep2Result =
  | { ok: true; result: AssessmentResult }
  | { ok: false; error: string };

export async function completeGuidanceStep2(params: {
  organizationId: string;
  actorUserId: string;
  studentId: string;
  planId: string;
  planPublicId: string;
  answers: AssessmentAnswers;
}): Promise<CompleteStep2Result> {
  if (!isAssessmentComplete(params.answers)) {
    return {
      ok: false,
      error: `لطفاً به همه ${ASSESSMENT_QUESTIONS.length} سؤال پاسخ بده.`,
    };
  }

  const result = computeAssessmentResult(params.answers);

  await saveGuidanceStepData<Step2StoredData>({
    organizationId: params.organizationId,
    actorUserId: params.actorUserId,
    category: STEP2_CATEGORY,
    kind: STEP2_KIND,
    planId: params.planId,
    planPublicId: params.planPublicId,
    data: { answers: params.answers, result },
    filenamePrefix: "guidance-step2",
  });

  await prisma.auditLog.create({
    data: {
      organizationId: params.organizationId,
      actorUserId: params.actorUserId,
      action: AuditAction.GUIDANCE_STATUS_CHANGED,
      entityType: "GuidancePlan",
      entityId: params.planId,
      metadata: {
        publicId: params.planPublicId,
        step: 2,
        personalityTitle: result.personality.title,
        suitableMajors: result.suitableMajors.map((m) => m.clusterId),
      },
    },
  });

  const advanced = await advanceGuidanceJourneyStep({
    organizationId: params.organizationId,
    actorUserId: params.actorUserId,
    studentId: params.studentId,
    stepId: 2,
  });

  if (!advanced.ok) {
    return { ok: false, error: advanced.error };
  }

  return { ok: true, result };
}
