"use server";

import { redirect } from "next/navigation";
import type { AssessmentAnswers } from "@/lib/guidance/journey/assessment/scoring";
import {
  finalizeGuidanceInterestAssessment,
  saveGuidanceStep2Draft,
} from "@/lib/guidance/journey/steps/step2-interest-assessment";
import { requireOfficeGuidancePlan } from "@/lib/guidance/office/interest-access";
import { MAJOR_OFFICE_INTEREST_RESULTS } from "@/lib/guidance/office/nav";

export type OfficeInterestFormState = {
  ok?: boolean;
  error?: string;
};

function parseAnswers(source: FormData | AssessmentAnswers): AssessmentAnswers {
  if (!(source instanceof FormData)) return source;
  const answers: AssessmentAnswers = {};
  for (const [key, value] of source.entries()) {
    if (!key.startsWith("q_")) continue;
    const parsed = Number(value);
    if (Number.isFinite(parsed)) answers[key.slice(2)] = parsed;
  }
  return answers;
}

export async function saveOfficeInterestDraftAction(
  answersJson: string,
  currentSectionId?: string,
): Promise<{ ok: boolean }> {
  try {
    const { context, plan } = await requireOfficeGuidancePlan();
    const parsed = JSON.parse(answersJson) as AssessmentAnswers;
    await saveGuidanceStep2Draft({
      organizationId: context.organization.id,
      actorUserId: context.user.id,
      planId: plan.id,
      planPublicId: plan.publicId,
      answers: parsed,
      currentSectionId: currentSectionId ?? null,
    });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function submitOfficeInterestAction(
  _state: OfficeInterestFormState,
  formData: FormData,
): Promise<OfficeInterestFormState> {
  const { context, plan, studentId } = await requireOfficeGuidancePlan();
  const answers = parseAnswers(formData);

  const outcome = await finalizeGuidanceInterestAssessment({
    organizationId: context.organization.id,
    actorUserId: context.user.id,
    studentId,
    planId: plan.id,
    planPublicId: plan.publicId,
    answers,
  });

  if (!outcome.ok) {
    return { error: outcome.error };
  }

  redirect(MAJOR_OFFICE_INTEREST_RESULTS);
}
