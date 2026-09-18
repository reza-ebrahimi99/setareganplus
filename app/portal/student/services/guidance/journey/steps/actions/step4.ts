"use server";

import { requireGuidanceV2StepAccess } from "@/lib/guidance/journey-v2/guard";
import { advanceGuidanceJourneyV2Step } from "@/lib/guidance/journey-v2/advance";
import {
  ASSESSMENT_QUESTIONS,
} from "@/lib/guidance/journey/assessment/question-bank";
import {
  computeAssessmentResult,
  isAssessmentComplete,
  type AssessmentAnswers,
  type AssessmentResult,
} from "@/lib/guidance/journey/assessment/scoring";
import {
  loadGuidanceStepData,
  saveGuidanceStepData,
} from "@/lib/guidance/journey/step-store";

export type GuidanceV2Step4FormState = {
  ok?: boolean;
  error?: string;
  result?: AssessmentResult;
  answers?: AssessmentAnswers;
};

const CATEGORY = "guidance-v2-interest-assessment";
const KIND = "guidance-v2-interest-assessment";

function validateAnswers(raw: unknown): AssessmentAnswers | null {
  if (!raw || typeof raw !== "object") return null;

  const source = raw as Record<string, unknown>;
  const answers: AssessmentAnswers = {};

  for (const question of ASSESSMENT_QUESTIONS) {
    const value = source[question.id];
    if (
      typeof value === "number" &&
      Number.isFinite(value) &&
      value >= 1 &&
      value <= 5
    ) {
      answers[question.id] = value;
    }
  }

  return answers;
}

function parseAnswers(formData: FormData): AssessmentAnswers {
  const answers: AssessmentAnswers = {};

  for (const question of ASSESSMENT_QUESTIONS) {
    const value = Number(formData.get(`q_${question.id}`));
    if (Number.isFinite(value) && value >= 1 && value <= 5) {
      answers[question.id] = value;
    }
  }

  return answers;
}

export async function loadGuidanceV2Step4Answers(): Promise<AssessmentAnswers> {
  const { context, plan } = await requireGuidanceV2StepAccess(4);

  const stored = await loadGuidanceStepData<AssessmentAnswers>({
    organizationId: context.organization.id,
    category: CATEGORY,
    kind: KIND,
    planPublicId: plan.publicId,
    validate: validateAnswers,
  });

  return stored.data ?? {};
}

export async function saveGuidanceV2Step4DraftAction(
  answersJson: string,
): Promise<{ ok: boolean }> {
  try {
    const { context, plan } = await requireGuidanceV2StepAccess(4);

    const parsed = JSON.parse(answersJson) as unknown;
    const answers = validateAnswers(parsed);
    if (!answers) return { ok: false };

    await saveGuidanceStepData({
      organizationId: context.organization.id,
      actorUserId: context.user.id,
      category: CATEGORY,
      kind: KIND,
      planId: plan.id,
      planPublicId: plan.publicId,
      data: answers,
      filenamePrefix: "guidance-v2-interest",
    });

    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function submitGuidanceV2Step4Action(
  _state: GuidanceV2Step4FormState,
  formData: FormData,
): Promise<GuidanceV2Step4FormState> {
  try {
    const { context, plan } = await requireGuidanceV2StepAccess(4);
    const answers = parseAnswers(formData);

    if (!isAssessmentComplete(answers)) {
      return { error: "لطفاً به همه ۶۰ سؤال پاسخ بده." };
    }

    const result = computeAssessmentResult(answers);

    await saveGuidanceStepData({
      organizationId: context.organization.id,
      actorUserId: context.user.id,
      category: CATEGORY,
      kind: KIND,
      planId: plan.id,
      planPublicId: plan.publicId,
      data: answers,
      filenamePrefix: "guidance-v2-interest",
    });

    await advanceGuidanceJourneyV2Step({
      organizationId: context.organization.id,
      actorUserId: context.user.id,
      studentId: plan.studentId,
      stepId: 4,
    });

    return {
      ok: true,
      result,
      answers,
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "ثبت نتیجه آزمون انجام نشد.",
    };
  }
}
