/**
 * InterestAssessmentPresentationModel builder — pure mapping, no JSX.
 */

import { toPersianDigits } from "@/lib/persian";
import {
  INTEREST_QUESTIONS,
  INTEREST_SCORED_SECTION_IDS,
  INTEREST_SECTION_META,
  getInterestQuestionById,
} from "@/lib/guidance/interest/question-bank";
import { buildInterestProfileArchitecture } from "@/lib/guidance/interest/profile";
import type {
  InterestAnswerValue,
  InterestAnswersMap,
  InterestAssessmentPresentationModel,
  InterestDashboardWidgetModel,
  InterestProgressModel,
  InterestQuestion,
  InterestQuestionCardModel,
  InterestSectionId,
  InterestSectionProgress,
  InterestSessionRecord,
} from "@/lib/guidance/interest/types";

const SECTION_ICONS: Record<
  InterestSectionId,
  InterestSectionProgress["icon"]
> = {
  introduction: "spark",
  career_interests: "trophy",
  learning_style: "book",
  personality: "user",
  working_preferences: "layers",
  review: "clipboard",
  completed: "medal",
};

const SECTION_ACCENTS: Record<
  InterestSectionId,
  InterestSectionProgress["accent"]
> = {
  introduction: "purple",
  career_interests: "gold",
  learning_style: "blue",
  personality: "teal",
  working_preferences: "orange",
  review: "blue",
  completed: "emerald",
};

const INTEREST_HREF = "/portal/student/services/guidance?view=interest";
const GUIDANCE_HOME = "/portal/student/services/guidance";

function answerLabel(
  question: InterestQuestion,
  answer: InterestAnswerValue | null,
): string {
  if (!answer) return "بدون پاسخ";
  switch (answer.kind) {
    case "single":
    case "card":
    case "image": {
      const opt = question.options.find((o) => o.id === answer.optionId);
      return opt?.label ?? answer.optionId;
    }
    case "multiple": {
      const labels = answer.optionIds
        .map((id) => question.options.find((o) => o.id === id)?.label ?? id)
        .filter(Boolean);
      return labels.length ? labels.join("، ") : "بدون پاسخ";
    }
    case "scale":
      return toPersianDigits(answer.value);
    case "priority":
    case "drag_drop": {
      const labels = answer.orderedOptionIds
        .map((id) => question.options.find((o) => o.id === id)?.label ?? id)
        .filter(Boolean);
      return labels.length ? labels.join(" ← ") : "بدون پاسخ";
    }
    default:
      return "بدون پاسخ";
  }
}

function isAnswered(
  question: InterestQuestion,
  answers: InterestAnswersMap,
): boolean {
  const answer = answers[question.id];
  if (!answer) return false;
  switch (answer.kind) {
    case "multiple":
      return answer.optionIds.length > 0;
    case "priority":
    case "drag_drop":
      return answer.orderedOptionIds.length > 0;
    case "scale":
      return Number.isFinite(answer.value);
    case "single":
    case "card":
    case "image":
      return Boolean(answer.optionId);
    default:
      return false;
  }
}

function buildSectionProgress(
  session: InterestSessionRecord,
): InterestSectionProgress[] {
  const currentOrder = INTEREST_SECTION_META[session.currentSectionId].order;

  return INTEREST_SCORED_SECTION_IDS.map((id) => {
    const meta = INTEREST_SECTION_META[id];
    const questions = INTEREST_QUESTIONS.filter((q) => q.sectionId === id);
    const answeredCount = questions.filter((q) =>
      isAnswered(q, session.answers),
    ).length;
    const percent =
      questions.length === 0
        ? 0
        : Math.round((answeredCount / questions.length) * 100);

    let state: InterestSectionProgress["state"] = "upcoming";
    if (session.status === "completed") {
      state = "complete";
    } else if (session.status === "not_started") {
      state = "upcoming";
    } else if (id === session.currentSectionId) {
      state = "current";
    } else if (answeredCount === questions.length && questions.length > 0) {
      state = "complete";
    } else if (meta.order < currentOrder) {
      state = answeredCount > 0 ? "complete" : "upcoming";
    } else {
      state = "locked";
    }

    return {
      id,
      title: meta.title,
      description: meta.description,
      icon: SECTION_ICONS[id],
      accent: SECTION_ACCENTS[id],
      questionCount: questions.length,
      answeredCount,
      percent,
      state,
    };
  });
}

function buildProgress(session: InterestSessionRecord): InterestProgressModel {
  const totalQuestions = INTEREST_QUESTIONS.length;
  const answeredCount = INTEREST_QUESTIONS.filter((q) =>
    isAnswered(q, session.answers),
  ).length;
  const remainingQuestions = Math.max(0, totalQuestions - answeredCount);
  const overallPercent =
    totalQuestions === 0
      ? 0
      : Math.round((answeredCount / totalQuestions) * 100);
  const estimatedRemainingSeconds = INTEREST_QUESTIONS.filter(
    (q) => !isAnswered(q, session.answers),
  ).reduce((sum, q) => sum + (q.estimatedSeconds ?? 20), 0);
  const minutes = Math.max(1, Math.ceil(estimatedRemainingSeconds / 60));

  return {
    overallPercent: session.status === "completed" ? 100 : overallPercent,
    answeredCount,
    totalQuestions,
    remainingQuestions: session.status === "completed" ? 0 : remainingQuestions,
    estimatedRemainingSeconds,
    estimatedRemainingLabel:
      session.status === "completed"
        ? "تمام شد"
        : `حدود ${toPersianDigits(minutes)} دقیقه باقی‌مانده`,
    sections: buildSectionProgress(session),
    ringPercent: session.status === "completed" ? 100 : overallPercent,
  };
}

function resolvePhase(
  session: InterestSessionRecord,
): InterestAssessmentPresentationModel["phase"] {
  if (session.status === "completed") return "completed";
  if (session.currentSectionId === "introduction") return "introduction";
  if (session.currentSectionId === "review") return "review";
  if (session.currentSectionId === "completed") return "completed";
  return "questions";
}

function buildCurrentQuestion(
  session: InterestSessionRecord,
): InterestQuestionCardModel | null {
  if (session.status === "completed") return null;
  if (
    session.currentSectionId === "introduction" ||
    session.currentSectionId === "review" ||
    session.currentSectionId === "completed"
  ) {
    return null;
  }

  const sectionQuestions = INTEREST_QUESTIONS.filter(
    (q) => q.sectionId === session.currentSectionId,
  );
  if (sectionQuestions.length === 0) return null;

  let question =
    (session.currentQuestionId
      ? getInterestQuestionById(session.currentQuestionId)
      : null) ?? sectionQuestions[0];

  if (question.sectionId !== session.currentSectionId) {
    question = sectionQuestions[0];
  }

  const indexInAssessment = INTEREST_QUESTIONS.findIndex(
    (q) => q.id === question.id,
  );
  const globalIndex = indexInAssessment >= 0 ? indexInAssessment : 0;
  const sectionIndex = sectionQuestions.findIndex((q) => q.id === question.id);

  return {
    question,
    answer: session.answers[question.id] ?? null,
    indexInAssessment: globalIndex + 1,
    totalQuestions: INTEREST_QUESTIONS.length,
    sectionTitle: INTEREST_SECTION_META[question.sectionId].title,
    canGoPrevious: globalIndex > 0 || session.currentSectionId !== "career_interests",
    canGoNext: true,
    isLastQuestion: globalIndex >= INTEREST_QUESTIONS.length - 1,
  };
}

function buildWidget(
  session: InterestSessionRecord,
  progress: InterestProgressModel,
): InterestDashboardWidgetModel {
  const status = session.status;
  const statusLabel =
    status === "completed"
      ? "تکمیل‌شده"
      : status === "in_progress"
        ? "در حال انجام"
        : "شروع نشده";

  return {
    title: "آزمون رغبت",
    status,
    statusLabel,
    progressPercent: progress.overallPercent,
    completionLabel:
      status === "completed"
        ? "۱۰۰٪ تکمیل"
        : `${toPersianDigits(progress.answeredCount)} از ${toPersianDigits(progress.totalQuestions)} پاسخ`,
    description:
      status === "completed"
        ? "پروفایل رغبت آماده معماری نتایج است."
        : status === "in_progress"
          ? "ادامه بده؛ پاسخ‌ها خودکار ذخیره می‌شوند."
          : "کشف علایق و سبک یادگیری — قدم‌به‌قدم و کوتاه.",
    cta: {
      href: INTEREST_HREF,
      label:
        status === "completed"
          ? "مشاهده نتایج"
          : status === "in_progress"
            ? "ادامه آزمون"
            : "شروع آزمون رغبت",
    },
    accent: "purple",
    icon: "spark",
  };
}

export function formatInterestAnswerLabel(
  questionId: string,
  answers: InterestAnswersMap,
): string {
  const question = getInterestQuestionById(questionId);
  if (!question) return "—";
  return answerLabel(question, answers[questionId] ?? null);
}

export function buildInterestAssessmentPresentationModel(input: {
  session: InterestSessionRecord;
  studentName: string;
}): InterestAssessmentPresentationModel {
  const { session, studentName } = input;
  const progress = buildProgress(session);
  const phase = resolvePhase(session);
  const currentQuestion = buildCurrentQuestion(session);
  const profile = buildInterestProfileArchitecture(session.status);
  const widget = buildWidget(session, progress);

  const reviewItems = INTEREST_QUESTIONS.map((q) => ({
    questionId: q.id,
    title: q.title,
    answerLabel: answerLabel(q, session.answers[q.id] ?? null),
    sectionTitle: INTEREST_SECTION_META[q.sectionId].title,
  }));

  const heroByPhase = {
    introduction: {
      eyebrow: "کشف رغبت",
      headline: `${studentName}، آماده‌ای خودت را بهتر بشناسی؟`,
      support:
        "چند بخش کوتاه — بدون عجله. هر پاسخ ذخیره می‌شود و بعداً ادامه می‌دهی.",
      accent: "purple" as const,
      icon: "spark" as const,
      statusLabel: "آغاز سفر",
    },
    questions: {
      eyebrow: currentQuestion?.sectionTitle ?? "آزمون رغبت",
      headline: currentQuestion?.question.title ?? "ادامه آزمون",
      support: currentQuestion?.question.description ?? "",
      accent: "purple" as const,
      icon: "spark" as const,
      statusLabel: `${toPersianDigits(progress.answeredCount)} / ${toPersianDigits(progress.totalQuestions)}`,
    },
    review: {
      eyebrow: "بازبینی",
      headline: "یک نگاه نهایی به پاسخ‌ها",
      support: "قبل از ثبت، می‌توانی به هر سؤال برگردی.",
      accent: "blue" as const,
      icon: "clipboard" as const,
      statusLabel: "تقریباً تمام",
    },
    completed: {
      eyebrow: "آفرین",
      headline: "آزمون رغبت ثبت شد",
      support: "به مسیر انتخاب رشته برگرد — پروفایل رغبت به‌تدریج کامل می‌شود.",
      accent: "emerald" as const,
      icon: "medal" as const,
      statusLabel: "تکمیل‌شده",
    },
  };

  return {
    planPublicId: session.planPublicId,
    studentName,
    session,
    progress,
    sections: progress.sections,
    questions: INTEREST_QUESTIONS,
    currentQuestion,
    phase,
    hero: heroByPhase[phase],
    reviewItems,
    returnHref: GUIDANCE_HOME,
    profile,
    widget,
    futureFrameworks: [],
  };
}

export function buildInterestDashboardWidget(
  session: InterestSessionRecord,
): InterestDashboardWidgetModel {
  return buildWidget(session, buildProgress(session));
}

/** Helpers for navigation math (shared by server actions / client). */
export function getNextQuestionNavigation(input: {
  currentSectionId: InterestSectionId;
  currentQuestionId: string | null;
  answers: InterestAnswersMap;
}): {
  sectionId: InterestSectionId;
  questionId: string | null;
  phase: "questions" | "review";
} {
  const all = INTEREST_QUESTIONS;
  let idx = input.currentQuestionId
    ? all.findIndex((q) => q.id === input.currentQuestionId)
    : all.findIndex((q) => q.sectionId === input.currentSectionId);
  if (idx < 0) idx = 0;
  const next = all[idx + 1];
  if (!next) {
    return { sectionId: "review", questionId: null, phase: "review" };
  }
  return {
    sectionId: next.sectionId,
    questionId: next.id,
    phase: "questions",
  };
}

export function getPreviousQuestionNavigation(input: {
  currentSectionId: InterestSectionId;
  currentQuestionId: string | null;
}): {
  sectionId: InterestSectionId;
  questionId: string | null;
} {
  const all = INTEREST_QUESTIONS;
  let idx = input.currentQuestionId
    ? all.findIndex((q) => q.id === input.currentQuestionId)
    : all.findIndex((q) => q.sectionId === input.currentSectionId);
  if (idx <= 0) {
    return { sectionId: "introduction", questionId: null };
  }
  const prev = all[idx - 1];
  return { sectionId: prev.sectionId, questionId: prev.id };
}

export function isQuestionAnswerValid(
  question: InterestQuestion,
  answer: InterestAnswerValue | null | undefined,
): boolean {
  if (!question.required) return true;
  if (!answer) return false;
  return isAnswered(question, { [question.id]: answer });
}
