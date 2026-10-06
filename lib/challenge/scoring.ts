export type ChallengeScoringWeights = {
  correct: number;
  wrong: number;
  unanswered: number;
};

const DEFAULT_WEIGHTS: ChallengeScoringWeights = {
  correct: 3,
  wrong: -1,
  unanswered: 0,
};

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function parseChallengeScoringConfig(
  value: unknown,
): ChallengeScoringWeights {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return DEFAULT_WEIGHTS;
  }
  const record = value as Record<string, unknown>;
  const correct = finiteNumber(record.correct, DEFAULT_WEIGHTS.correct);
  const wrong = finiteNumber(record.wrong, DEFAULT_WEIGHTS.wrong);
  const unanswered = finiteNumber(
    record.unanswered,
    DEFAULT_WEIGHTS.unanswered,
  );
  return {
    correct: Math.min(Math.max(correct, 0.01), 100),
    wrong: Math.min(Math.max(wrong, -100), 0),
    unanswered: Math.min(Math.max(unanswered, -100), 0),
  };
}

export function scoreChallengeAttempt(params: {
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  weights: ChallengeScoringWeights;
}) {
  const rawScore =
    params.correctCount * params.weights.correct +
    params.wrongCount * params.weights.wrong +
    params.unansweredCount * params.weights.unanswered;
  const maxScore =
    (params.correctCount + params.wrongCount + params.unansweredCount) *
    params.weights.correct;
  const percentage =
    maxScore > 0
      ? Math.min(100, Math.max(0, (rawScore / maxScore) * 100))
      : 0;
  return {
    rawScore: Math.round(rawScore * 100) / 100,
    maxScore: Math.round(maxScore * 100) / 100,
    percentage: Math.round(percentage * 100) / 100,
  };
}

