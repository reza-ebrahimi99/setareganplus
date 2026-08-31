/**
 * Final-exam score catalog and derivation — client-safe, no I/O.
 * Subjects follow Iranian diploma final exams by exam group.
 */

import type { GuidanceExamGroup } from "@/lib/guidance/types";

export type FinalExamSubjectGroup = "general" | "specialized";

export type FinalExamSubject = {
  id: string;
  label: string;
  group: FinalExamSubjectGroup;
};

export type FinalExamScoreMap = Record<string, number | null>;

export type FinalExamSubjectStatus = "empty" | "valid" | "invalid";

export type FinalExamSubjectView = FinalExamSubject & {
  score: number | null;
  status: FinalExamSubjectStatus;
};

export type FinalExamSummary = {
  entered: number;
  total: number;
  progressPercent: number;
  complete: boolean;
  average: number | null;
  strengths: readonly string[];
  weaknesses: readonly string[];
};

const GENERAL_SUBJECTS: readonly FinalExamSubject[] = [
  { id: "persian", label: "فارسی", group: "general" },
  { id: "arabic", label: "عربی", group: "general" },
  { id: "religion", label: "دین و زندگی", group: "general" },
  { id: "english", label: "زبان انگلیسی", group: "general" },
];

const SPECIALIZED_BY_GROUP: Record<
  GuidanceExamGroup,
  readonly FinalExamSubject[]
> = {
  MATHEMATICS: [
    { id: "calculus", label: "حسابان", group: "specialized" },
    { id: "geometry", label: "هندسه", group: "specialized" },
    { id: "discrete", label: "ریاضیات گسسته", group: "specialized" },
    { id: "physics", label: "فیزیک", group: "specialized" },
    { id: "chemistry", label: "شیمی", group: "specialized" },
  ],
  EXPERIMENTAL_SCIENCES: [
    { id: "biology", label: "زیست‌شناسی", group: "specialized" },
    { id: "chemistry", label: "شیمی", group: "specialized" },
    { id: "physics", label: "فیزیک", group: "specialized" },
    { id: "math", label: "ریاضی", group: "specialized" },
    { id: "earth", label: "زمین‌شناسی", group: "specialized" },
  ],
  HUMANITIES: [
    { id: "math", label: "ریاضی و آمار", group: "specialized" },
    { id: "history", label: "تاریخ", group: "specialized" },
    { id: "geography", label: "جغرافیا", group: "specialized" },
    { id: "sociology", label: "جامعه‌شناسی", group: "specialized" },
    { id: "philosophy", label: "فلسفه و منطق", group: "specialized" },
    { id: "economics", label: "اقتصاد", group: "specialized" },
    { id: "psychology", label: "روان‌شناسی", group: "specialized" },
  ],
  ARTS: [
    { id: "art_history", label: "درک عمومی هنر", group: "specialized" },
    { id: "creative", label: "خلاقیت تصویری", group: "specialized" },
    { id: "design", label: "ترسیم فنی", group: "specialized" },
    { id: "math", label: "ریاضی", group: "specialized" },
  ],
  LANGUAGES: [
    { id: "english_specialized", label: "زبان تخصصی", group: "specialized" },
    { id: "grammar", label: "دستور زبان", group: "specialized" },
    { id: "literature", label: "ادبیات زبان", group: "specialized" },
  ],
};

export const FINAL_EXAM_MIN = 0;
export const FINAL_EXAM_MAX = 20;
export const FINAL_EXAM_STRENGTH = 17;
export const FINAL_EXAM_WEAKNESS = 12;

export function subjectsForExamGroup(
  examGroup: GuidanceExamGroup,
): readonly FinalExamSubject[] {
  return [...GENERAL_SUBJECTS, ...SPECIALIZED_BY_GROUP[examGroup]];
}

export function parseFinalExamScore(raw: string): number | null {
  const normalized = raw.trim().replace(/[۰-۹]/g, (digit) =>
    String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)),
  ).replace(",", ".");
  if (!normalized) return null;
  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;
  if (value < FINAL_EXAM_MIN || value > FINAL_EXAM_MAX) return null;
  return Math.round(value * 100) / 100;
}

export function scoreStatus(score: number | null): FinalExamSubjectStatus {
  if (score === null) return "empty";
  if (score < FINAL_EXAM_MIN || score > FINAL_EXAM_MAX) return "invalid";
  return "valid";
}

export function deriveFinalExamSummary(
  subjects: readonly FinalExamSubject[],
  scores: FinalExamScoreMap,
): FinalExamSummary {
  const views = subjects.map((subject) => scores[subject.id] ?? null);
  const valid = views.filter(
    (score): score is number =>
      typeof score === "number" &&
      score >= FINAL_EXAM_MIN &&
      score <= FINAL_EXAM_MAX,
  );
  const entered = valid.length;
  const total = subjects.length;
  const average =
    entered === 0
      ? null
      : Math.round((valid.reduce((sum, score) => sum + score, 0) / entered) * 100) /
        100;
  const complete = entered === total && total > 0;
  const strengths = subjects
    .filter((subject) => {
      const score = scores[subject.id];
      return typeof score === "number" && score >= FINAL_EXAM_STRENGTH;
    })
    .map((subject) => subject.label);
  const weaknesses = subjects
    .filter((subject) => {
      const score = scores[subject.id];
      return typeof score === "number" && score < FINAL_EXAM_WEAKNESS;
    })
    .map((subject) => subject.label);

  return {
    entered,
    total,
    progressPercent: total === 0 ? 0 : Math.round((entered / total) * 100),
    complete,
    average,
    strengths,
    weaknesses,
  };
}

export function buildFinalExamViews(
  examGroup: GuidanceExamGroup,
  scores: FinalExamScoreMap,
): {
  subjects: readonly FinalExamSubjectView[];
  summary: FinalExamSummary;
} {
  const subjects = subjectsForExamGroup(examGroup);
  const views = subjects.map((subject) => {
    const score = scores[subject.id] ?? null;
    return { ...subject, score, status: scoreStatus(score) };
  });
  return { subjects: views, summary: deriveFinalExamSummary(subjects, scores) };
}

export function normalizeScoreMap(
  examGroup: GuidanceExamGroup,
  raw: unknown,
): FinalExamScoreMap {
  const allowed = new Set(subjectsForExamGroup(examGroup).map((row) => row.id));
  const out: FinalExamScoreMap = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!allowed.has(key)) continue;
    if (value === null || value === "") {
      out[key] = null;
      continue;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      out[key] =
        value >= FINAL_EXAM_MIN && value <= FINAL_EXAM_MAX
          ? Math.round(value * 100) / 100
          : null;
      continue;
    }
    if (typeof value === "string") {
      out[key] = parseFinalExamScore(value);
    }
  }
  return out;
}
