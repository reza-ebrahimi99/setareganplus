/**
 * Counselor OS Holland read-model.
 * Privileged: shows stored assessment even when the student has not paid.
 * Does not grant entitlement and does not recalculate stored scores.
 */

import {
  HOLLAND_LIKERT_LABELS,
  HOLLAND_PROFILES,
  HOLLAND_TYPE_LABELS,
  hollandScoreIntensity,
  isHollandType,
  type HollandType,
} from "@/lib/guidance/journey-v2/holland/profiles";
import { HOLLAND_QUESTIONS } from "@/lib/guidance/journey-v2/holland/question-bank";
import { formatJalaliDateTimeShort } from "@/lib/datetime/jalali";
import type { CounselorHollandAnswerRow, CounselorHollandView } from "@/lib/counselor-os/view-models";

export type HollandStoredScore = {
  type: HollandType;
  raw: number;
  normalized: number;
};

type QuestionRow = {
  id: string;
  type: HollandType | string;
  text: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

function parseScores(raw: unknown): HollandStoredScore[] {
  if (!Array.isArray(raw)) return [];
  const scores: HollandStoredScore[] = [];
  for (const item of raw) {
    const rec = asRecord(item);
    if (!rec) continue;
    const typeRaw = String(rec.type ?? rec.code ?? rec.id ?? "");
    if (!isHollandType(typeRaw)) continue;
    const rawScore = asNumber(rec.raw) ?? asNumber(rec.rawScore) ?? 0;
    const normalized =
      asNumber(rec.normalized) ?? asNumber(rec.normalizedScore) ?? asNumber(rec.percent) ?? 0;
    scores.push({
      type: typeRaw,
      raw: rawScore,
      normalized: Math.round(normalized),
    });
  }
  return scores;
}

function parseAnswers(raw: unknown): Record<string, number> {
  const rec = asRecord(raw);
  if (!rec) return {};
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(rec)) {
    const n = asNumber(value);
    if (n != null && n >= 1 && n <= 5) out[key] = n;
  }
  return out;
}

function loadProductionQuestionBank(): readonly QuestionRow[] {
  // Static import so production Next.js bundles the real question bank.
  // Local repo may only have an empty compile shim; that file is never deployed.
  return Array.isArray(HOLLAND_QUESTIONS) ? HOLLAND_QUESTIONS : [];
}

function rankScores(scores: HollandStoredScore[]): Array<HollandStoredScore & { rank: number }> {
  const sorted = [...scores].sort((a, b) => {
    if (b.normalized !== a.normalized) return b.normalized - a.normalized;
    if (b.raw !== a.raw) return b.raw - a.raw;
    return a.type.localeCompare(b.type);
  });
  return sorted.map((score, index) => ({ ...score, rank: index + 1 }));
}

function resolveCode(result: Record<string, unknown>, ranked: HollandStoredScore[]): string {
  if (typeof result.code === "string" && result.code.trim()) {
    return result.code.trim().toUpperCase();
  }
  if (typeof result.threeLetterCode === "string" && result.threeLetterCode.trim()) {
    return result.threeLetterCode.trim().toUpperCase();
  }
  if (Array.isArray(result.codes)) {
    return result.codes.map(String).join("");
  }
  return ranked.slice(0, 3).map((s) => s.type).join("");
}

function combinedInterpretation(types: HollandType[]): string {
  if (types.length === 0) return "";
  const profiles = types.map((type) => HOLLAND_PROFILES[type]);
  const titles = types.map((type) => `${HOLLAND_TYPE_LABELS[type]} (${type})`).join("، ");
  const summaries = profiles.map((p) => p.summary).join(" ");
  const fields = [...new Set(profiles.flatMap((p) => [...p.fields]))].join("، ");
  const study = profiles.map((p) => p.studyStyle).join(" ");
  const work = profiles.map((p) => p.workStyle).join(" ");
  return [
    `الگوی ترکیبی ${titles} از داده‌های ثبت‌شده آزمون رغبت‌سنجی به‌دست آمده است.`,
    summaries,
    fields ? `حوزه‌های همسو برای بررسی بیشتر: ${fields}.` : "",
    `سبک یادگیری: ${study}`,
    `سبک کاری: ${work}`,
    "این تفسیر آموزشی است و تشخیص روان‌شناختی یا توصیه بالینی محسوب نمی‌شود.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function answerRows(
  answers: Record<string, number>,
): CounselorHollandAnswerRow[] {
  const bank = loadProductionQuestionBank();
  const likert = (value: number) =>
    HOLLAND_LIKERT_LABELS[value as 1 | 2 | 3 | 4 | 5] ?? String(value);

  if (bank.length > 0) {
    return bank.map((question, index) => {
      const submitted = answers[question.id] ?? null;
      const type = isHollandType(String(question.type))
        ? (question.type as HollandType)
        : null;
      return {
        number: index + 1,
        text: question.text,
        typeCode: type,
        typeLabel: type ? HOLLAND_TYPE_LABELS[type] : null,
        answer: submitted,
        answerLabel: submitted != null ? likert(submitted) : "بدون پاسخ",
      };
    });
  }

  return Object.entries(answers).map(([, value], index) => ({
    number: index + 1,
    text: `سؤال ${index + 1}`,
    typeCode: null,
    typeLabel: null,
    answer: value,
    answerLabel: likert(value),
  }));
}

export function parseStoredHolland(raw: unknown): CounselorHollandView {
  const rec = asRecord(raw);
  if (!rec) {
    return emptyHollandView();
  }

  const answers = parseAnswers(rec.answers);
  const result = asRecord(rec.result);
  const scores = parseScores(result?.scores);
  const completed = Boolean(result && (scores.length > 0 || result.code || result.completedAtIso));

  if (!completed) {
    return {
      ...emptyHollandView(),
      answers: answerRows(answers),
      hasAnswers: Object.keys(answers).length > 0,
    };
  }

  const ranked = rankScores(scores);
  const code = resolveCode(result ?? {}, ranked);
  const codeLetters = code
    .split("")
    .filter(isHollandType)
    .slice(0, 3);
  const completedAtIso =
    typeof result?.completedAtIso === "string" ? result.completedAtIso : null;
  let completedAtLabel: string | null = null;
  if (completedAtIso) {
    const at = new Date(completedAtIso);
    if (!Number.isNaN(at.getTime())) completedAtLabel = formatJalaliDateTimeShort(at);
  }

  const topThree = ranked.slice(0, 3).map((score) => {
    const profile = HOLLAND_PROFILES[score.type];
    return {
      type: score.type,
      typeLabel: HOLLAND_TYPE_LABELS[score.type],
      title: profile.title,
      shortTitle: profile.shortTitle,
      summary: profile.summary,
      environment: profile.environment,
      fields: [...profile.fields],
      strengths: [...profile.strengths],
      watchouts: [...profile.watchouts],
      studyStyle: profile.studyStyle,
      workStyle: profile.workStyle,
      raw: score.raw,
      normalized: score.normalized,
      rank: score.rank,
      intensity: hollandScoreIntensity(score.normalized),
    };
  });

  return {
    completed: true,
    hasAnswers: Object.keys(answers).length > 0,
    completedAtIso,
    completedAtLabel,
    code,
    codeLetters: codeLetters.map((type) => ({
      type,
      label: HOLLAND_TYPE_LABELS[type],
    })),
    scores: ranked.map((score) => ({
      type: score.type,
      typeLabel: HOLLAND_TYPE_LABELS[score.type],
      raw: score.raw,
      normalized: score.normalized,
      rank: score.rank,
      intensity: hollandScoreIntensity(score.normalized),
    })),
    topThree,
    combinedInterpretation: combinedInterpretation(topThree.map((p) => p.type)),
    answers: answerRows(answers),
  };
}

export function emptyHollandView(): CounselorHollandView {
  return {
    completed: false,
    hasAnswers: false,
    completedAtIso: null,
    completedAtLabel: null,
    code: "",
    codeLetters: [],
    scores: [],
    topThree: [],
    combinedInterpretation: null,
    answers: [],
  };
}
