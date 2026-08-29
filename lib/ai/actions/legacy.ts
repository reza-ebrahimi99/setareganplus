import type { AiAction, AiIntent } from "@/types/ai-actions";
import type { KnowledgeSearchHit } from "@/types/knowledge";

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u200c\u200f]/g, "")
    .trim();
}

/** Existing enrichment intent detector (unchanged behavior). */
export function detectAiIntent(query: string): AiIntent {
  const q = normalize(query);

  if (
    /(ثبت\s*نام.*دبستان|دبستان.*ثبت\s*نام|اول ابتدایی|ستارگان آینده|مدرسه)/.test(
      q,
    )
  ) {
    return "school-registration";
  }
  if (/(قلم\s*چی|قلمچی|کانون|آزمون قلم)/.test(q)) {
    return "ghalamchi";
  }
  if (/(تیزهوشان|نمونه دولتی|استعداد)/.test(q)) {
    return "gifted";
  }
  if (/(باشگاه تابستانی|تابستان|تابستانه)/.test(q)) {
    return "summer-club";
  }
  if (/(درباره|مؤسسه|موسسه|تاریخچه|بنیان)/.test(q)) {
    return "about";
  }
  if (/(شهریه|هزینه|قیمت)/.test(q)) {
    return "tuition";
  }
  if (/(تماس|مشاور|آدرس|تلفن)/.test(q)) {
    return "contact";
  }

  return "general";
}

const ACTION_CATALOG: Record<AiIntent, AiAction[]> = {
  "school-registration": [
    {
      id: "act-pre-reg",
      type: "registration",
      label: "شروع پیش‌ثبت‌نام",
      href: "/pre-registration",
      description: "ثبت درخواست پذیرش و انتخاب خدمت",
      category: "registration",
    },
    {
      id: "act-school",
      type: "page",
      label: "مشاهده دبستان",
      href: "/about",
      description: "آشنایی با دبستان غیردولتی ستارگان آینده",
      category: "school",
    },
    {
      id: "act-contact-school",
      type: "contact",
      label: "تماس با مشاور",
      href: "/contact",
      description: "گفتگو با مشاور مؤسسه",
      category: "contact",
    },
  ],
  ghalamchi: [
    {
      id: "act-ghalamchi-reg",
      type: "registration",
      label: "ثبت‌نام قلم‌چی",
      href: "/ghalamchi/register",
      description: "شروع مسیر ثبت‌نام نمایندگی قلم‌چی",
      category: "ghalamchi",
    },
    {
      id: "act-exams",
      type: "page",
      label: "برنامه آزمون",
      href: "/exams",
      description: "مشاهده خدمات و مسیر آزمون‌ها",
      category: "ghalamchi",
    },
    {
      id: "act-contact-ghalamchi",
      type: "contact",
      label: "تماس",
      href: "/contact",
      category: "contact",
    },
  ],
  gifted: [
    {
      id: "act-courses",
      type: "page",
      label: "کلاس‌های آمادگی",
      href: "/courses",
      description: "مسیر آمادگی تیزهوشان و نمونه دولتی",
      category: "gifted",
    },
    {
      id: "act-consultation",
      type: "page",
      label: "مشاوره",
      href: "/consultation",
      category: "gifted",
    },
    {
      id: "act-achievements",
      type: "page",
      label: "افتخارات",
      href: "/achievements",
      category: "gifted",
    },
  ],
  "summer-club": [
    {
      id: "act-summer-reg",
      type: "registration",
      label: "ثبت‌نام",
      href: "/pre-registration",
      category: "summer-club",
    },
    {
      id: "act-summer-program",
      type: "page",
      label: "مشاهده برنامه",
      href: "/classes",
      description: "برنامه کلاس‌ها و فعالیت‌های مرتبط",
      category: "summer-club",
    },
  ],
  about: [
    {
      id: "act-about",
      type: "page",
      label: "صفحه درباره ما",
      href: "/about",
      category: "about",
    },
    {
      id: "act-about-achievements",
      type: "page",
      label: "افتخارات",
      href: "/achievements",
      category: "about",
    },
  ],
  tuition: [
    {
      id: "act-tuition-contact",
      type: "contact",
      label: "تماس با مشاور",
      href: "/contact",
      description: "استعلام رسمی شهریه",
      category: "tuition",
    },
    {
      id: "act-tuition-reg",
      type: "registration",
      label: "پیش‌ثبت‌نام",
      href: "/pre-registration",
      category: "tuition",
    },
  ],
  contact: [
    {
      id: "act-contact-page",
      type: "contact",
      label: "صفحه تماس",
      href: "/contact",
      category: "contact",
    },
    {
      id: "act-phone-1",
      type: "phone",
      label: "تماس تلفنی",
      href: "tel:02156766772",
      category: "contact",
    },
  ],
  general: [
    {
      id: "act-general-reg",
      type: "registration",
      label: "پیش‌ثبت‌نام",
      href: "/pre-registration",
      category: "general",
    },
    {
      id: "act-general-contact",
      type: "contact",
      label: "تماس با مشاور",
      href: "/contact",
      category: "general",
    },
  ],
};

function knowledgeBoostedActions(
  hits: readonly KnowledgeSearchHit[],
): AiAction[] {
  const categories = new Set(hits.map((hit) => hit.block.category));
  const extra: AiAction[] = [];

  if (categories.has("school")) {
    extra.push({
      id: "know-school",
      type: "page",
      label: "درباره دبستان",
      href: "/about",
      category: "school",
    });
  }
  if (categories.has("ghalamchi")) {
    extra.push({
      id: "know-ghalamchi",
      type: "registration",
      label: "ثبت‌نام قلم‌چی",
      href: "/ghalamchi/register",
      category: "ghalamchi",
    });
  }
  if (categories.has("contact")) {
    extra.push({
      id: "know-contact",
      type: "contact",
      label: "تماس با مشاور",
      href: "/contact",
      category: "contact",
    });
  }

  return extra;
}

/**
 * Legacy enrichment actions (AiAction[]). Kept for existing pipeline compatibility.
 */
export function resolveAiActions(input: {
  query: string;
  knowledgeHits?: readonly KnowledgeSearchHit[];
}): AiAction[] {
  const intent = detectAiIntent(input.query);
  const primary = ACTION_CATALOG[intent] ?? ACTION_CATALOG.general;
  const boosted = knowledgeBoostedActions(input.knowledgeHits ?? []);

  const merged = [...primary, ...boosted];
  const seen = new Set<string>();
  const unique: AiAction[] = [];

  for (const action of merged) {
    const key = `${action.type}:${action.href}:${action.label}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(action);
    if (unique.length >= 4) break;
  }

  return unique;
}
