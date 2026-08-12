import type { WebsiteGuideIntent } from "@/types/action-card";

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u200c\u200f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Map enrichment / CRM-like intent strings → website guide intents.
 * Does not import CRM modules.
 */
export function mapExternalIntent(
  intent: string | null | undefined,
): WebsiteGuideIntent | null {
  if (!intent) return null;
  const key = intent
    .trim()
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/\s+/g, "-");

  const map: Record<string, WebsiteGuideIntent> = {
    tuition: "tuition",
    "ask-tuition": "tuition",
    "pre-registration": "pre_registration",
    "school-registration": "pre_registration",
    "ask-registration": "pre_registration",
    ghalamchi: "ghalamchi",
    "ask-qalamchi": "ghalamchi",
    about: "about_school",
    "about-school": "about_school",
    "ask-school": "about_school",
    contact: "contact",
    "ask-contact": "contact",
    "ask-location": "contact",
    consultation: "consultation",
    "ask-consultation": "consultation",
    gifted: "courses",
    courses: "courses",
    "ask-courses": "courses",
    "summer-club": "pre_registration",
    "ask-summer": "pre_registration",
    exams: "exams",
    "ask-exam": "exams",
    achievements: "achievements",
    gallery: "gallery",
    staros: "staros",
    "ask-staros": "staros",
    general: "general",
    unknown: "general",
  };

  return map[key] ?? null;
}

/**
 * Keyword scoring for website-guidance intents (UX only).
 */
export function detectWebsiteGuideIntent(text: string): WebsiteGuideIntent {
  const q = normalize(text);
  if (!q) return "none";

  type Rule = { intent: WebsiteGuideIntent; weight: number; keywords: string[] };
  const rules: Rule[] = [
    {
      intent: "tuition",
      weight: 6,
      keywords: ["شهریه", "هزینه", "قیمت"],
    },
    {
      intent: "pre_registration",
      weight: 7,
      keywords: ["پیش ثبت نام", "پیش‌ثبت‌نام", "ثبت نام", "پذیرش", "مدارک"],
    },
    {
      intent: "ghalamchi",
      weight: 7,
      keywords: ["قلم چی", "قلمچی", "کانون"],
    },
    {
      intent: "about_school",
      weight: 6,
      keywords: ["درباره مدرسه", "درباره ما", "دبستان", "مدرسه"],
    },
    {
      intent: "contact",
      weight: 6,
      keywords: ["تماس", "آدرس", "مسیریابی", "واتساپ", "تلفن"],
    },
    {
      intent: "consultation",
      weight: 6,
      keywords: ["مشاوره", "مشاور"],
    },
    {
      intent: "courses",
      weight: 5,
      keywords: ["دوره", "کلاس", "تقویتی", "تیزهوشان"],
    },
    {
      intent: "exams",
      weight: 5,
      keywords: ["آزمون", "کارنامه"],
    },
    {
      intent: "achievements",
      weight: 5,
      keywords: ["افتخارات", "موفقیت"],
    },
    {
      intent: "gallery",
      weight: 5,
      keywords: ["گالری", "عکس"],
    },
    {
      intent: "staros",
      weight: 4,
      keywords: ["ستاره", "staros", "هوش مصنوعی"],
    },
  ];

  let best: WebsiteGuideIntent = "none";
  let bestScore = 0;

  for (const rule of rules) {
    let score = 0;
    for (const keyword of rule.keywords) {
      if (q.includes(normalize(keyword))) score += rule.weight;
    }
    if (score > bestScore) {
      bestScore = score;
      best = rule.intent;
    }
  }

  if (bestScore >= 4) return best;
  return "general";
}
