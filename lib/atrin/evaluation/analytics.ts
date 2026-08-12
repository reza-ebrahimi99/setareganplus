/**
 * Local-only evaluation / usage analytics (localStorage).
 * No backend.
 */

import type {
  EvaluationAnalyticsSnapshot,
  EvaluationBenchmarkItem,
  EvaluationSuiteResult,
} from "@/lib/atrin/evaluation/types";
import type {
  EducationGrade,
  EducationSubject,
} from "@/lib/atrin/education/types";

const KEY = "atrin-evaluation-analytics-v1";

const EMPTY: EvaluationAnalyticsSnapshot = {
  updatedAt: 0,
  mostAskedSubjects: [],
  weakestDetection: null,
  commonMistakes: [],
  mostRequestedGrades: [],
  popularTopics: [],
  lastSuite: null,
};

function canUseStorage(): boolean {
  return typeof window !== "undefined";
}

export function loadEvaluationAnalytics(): EvaluationAnalyticsSnapshot {
  if (!canUseStorage()) return { ...EMPTY };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY };
    return { ...EMPTY, ...(JSON.parse(raw) as EvaluationAnalyticsSnapshot) };
  } catch {
    return { ...EMPTY };
  }
}

export function saveEvaluationAnalytics(
  snapshot: EvaluationAnalyticsSnapshot,
): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(snapshot));
  } catch {
    // ignore quota
  }
}

function bump(
  list: Array<{ subject?: string; grade?: string; topic?: string; count: number }>,
  key: "subject" | "grade" | "topic",
  value: string,
): Array<{ subject?: string; grade?: string; topic?: string; count: number }> {
  const next = [...list];
  const idx = next.findIndex((x) => x[key] === value);
  if (idx >= 0) {
    next[idx] = { ...next[idx], count: next[idx].count + 1 };
  } else {
    next.push({ [key]: value, count: 1 });
  }
  return next.sort((a, b) => b.count - a.count).slice(0, 12);
}

/** Record a live student query for local dashboards. */
export function trackEducationUsage(input: {
  subject: EducationSubject;
  grade: EducationGrade;
  topic?: string;
}): EvaluationAnalyticsSnapshot {
  const current = loadEvaluationAnalytics();
  const mostAskedSubjects = bump(
    current.mostAskedSubjects.map((x) => ({
      subject: x.subject,
      count: x.count,
    })),
    "subject",
    input.subject,
  ).map((x) => ({ subject: String(x.subject), count: x.count }));

  const mostRequestedGrades = bump(
    current.mostRequestedGrades.map((x) => ({
      grade: x.grade,
      count: x.count,
    })),
    "grade",
    input.grade == null ? "unknown" : String(input.grade),
  ).map((x) => ({ grade: String(x.grade), count: x.count }));

  const popularTopics = input.topic
    ? bump(
        current.popularTopics.map((x) => ({
          topic: x.topic,
          count: x.count,
        })),
        "topic",
        input.topic,
      ).map((x) => ({ topic: String(x.topic), count: x.count }))
    : current.popularTopics;

  const next: EvaluationAnalyticsSnapshot = {
    ...current,
    updatedAt: Date.now(),
    mostAskedSubjects,
    mostRequestedGrades,
    popularTopics,
  };
  saveEvaluationAnalytics(next);
  return next;
}

export function recordEvaluationSuite(
  suite: EvaluationSuiteResult,
  items: EvaluationBenchmarkItem[],
): EvaluationAnalyticsSnapshot {
  const current = loadEvaluationAnalytics();
  const mistakes = suite.items
    .flatMap((i) => i.suggestions)
    .slice(0, 20);

  const bySubject = new Map<string, number>();
  const byGrade = new Map<string, number>();
  for (const item of items) {
    bySubject.set(
      item.subjectFolder,
      (bySubject.get(item.subjectFolder) ?? 0) + 1,
    );
    byGrade.set(item.gradeFolder, (byGrade.get(item.gradeFolder) ?? 0) + 1);
  }

  const next: EvaluationAnalyticsSnapshot = {
    ...current,
    updatedAt: Date.now(),
    weakestDetection: suite.weakest,
    commonMistakes: mistakes,
    lastSuite: suite,
    mostAskedSubjects: [...bySubject.entries()]
      .map(([subject, count]) => ({ subject, count }))
      .sort((a, b) => b.count - a.count),
    mostRequestedGrades: [...byGrade.entries()]
      .map(([grade, count]) => ({ grade, count }))
      .sort((a, b) => b.count - a.count),
  };
  saveEvaluationAnalytics(next);
  return next;
}
