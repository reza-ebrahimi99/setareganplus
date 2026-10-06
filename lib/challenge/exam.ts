import { ChallengeAttemptStatus } from "@/generated/prisma/enums";
import { createChallengeToken, privacyHash, seededShuffle } from "@/lib/challenge/crypto";
import { finalizeChallengeTeam } from "@/lib/challenge/results";
import {
  parseChallengeScoringConfig,
  scoreChallengeAttempt,
} from "@/lib/challenge/scoring";
import { prisma } from "@/lib/prisma";

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function optionOrder(value: unknown): Record<string, string[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: Record<string, string[]> = {};
  for (const [key, item] of Object.entries(value)) {
    result[key] = stringArray(item);
  }
  return result;
}

export async function findChallengeExamForParticipant(params: {
  organizationId: string;
  campaignId: string;
  gradeKey: string;
  majorKey: string | null;
}) {
  const exams = await prisma.challengeExam.findMany({
    where: {
      organizationId: params.organizationId,
      campaignId: params.campaignId,
      gradeKey: params.gradeKey,
      isPublished: true,
      deletedAt: null,
      OR: [{ majorKey: params.majorKey }, { majorKey: null }],
    },
    orderBy: { publishedAt: "desc" },
  });
  return (
    exams.find((exam) => exam.majorKey === params.majorKey) ??
    exams.find((exam) => exam.majorKey === null) ??
    null
  );
}

export type StartChallengeAttemptResult =
  | { ok: true; attemptId: string; alreadySubmitted: boolean }
  | { ok: false; error: string };

export async function startChallengeAttempt(params: {
  organizationId: string;
  campaignId: string;
  participantId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<StartChallengeAttemptResult> {
  const participant = await prisma.challengeParticipant.findFirst({
    where: {
      id: params.participantId,
      organizationId: params.organizationId,
      campaignId: params.campaignId,
    },
    include: {
      campaign: true,
      team: {
        select: {
          id: true,
          capacity: true,
          participants: {
            orderBy: [{ isCaptain: "desc" }, { joinedAt: "asc" }, { id: "asc" }],
            select: { id: true },
          },
        },
      },
    },
  });
  if (!participant) return { ok: false, error: "شرکت‌کننده پیدا نشد." };
  if (!participant.team) return { ok: false, error: "تیم شما پیدا نشد." };
  if (participant.team.participants.length < participant.team.capacity) {
    return {
      ok: false,
      error: `آزمون بعد از تکمیل همه ${participant.team.capacity.toLocaleString("fa-IR")} عضو تیم باز می‌شود.`,
    };
  }

  const now = new Date();
  if (
    (participant.campaign.examOpensAt && participant.campaign.examOpensAt > now) ||
    (participant.campaign.examClosesAt && participant.campaign.examClosesAt <= now)
  ) {
    return { ok: false, error: "آزمون در حال حاضر در دسترس نیست." };
  }

  const exam = await findChallengeExamForParticipant({
    organizationId: params.organizationId,
    campaignId: params.campaignId,
    gradeKey: participant.gradeKey,
    majorKey: participant.majorKey,
  });
  if (!exam) return { ok: false, error: "آزمون پایه شما هنوز منتشر نشده است." };

  const attempts = await prisma.challengeAttempt.findMany({
    where: { participantId: participant.id, examId: exam.id },
    orderBy: { attemptNumber: "desc" },
  });
  const submitted = attempts.find(
    (attempt) => attempt.status === ChallengeAttemptStatus.SUBMITTED,
  );
  if (submitted) {
    return { ok: true, attemptId: submitted.id, alreadySubmitted: true };
  }
  const active = attempts.find(
    (attempt) =>
      attempt.status === ChallengeAttemptStatus.IN_PROGRESS &&
      attempt.expiresAt.getTime() + 30_000 >= now.getTime(),
  );
  if (active) return { ok: true, attemptId: active.id, alreadySubmitted: false };

  await prisma.challengeAttempt.updateMany({
    where: {
      participantId: participant.id,
      examId: exam.id,
      status: ChallengeAttemptStatus.IN_PROGRESS,
      expiresAt: { lt: new Date(now.getTime() - 30_000) },
    },
    data: { status: ChallengeAttemptStatus.EXPIRED },
  });
  if (attempts.length >= exam.maxAttempts) {
    return { ok: false, error: "تعداد تلاش مجاز شما به پایان رسیده است." };
  }

  const questionRows = await prisma.challengeQuestion.findMany({
    where: {
      organizationId: params.organizationId,
      examId: exam.id,
      isActive: true,
      deletedAt: null,
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      choices: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: { id: true, isCorrect: true },
      },
    },
  });
  const validQuestions = questionRows.filter(
    (question) =>
      question.choices.length >= 2 &&
      question.choices.filter((choice) => choice.isCorrect).length === 1,
  );
  if (validQuestions.length === 0) {
    return { ok: false, error: "سؤال معتبری برای این آزمون ثبت نشده است." };
  }

  const questionsPerMember = exam.questionLimit ?? 10;
  const requiredBankSize = questionsPerMember * participant.team.capacity;
  if (validQuestions.length < requiredBankSize) {
    return {
      ok: false,
      error: "بانک سؤال این آزمون هنوز در حال تکمیل است.",
    };
  }

  const seed = createChallengeToken(18);
  const teamQuestionPool = exam.randomizeQuestions
    ? seededShuffle(
        validQuestions,
        `challenge-team:${participant.team.id}:exam:${exam.id}`,
      )
    : validQuestions;
  const memberIndex = participant.team.participants.findIndex(
    (member) => member.id === participant.id,
  );
  if (memberIndex < 0) {
    return { ok: false, error: "عضویت شما در تیم پیدا نشد." };
  }
  // A full 50-question bank with five members and ten questions gives each
  // member a disjoint slice. Question order is stable per team; option order
  // is independently randomized for each attempt below.
  const startIndex = memberIndex * questionsPerMember;
  const ordered = teamQuestionPool.slice(
    startIndex,
    startIndex + questionsPerMember,
  );
  const choices: Record<string, string[]> = {};
  for (const question of ordered) {
    const ids = question.choices.map((choice) => choice.id);
    choices[question.id] = exam.randomizeOptions
      ? seededShuffle(ids, `${seed}:${question.id}`)
      : ids;
  }

  const attemptNumber = (attempts[0]?.attemptNumber ?? 0) + 1;
  const expiresAt = new Date(now.getTime() + exam.durationMinutes * 60_000);
  try {
    const created = await prisma.challengeAttempt.create({
      data: {
        organizationId: params.organizationId,
        campaignId: params.campaignId,
        participantId: participant.id,
        examId: exam.id,
        attemptNumber,
        questionOrder: ordered.map((question) => question.id),
        optionOrder: choices,
        startedAt: now,
        expiresAt,
        ipHash: privacyHash(params.ipAddress),
        userAgentHash: privacyHash(params.userAgent),
      },
      select: { id: true },
    });
    return { ok: true, attemptId: created.id, alreadySubmitted: false };
  } catch {
    const concurrent = await prisma.challengeAttempt.findFirst({
      where: {
        participantId: participant.id,
        examId: exam.id,
        status: ChallengeAttemptStatus.IN_PROGRESS,
      },
      orderBy: { attemptNumber: "desc" },
      select: { id: true },
    });
    if (concurrent) {
      return { ok: true, attemptId: concurrent.id, alreadySubmitted: false };
    }
    return { ok: false, error: "شروع آزمون ممکن نشد. دوباره تلاش کنید." };
  }
}

export async function getChallengeAttemptForDisplay(params: {
  attemptId: string;
  participantId: string;
  organizationId: string;
}) {
  const attempt = await prisma.challengeAttempt.findFirst({
    where: {
      id: params.attemptId,
      participantId: params.participantId,
      organizationId: params.organizationId,
    },
    include: {
      exam: { select: { title: true, instructions: true, durationMinutes: true } },
      participant: {
        select: {
          team: {
            select: {
              capacity: true,
              _count: { select: { participants: true } },
            },
          },
        },
      },
    },
  });
  if (!attempt) return null;
  if (
    !attempt.participant.team ||
    attempt.participant.team._count.participants <
      attempt.participant.team.capacity
  ) {
    return null;
  }

  const questionIds = stringArray(attempt.questionOrder);
  const orders = optionOrder(attempt.optionOrder);
  const rows = await prisma.challengeQuestion.findMany({
    where: { id: { in: questionIds }, examId: attempt.examId },
    select: {
      id: true,
      prompt: true,
      imageUrl: true,
      choices: {
        select: { id: true, label: true, imageUrl: true },
      },
    },
  });
  const byId = new Map(rows.map((row) => [row.id, row]));
  const questions = questionIds.flatMap((id, index) => {
    const question = byId.get(id);
    if (!question) return [];
    const choicesById = new Map(question.choices.map((choice) => [choice.id, choice]));
    const orderedChoices = (orders[id] ?? question.choices.map((item) => item.id))
      .flatMap((choiceId) => {
        const choice = choicesById.get(choiceId);
        return choice ? [choice] : [];
      });
    return [{ ...question, choices: orderedChoices, number: index + 1 }];
  });
  return { ...attempt, questions };
}

export type SubmitChallengeAttemptResult =
  | { ok: true; teamUnlocked: boolean }
  | { ok: false; error: string };

export async function submitChallengeAttempt(params: {
  attemptId: string;
  participantId: string;
  organizationId: string;
  answers: Record<string, string>;
}): Promise<SubmitChallengeAttemptResult> {
  const attempt = await prisma.challengeAttempt.findFirst({
    where: {
      id: params.attemptId,
      participantId: params.participantId,
      organizationId: params.organizationId,
    },
    include: {
      campaign: { select: { scoringConfig: true } },
      participant: {
        select: {
          teamId: true,
          team: {
            select: {
              capacity: true,
              _count: { select: { participants: true } },
            },
          },
        },
      },
    },
  });
  if (!attempt) return { ok: false, error: "تلاش آزمون پیدا نشد." };
  if (
    !attempt.participant.team ||
    attempt.participant.team._count.participants <
      attempt.participant.team.capacity
  ) {
    return {
      ok: false,
      error: "ثبت آزمون تا تکمیل همه اعضای تیم امکان‌پذیر نیست.",
    };
  }
  if (attempt.status === ChallengeAttemptStatus.SUBMITTED) {
    return { ok: true, teamUnlocked: false };
  }
  const now = new Date();
  if (
    attempt.status !== ChallengeAttemptStatus.IN_PROGRESS ||
    attempt.expiresAt.getTime() + 30_000 < now.getTime()
  ) {
    await prisma.challengeAttempt.updateMany({
      where: { id: attempt.id, status: ChallengeAttemptStatus.IN_PROGRESS },
      data: { status: ChallengeAttemptStatus.EXPIRED },
    });
    return { ok: false, error: "زمان آزمون به پایان رسیده است." };
  }

  const questionIds = stringArray(attempt.questionOrder);
  const questions = await prisma.challengeQuestion.findMany({
    where: { id: { in: questionIds }, examId: attempt.examId },
    select: {
      id: true,
      choices: { select: { id: true, isCorrect: true } },
    },
  });
  const byQuestion = new Map(questions.map((question) => [question.id, question]));
  let correctCount = 0;
  let wrongCount = 0;
  let unansweredCount = 0;
  const answerRows = questionIds.map((questionId) => {
    const question = byQuestion.get(questionId);
    const selectedId = params.answers[questionId];
    const selected = question?.choices.find((choice) => choice.id === selectedId);
    if (!selected) {
      unansweredCount += 1;
      return {
        organizationId: params.organizationId,
        attemptId: attempt.id,
        questionId,
        choiceId: null,
        isCorrect: null,
        pointsAwarded: 0,
      };
    }
    if (selected.isCorrect) correctCount += 1;
    else wrongCount += 1;
    return {
      organizationId: params.organizationId,
      attemptId: attempt.id,
      questionId,
      choiceId: selected.id,
      isCorrect: selected.isCorrect,
      pointsAwarded: 0,
    };
  });
  const weights = parseChallengeScoringConfig(attempt.campaign.scoringConfig);
  const score = scoreChallengeAttempt({
    correctCount,
    wrongCount,
    unansweredCount,
    weights,
  });
  for (const answer of answerRows) {
    answer.pointsAwarded =
      answer.isCorrect === true
        ? weights.correct
        : answer.isCorrect === false
          ? weights.wrong
          : weights.unanswered;
  }

  try {
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.challengeAttempt.updateMany({
        where: {
          id: attempt.id,
          status: ChallengeAttemptStatus.IN_PROGRESS,
          expiresAt: { gt: new Date(now.getTime() - 30_000) },
        },
        data: {
          status: ChallengeAttemptStatus.SUBMITTED,
          submittedAt: now,
          ...score,
          correctCount,
          wrongCount,
          unansweredCount,
        },
      });
      if (claimed.count !== 1) throw new Error("ATTEMPT_ALREADY_FINALIZED");
      await tx.challengeAnswer.createMany({ data: answerRows });
      await tx.challengeParticipant.update({
        where: { id: params.participantId },
        data: { completedAt: now },
      });
    });
  } catch {
    const submitted = await prisma.challengeAttempt.findUnique({
      where: { id: attempt.id },
      select: { status: true },
    });
    if (submitted?.status !== ChallengeAttemptStatus.SUBMITTED) {
      return { ok: false, error: "ثبت پاسخ‌ها انجام نشد. دوباره تلاش کنید." };
    }
  }

  const teamResult = attempt.participant.teamId
    ? await finalizeChallengeTeam(attempt.participant.teamId)
    : { unlocked: false };
  return { ok: true, teamUnlocked: teamResult.unlocked };
}
