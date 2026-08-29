/**
 * Semantic curriculum search — page / exercise / lesson / topic.
 * Low confidence → clarification; never invent catalog entries.
 */

import { getCurriculumCatalog } from "@/lib/atrin/curriculum/registry";
import type {
  CurriculumSearchHit,
  CurriculumSearchQueryKind,
  CurriculumSearchResult,
} from "@/lib/atrin/curriculum/types";
import { normalizeEducationInput } from "@/lib/atrin/education/normalize";

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

function toAsciiDigits(s: string): string {
  return s.replace(/[۰-۹٠-٩]/g, (ch) => {
    const pi = PERSIAN_DIGITS.indexOf(ch);
    if (pi >= 0) return String(pi);
    const ar = "٠١٢٣٤٥٦٧٨٩".indexOf(ch);
    return ar >= 0 ? String(ar) : ch;
  });
}

function detectQueryKind(normalized: string): {
  kind: CurriculumSearchQueryKind;
  page: number | null;
  exercise: number | null;
  lesson: number | null;
  chapter: number | null;
} {
  const pageMatch = normalized.match(
    /(?:صفحه|page)\s*(\d+)|(?:p\.?\s*)(\d+)/i,
  );
  const exerciseMatch = normalized.match(
    /(?:تمرین|exercise|ex)\s*(\d+)/i,
  );
  const lessonMatch = normalized.match(/(?:درس|lesson)\s*(\d+)/i);
  const chapterMatch = normalized.match(/(?:فصل|chapter)\s*(\d+)/i);

  if (pageMatch) {
    return {
      kind: "page",
      page: Number(pageMatch[1] ?? pageMatch[2]),
      exercise: null,
      lesson: null,
      chapter: null,
    };
  }
  if (exerciseMatch) {
    return {
      kind: "exercise",
      page: null,
      exercise: Number(exerciseMatch[1]),
      lesson: null,
      chapter: null,
    };
  }
  if (lessonMatch) {
    return {
      kind: "lesson",
      page: null,
      exercise: null,
      lesson: Number(lessonMatch[1]),
      chapter: null,
    };
  }
  if (chapterMatch) {
    return {
      kind: "chapter",
      page: null,
      exercise: null,
      lesson: null,
      chapter: Number(chapterMatch[1]),
    };
  }

  return {
    kind: "topic",
    page: null,
    exercise: null,
    lesson: null,
    chapter: null,
  };
}

function pageOverlaps(
  start: number | null,
  end: number | null,
  page: number,
): boolean {
  if (start == null || end == null) return false;
  return page >= start && page <= end;
}

/**
 * Search structured curriculum. Does not invent results.
 */
export function searchCurriculum(query: string): CurriculumSearchResult {
  const { normalized: raw } = normalizeEducationInput(query);
  const normalized = toAsciiDigits(raw).trim();
  const catalog = getCurriculumCatalog();
  const detected = detectQueryKind(normalized);
  const hits: CurriculumSearchHit[] = [];

  if (detected.kind === "page" && detected.page != null) {
    for (const item of catalog.items) {
      if (pageOverlaps(item.pageStart, item.pageEnd, detected.page)) {
        hits.push({
          item,
          score: 0.9,
          reason: `page ${detected.page} in ${item.pageStart}-${item.pageEnd}`,
        });
      }
    }
    for (const chapter of catalog.chapters) {
      if (pageOverlaps(chapter.pageStart, chapter.pageEnd, detected.page)) {
        const chapterItems = catalog.items.filter(
          (i) => i.chapterId === chapter.id,
        );
        for (const item of chapterItems) {
          if (!hits.some((h) => h.item.id === item.id)) {
            hits.push({
              item,
              score: 0.7,
              reason: `chapter page range contains ${detected.page}`,
            });
          }
        }
      }
    }
  } else if (detected.kind === "exercise" && detected.exercise != null) {
    const ex = catalog.exercises.filter((e) => e.number === detected.exercise);
    for (const e of ex) {
      const item = catalog.items.find((i) => i.id === e.itemId);
      if (item) {
        hits.push({
          item,
          score: 0.92,
          reason: `exercise ${e.number} → ${item.chapter}`,
        });
      }
    }
    for (const item of catalog.items) {
      if (item.exerciseNumber === detected.exercise) {
        if (!hits.some((h) => h.item.id === item.id)) {
          hits.push({
            item,
            score: 0.85,
            reason: `item exerciseNumber ${detected.exercise}`,
          });
        }
      }
    }
  } else if (detected.kind === "lesson" && detected.lesson != null) {
    for (const lesson of catalog.lessons) {
      if (lesson.order === detected.lesson) {
        for (const itemId of lesson.itemIds) {
          const item = catalog.items.find((i) => i.id === itemId);
          if (item) {
            hits.push({
              item,
              score: 0.88,
              reason: `lesson ${lesson.order}: ${lesson.title}`,
            });
          }
        }
      }
    }
  } else if (detected.kind === "chapter" && detected.chapter != null) {
    for (const chapter of catalog.chapters) {
      if (chapter.order === detected.chapter) {
        for (const item of catalog.items.filter(
          (i) => i.chapterId === chapter.id,
        )) {
          hits.push({
            item,
            score: 0.86,
            reason: `chapter ${chapter.order}: ${chapter.title}`,
          });
        }
      }
    }
  } else {
    const tokens = normalized
      .split(/\s+/)
      .map((t) => t.trim())
      .filter((t) => t.length >= 2);

    for (const item of catalog.items) {
      let score = 0;
      const blob = [
        item.lesson,
        item.chapter,
        item.book,
        ...item.keywords,
        ...item.learningObjectives,
      ]
        .join(" ")
        .toLowerCase();

      for (const token of tokens) {
        const t = token.toLowerCase();
        if (item.keywords.some((k) => k.toLowerCase().includes(t))) {
          score += 0.35;
        } else if (blob.includes(t)) {
          score += 0.15;
        }
      }

      if (score > 0) {
        hits.push({
          item,
          score: Math.min(1, score),
          reason: "keyword/topic match",
        });
      }
    }

    for (const topic of catalog.topics) {
      const match = topic.keywords.some((k) =>
        tokens.some((t) => k.toLowerCase().includes(t.toLowerCase())),
      );
      if (!match) continue;
      const relatedItems = catalog.items.filter((i) =>
        i.relatedTopicIds.includes(topic.id),
      );
      for (const item of relatedItems) {
        if (!hits.some((h) => h.item.id === item.id)) {
          hits.push({
            item,
            score: 0.75,
            reason: `topic node ${topic.label}`,
          });
        }
      }
    }
  }

  hits.sort((a, b) => b.score - a.score);
  const top = hits.slice(0, 8);
  const best = top[0]?.score ?? 0;
  const confidence =
    top.length === 0 ? 0 : Math.min(1, best * (top.length === 1 ? 1 : 0.95));

  const needsClarification = confidence < 0.55 || top.length === 0;
  const clarificationPrompt = needsClarification
    ? top.length === 0
      ? "این مورد را در برنامه درسی پیدا نکردم. پایه، درس و شماره صفحه/تمرین را دقیق‌تر بگو."
      : "چند نتیجه نزدیک پیدا شد. پایه، کتاب یا شماره صفحه را مشخص کن تا دقیق‌تر پیدا کنم."
    : null;

  return {
    query,
    kind: detected.kind === "topic" && top.length === 0 ? "unknown" : detected.kind,
    confidence,
    hits: needsClarification && top.length === 0 ? [] : top,
    needsClarification,
    clarificationPrompt,
  };
}
