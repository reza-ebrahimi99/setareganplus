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
    greeting: "greeting",
    greet: "greeting",
    hello: "greeting",
    admissions: "admissions",
    admission: "admissions",
    school: "school",
    study: "study",
    homework: "study",
    tuition: "tuition",
    "ask-tuition": "tuition",
    "pre-registration": "admissions",
    "school-registration": "admissions",
    "ask-registration": "admissions",
    ghalamchi: "ghalamchi",
    "ask-qalamchi": "ghalamchi",
    about: "school",
    "about-school": "school",
    "ask-school": "school",
    contact: "contact",
    "ask-contact": "contact",
    "ask-location": "contact",
    consultation: "consultation",
    "ask-consultation": "consultation",
    gifted: "courses",
    courses: "courses",
    "ask-courses": "courses",
    "summer-club": "admissions",
    "ask-summer": "admissions",
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
  if (!q) return "greeting";

  type Rule = { intent: WebsiteGuideIntent; weight: number; keywords: string[] };
  const rules: Rule[] = [
    {
      intent: "greeting",
      weight: 8,
      keywords: ["سلام", "درود", "صبح بخیر", "عصر بخیر", "شب بخیر", "hello", "hi"],
    },
    {
      intent: "study",
      weight: 8,
      keywords: [
        "سوال ریاضی",
        "سؤال ریاضی",
        "سوال درسی",
        "سؤال درسی",
        "برنامه مطالعاتی",
        "حل کن",
        "تمرین",
        "عکس سوال",
        "عکس سؤال",
        "تایپ سوال",
        "تایپ سؤال",
        "ریاضی",
        "فیزیک",
        "شیمی",
        "homework",
      ],
    },
    {
      intent: "admissions",
      weight: 7,
      keywords: [
        "پیش ثبت نام",
        "پیش‌ثبت‌نام",
        "ثبت نام",
        "ثبت‌نام",
        "پذیرش",
        "مدارک",
        "شرایط ثبت نام",
        "شرایط ثبت‌نام",
      ],
    },
    {
      intent: "school",
      weight: 6,
      keywords: [
        "درباره مدرسه",
        "درباره ما",
        "معرفی مدرسه",
        "معرفی مؤسسه",
        "معرفی موسسه",
        "درباره آترین",
        "معرفی آترین",
        "دبستان",
        "مدرسه",
        "مؤسسه",
        "موسسه",
      ],
    },
    {
      intent: "tuition",
      weight: 6,
      keywords: ["شهریه", "هزینه", "قیمت"],
    },
    {
      intent: "ghalamchi",
      weight: 7,
      keywords: ["قلم چی", "قلمچی", "کانون"],
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
      keywords: ["گالری", "عکس مدرسه"],
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
