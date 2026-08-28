import { detectAiIntent } from "@/lib/ai/actions";
import type { AiRecommendation } from "@/types/ai-actions";
import type { KnowledgeSearchHit } from "@/types/knowledge";

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u200c\u200f]/g, "")
    .trim();
}

function detectGradeSignals(text: string): {
  elementaryLow: boolean;
  elementaryHigh: boolean;
  girl: boolean;
  boy: boolean;
} {
  const q = normalize(text);
  return {
    elementaryLow:
      /(کلاس\s*(اول|دوم|سوم)|پایه\s*(اول|دوم|سوم)|دبستان)/.test(q),
    elementaryHigh:
      /(کلاس\s*(چهارم|پنجم|ششم)|پایه\s*(چهارم|پنجم|ششم)|تیزهوشان)/.test(q),
    girl: /(دختر|دخترم|فرزند دختر)/.test(q),
    boy: /(پسر|پسرم|فرزند پسر)/.test(q),
  };
}

/**
 * Smart recommendations from page + knowledge + conversation signals.
 */
export function buildRecommendations(input: {
  query: string;
  pathname?: string | null;
  page?: string;
  knowledgeHits?: readonly KnowledgeSearchHit[];
  recentUserTexts?: readonly string[];
}): AiRecommendation[] {
  const corpus = [input.query, ...(input.recentUserTexts ?? [])].join(" ");
  const intent = detectAiIntent(corpus);
  const grade = detectGradeSignals(corpus);
  const items: AiRecommendation[] = [];

  const push = (item: AiRecommendation) => {
    if (items.some((existing) => existing.href === item.href)) return;
    items.push(item);
  };

  if (grade.elementaryHigh || intent === "gifted") {
    push({
      id: "rec-gifted",
      kind: "service",
      label: "تیزهوشان",
      href: "/courses",
      reason: "مسیر آمادگی تیزهوشان و نمونه دولتی",
    });
    push({
      id: "rec-ghalamchi",
      kind: "service",
      label: "قلم‌چی",
      href: "/ghalamchi/register",
      reason: "برنامه آزمون و نمایندگی رسمی",
    });
    push({
      id: "rec-consult",
      kind: "service",
      label: "مشاوره",
      href: "/consultation",
      reason: "راهنمایی انتخاب مسیر آموزشی",
    });
  }

  if (grade.elementaryLow) {
    push({
      id: "rec-school",
      kind: "service",
      label: "دبستان",
      href: "/about",
      reason: "مقطع ابتدایی ستارگان آینده",
    });
    push({
      id: "rec-summer",
      kind: "service",
      label: "باشگاه تابستانی",
      href: "/pre-registration",
      reason: "فعالیت‌های غنی‌سازی فصلی",
    });
  }

  if (intent === "school-registration") {
    push({
      id: "rec-reg",
      kind: "registration",
      label: "پیش‌ثبت‌نام دبستان",
      href: "/pre-registration",
    });
  }

  if (intent === "ghalamchi") {
    push({
      id: "rec-ghalamchi-reg",
      kind: "registration",
      label: "ثبت‌نام قلم‌چی",
      href: "/ghalamchi/register",
    });
    push({
      id: "rec-exams",
      kind: "page",
      label: "آزمون‌ها",
      href: "/exams",
    });
  }

  if (intent === "summer-club") {
    push({
      id: "rec-summer-reg",
      kind: "registration",
      label: "ثبت‌نام باشگاه تابستانی",
      href: "/pre-registration",
    });
  }

  if (intent === "about" || input.page === "about") {
    push({
      id: "rec-about",
      kind: "page",
      label: "درباره ما",
      href: "/about",
    });
    push({
      id: "rec-achievements",
      kind: "page",
      label: "افتخارات",
      href: "/achievements",
    });
  }

  if (input.page === "pre-registration") {
    push({
      id: "rec-pre-reg",
      kind: "registration",
      label: "ادامه پیش‌ثبت‌نام",
      href: "/pre-registration",
    });
    push({
      id: "rec-contact",
      kind: "page",
      label: "تماس با مشاور",
      href: "/contact",
    });
  }

  const categories = new Set(
    (input.knowledgeHits ?? []).map((hit) => hit.block.category),
  );
  if (categories.has("statistics")) {
    push({
      id: "rec-from-stats",
      kind: "page",
      label: "افتخارات",
      href: "/achievements",
      reason: "بر اساس دانش بازیابی‌شده",
    });
  }

  if (items.length === 0) {
    push({
      id: "rec-default-reg",
      kind: "registration",
      label: "پیش‌ثبت‌نام",
      href: "/pre-registration",
    });
    push({
      id: "rec-default-contact",
      kind: "page",
      label: "تماس با مشاور",
      href: "/contact",
    });
  }

  return items.slice(0, 4);
}
