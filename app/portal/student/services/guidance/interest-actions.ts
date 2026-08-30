"use server";

/**
 * Interest Discovery — server actions (autosave / resume / complete).
 * Auth + flag + plan ownership. No GuidancePlan schema mutation.
 */

import { revalidatePath } from "next/cache";
import { isGuidanceEnabled } from "@/lib/guidance/feature-flags";
import {
  getInterestQuestionById,
  getNextQuestionNavigation,
  getPreviousQuestionNavigation,
  INTEREST_QUESTIONS,
  isQuestionAnswerValid,
  loadGuidanceInterestSession,
  saveGuidanceInterestSession,
  type InterestAnswerValue,
  type InterestAnswersMap,
  type InterestSectionId,
  type InterestSessionRecord,
} from "@/lib/guidance/interest";
import { loadGuidancePlanForPortalUser } from "@/lib/guidance/portal";
import { requireStudentPortalAccess } from "@/lib/portal/auth";

export type InterestActionResult =
  | { ok: true; session: InterestSessionRecord }
  | { ok: false; error: string };

async function requireInterestContext() {
  const context = await requireStudentPortalAccess();
  const enabled = await isGuidanceEnabled(context.organization.id);
  if (!enabled) {
    return { ok: false as const, error: "سامانه انتخاب رشته فعال نیست." };
  }
  const studentId = context.activeLink.studentId;
  if (!studentId) {
    return { ok: false as const, error: "حساب دانش‌آموزی یافت نشد." };
  }
  const plan = await loadGuidancePlanForPortalUser({
    organizationId: context.organization.id,
    userId: context.user.id,
    studentId,
  });
  if (!plan) {
    return { ok: false as const, error: "پرونده انتخاب رشته یافت نشد." };
  }
  if (!plan.latestFinalGrades) {
    return {
      ok: false as const,
      error: "ابتدا کارنامه نهایی را بارگذاری کن.",
    };
  }
  return {
    ok: true as const,
    context,
    plan,
  };
}

function revalidateInterestPaths() {
  revalidatePath("/portal/student/services/guidance");
}

export async function startInterestAssessmentAction(): Promise<InterestActionResult> {
  const gate = await requireInterestContext();
  if (!gate.ok) return gate;

  const existing = await loadGuidanceInterestSession({
    organizationId: gate.context.organization.id,
    userId: gate.context.user.id,
    planId: gate.plan.id,
    planPublicId: gate.plan.publicId,
  });

  if (existing.status === "completed") {
    return { ok: true, session: existing };
  }

  const first = INTEREST_QUESTIONS[0];
  const session = await saveGuidanceInterestSession({
    organizationId: gate.context.organization.id,
    userId: gate.context.user.id,
    planId: gate.plan.id,
    planPublicId: gate.plan.publicId,
    status: "in_progress",
    currentSectionId: first.sectionId,
    currentQuestionId: first.id,
    answers: existing.answers,
    startedAtIso: existing.startedAtIso ?? new Date().toISOString(),
  });

  revalidateInterestPaths();
  return { ok: true, session };
}

export async function saveInterestAnswerAction(input: {
  questionId: string;
  answer: InterestAnswerValue;
  advance?: boolean;
}): Promise<InterestActionResult> {
  const gate = await requireInterestContext();
  if (!gate.ok) return gate;

  const question = getInterestQuestionById(input.questionId);
  if (!question) {
    return { ok: false, error: "سؤال نامعتبر است." };
  }
  if (!isQuestionAnswerValid(question, input.answer)) {
    return { ok: false, error: "پاسخ کامل نیست." };
  }

  const existing = await loadGuidanceInterestSession({
    organizationId: gate.context.organization.id,
    userId: gate.context.user.id,
    planId: gate.plan.id,
    planPublicId: gate.plan.publicId,
  });

  if (existing.status === "completed") {
    return { ok: false, error: "آزمون قبلاً تکمیل شده است." };
  }

  const answers: InterestAnswersMap = {
    ...existing.answers,
    [input.questionId]: input.answer,
  };

  let currentSectionId: InterestSectionId = question.sectionId;
  let currentQuestionId: string | null = question.id;

  if (input.advance) {
    const next = getNextQuestionNavigation({
      currentSectionId: question.sectionId,
      currentQuestionId: question.id,
      answers,
    });
    currentSectionId = next.sectionId;
    currentQuestionId = next.questionId;
  }

  const session = await saveGuidanceInterestSession({
    organizationId: gate.context.organization.id,
    userId: gate.context.user.id,
    planId: gate.plan.id,
    planPublicId: gate.plan.publicId,
    status: "in_progress",
    currentSectionId,
    currentQuestionId,
    answers,
    startedAtIso: existing.startedAtIso ?? new Date().toISOString(),
  });

  revalidateInterestPaths();
  return { ok: true, session };
}

export async function navigateInterestAssessmentAction(input: {
  direction: "previous" | "next" | "review" | "section";
  sectionId?: InterestSectionId;
  questionId?: string;
}): Promise<InterestActionResult> {
  const gate = await requireInterestContext();
  if (!gate.ok) return gate;

  const existing = await loadGuidanceInterestSession({
    organizationId: gate.context.organization.id,
    userId: gate.context.user.id,
    planId: gate.plan.id,
    planPublicId: gate.plan.publicId,
  });

  if (existing.status === "completed") {
    return { ok: true, session: existing };
  }

  let currentSectionId = existing.currentSectionId;
  let currentQuestionId = existing.currentQuestionId;

  if (input.direction === "previous") {
    const prev = getPreviousQuestionNavigation({
      currentSectionId: existing.currentSectionId,
      currentQuestionId: existing.currentQuestionId,
    });
    currentSectionId = prev.sectionId;
    currentQuestionId = prev.questionId;
  } else if (input.direction === "next") {
    const next = getNextQuestionNavigation({
      currentSectionId: existing.currentSectionId,
      currentQuestionId: existing.currentQuestionId,
      answers: existing.answers,
    });
    currentSectionId = next.sectionId;
    currentQuestionId = next.questionId;
  } else if (input.direction === "review") {
    currentSectionId = "review";
    currentQuestionId = null;
  } else if (input.direction === "section" && input.sectionId) {
    currentSectionId = input.sectionId;
    currentQuestionId = input.questionId ?? null;
  }

  const session = await saveGuidanceInterestSession({
    organizationId: gate.context.organization.id,
    userId: gate.context.user.id,
    planId: gate.plan.id,
    planPublicId: gate.plan.publicId,
    status: existing.status === "not_started" ? "in_progress" : existing.status,
    currentSectionId,
    currentQuestionId,
    answers: existing.answers,
    startedAtIso: existing.startedAtIso ?? new Date().toISOString(),
  });

  revalidateInterestPaths();
  return { ok: true, session };
}

export async function completeInterestAssessmentAction(): Promise<InterestActionResult> {
  const gate = await requireInterestContext();
  if (!gate.ok) return gate;

  const existing = await loadGuidanceInterestSession({
    organizationId: gate.context.organization.id,
    userId: gate.context.user.id,
    planId: gate.plan.id,
    planPublicId: gate.plan.publicId,
  });

  const unanswered = INTEREST_QUESTIONS.filter(
    (q) => !isQuestionAnswerValid(q, existing.answers[q.id]),
  );
  if (unanswered.length > 0) {
    return {
      ok: false,
      error: `هنوز ${unanswered.length} سؤال بدون پاسخ است.`,
    };
  }

  const session = await saveGuidanceInterestSession({
    organizationId: gate.context.organization.id,
    userId: gate.context.user.id,
    planId: gate.plan.id,
    planPublicId: gate.plan.publicId,
    status: "completed",
    currentSectionId: "completed",
    currentQuestionId: null,
    answers: existing.answers,
    startedAtIso: existing.startedAtIso ?? new Date().toISOString(),
    completedAtIso: new Date().toISOString(),
  });

  revalidateInterestPaths();
  return { ok: true, session };
}
