import type { AiCrmIntent } from "@/types/ai-crm";

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u200c\u200f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

type IntentRule = {
  intent: AiCrmIntent;
  keywords: readonly string[];
  weight: number;
};

const RULES: readonly IntentRule[] = [
  {
    intent: "ask_registration",
    keywords: ["ثبت نام", "پیش ثبت نام", "پیش‌ثبت‌نام", "پذیرش", "نام نویسی"],
    weight: 6,
  },
  {
    intent: "ask_consultation",
    keywords: ["مشاوره", "مشاور", "جلسه مشاوره", "رزرو مشاوره"],
    weight: 6,
  },
  {
    intent: "ask_school",
    keywords: ["دبستان", "ابتدایی", "ستارگان آینده", "مدرسه"],
    weight: 5,
  },
  {
    intent: "ask_courses",
    keywords: ["دوره", "کلاس", "تقویتی", "آموزشگاه"],
    weight: 5,
  },
  {
    intent: "ask_tuition",
    keywords: ["شهریه", "هزینه", "قیمت", "پرداخت"],
    weight: 5,
  },
  {
    intent: "ask_exam",
    keywords: ["آزمون", "امتحان", "تست"],
    weight: 4,
  },
  {
    intent: "ask_qalamchi",
    keywords: ["قلم چی", "قلم‌چی", "کانون", "ghalamchi"],
    weight: 6,
  },
  {
    intent: "ask_summer",
    keywords: ["باشگاه تابستانی", "تابستان", "تابستانه"],
    weight: 5,
  },
  {
    intent: "ask_staros",
    keywords: ["staros", "ستاره", "هوش مصنوعی", "سامانه"],
    weight: 4,
  },
  {
    intent: "ask_location",
    keywords: ["آدرس", "کجا", "نقشه", "لوکیشن", "محل"],
    weight: 5,
  },
  {
    intent: "ask_contact",
    keywords: ["تماس", "تلفن", "شماره", "ارتباط"],
    weight: 5,
  },
  {
    intent: "ask_teacher",
    keywords: ["معلم", "دبیر", "استاد", "مدرس"],
    weight: 4,
  },
  {
    intent: "ask_schedule",
    keywords: ["برنامه", "ساعت", "زمان بندی", "زمان‌بندی", "روزهای کلاس"],
    weight: 4,
  },
];

/**
 * Lightweight CRM intent classifier (rules + keyword scoring).
 */
export function detectCrmIntent(text: string): AiCrmIntent {
  const q = normalize(text);
  if (!q) return "unknown";

  let best: AiCrmIntent = "unknown";
  let bestScore = 0;

  for (const rule of RULES) {
    let score = 0;
    for (const keyword of rule.keywords) {
      const k = normalize(keyword);
      if (!k) continue;
      if (q.includes(k)) score += rule.weight;
      for (const token of k.split(" ")) {
        if (token.length >= 2 && q.includes(token)) score += 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = rule.intent;
    }
  }

  return bestScore >= 4 ? best : "unknown";
}
