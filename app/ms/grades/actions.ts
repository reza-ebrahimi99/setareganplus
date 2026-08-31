"use server";

import { loadGuidanceJourneyPlan } from "@/lib/guidance/journey/plan";
import { parseFinalExamScore } from "@/lib/guidance/office/final-exam";
import {
  loadFinalExamScores,
  saveFinalExamScores,
} from "@/lib/guidance/office/final-exam-store";
import { prisma } from "@/lib/prisma";
import { requireStudentPortalAccess } from "@/lib/portal/auth";

export type FinalExamSaveState = {
  ok?: boolean;
  error?: string;
  average?: number | null;
  complete?: boolean;
  savedAtIso?: string;
};

export async function saveFinalExamScoreAction(
  formData: FormData,
): Promise<FinalExamSaveState> {
  const context = await requireStudentPortalAccess();
  const studentId = context.activeLink.studentId;
  if (!studentId) return { error: "حساب دانش‌آموز فعال نیست." };

  const plan = await loadGuidanceJourneyPlan({
    organizationId: context.organization.id,
    userId: context.user.id,
    studentId,
  });
  if (!plan) return { error: "پرونده هدایت یافت نشد." };

  const subjectId = String(formData.get("subjectId") ?? "").trim();
  const rawScore = String(formData.get("score") ?? "");
  if (!subjectId) return { error: "درس نامعتبر است." };

  const parsed = rawScore.trim() === "" ? null : parseFinalExamScore(rawScore);
  if (rawScore.trim() && parsed === null) {
    return { error: "نمره باید عددی بین ۰ تا ۲۰ باشد." };
  }

  const current = await loadFinalExamScores({
    organizationId: context.organization.id,
    planPublicId: plan.publicId,
    examGroup: plan.examGroup,
  });
  const scores = { ...current.scores, [subjectId]: parsed };
  const saved = await saveFinalExamScores({
    organizationId: context.organization.id,
    actorUserId: context.user.id,
    planId: plan.id,
    planPublicId: plan.publicId,
    examGroup: plan.examGroup,
    scores,
  });

  if (saved.summary.complete && saved.summary.average != null) {
    await prisma.guidancePlan.update({
      where: { id: plan.id },
      data: { highSchoolAverage: saved.summary.average },
    });
  }

  return {
    ok: true,
    average: saved.summary.average,
    complete: saved.summary.complete,
    savedAtIso: new Date().toISOString(),
  };
}
