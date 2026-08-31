"use server";

/**
 * Guidance Journey Engine — Step 2 (Interest Assessment) server actions.
 */

import { requireGuidanceJourneyStepAccess } from "@/lib/guidance/journey/guard";
import type { GuidanceStepFormState } from "@/lib/guidance/journey/types";
import {
  completeGuidanceStep2,
  saveGuidanceStep2Draft,
} from "@/lib/guidance/journey/steps/step2-interest-assessment";
import type {
  AssessmentAnswers,
  AssessmentResult,
} from "@/lib/guidance/journey/assessment/scoring";

export type GuidanceStep2FormState = GuidanceStepFormState & {
  result?: AssessmentResult;
  answers?: AssessmentAnswers;
};

function parseAnswers(formData: FormData): AssessmentAnswers {
  const answers: AssessmentAnswers = {};
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("q_")) continue;
    const questionId = key.slice(2);
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      answers[questionId] = parsed;
    }
  }
  return answers;
}

export async function submitGuidanceStep2Action(
  _state: GuidanceStep2FormState,
  formData: FormData,
): Promise<GuidanceStep2FormState> {
  const { context, plan } = await requireGuidanceJourneyStepAccess(2);
  const answers = parseAnswers(formData);

  const outcome = await completeGuidanceStep2({
    organizationId: context.organization.id,
    actorUserId: context.user.id,
    studentId: plan.studentId,
    planId: plan.id,
    planPublicId: plan.publicId,
    answers,
  });

  if (!outcome.ok) {
    return { error: outcome.error };
  }

  return { ok: true, result: outcome.result, answers };
}

export async function saveGuidanceStep2DraftAction(
  answersJson: string,
): Promise<{ ok: boolean }> {
  try {
    const { context, plan } = await requireGuidanceJourneyStepAccess(2);
    const answers = JSON.parse(answersJson) as AssessmentAnswers;
    await saveGuidanceStep2Draft({
      organizationId: context.organization.id,
      actorUserId: context.user.id,
      planId: plan.id,
      planPublicId: plan.publicId,
      answers,
    });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
