import type { AtrinModeId } from "@/content/atrin-os";

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
 * UX-only conversation mode detection (expanded Atrin OS modes).
 */
export function detectAtrinMode(texts: readonly string[]): AtrinModeId {
  const q = normalize(texts.slice(-5).join("\n"));
  if (!q) return "general";

  const scores: Record<AtrinModeId, number> = {
    general: 0,
    study: 0,
    counselor: 0,
    parent: 0,
    school: 0,
    admissions: 0,
    qalamchi: 0,
    summer: 0,
    career: 0,
    gifted: 0,
  };

  const rules: Array<{ mode: AtrinModeId; weight: number; re: RegExp }> = [
    {
      mode: "study",
      weight: 9,
      re: /(سوال درسی|درس|تمرین|مثال|ریاضی|فیزیک|شیمی|عربی|انگلیسی|علوم|توضیح بده|حل کن|مفهوم)/,
    },
    {
      mode: "gifted",
      weight: 10,
      re: /(تیزهوشان|نمونه دولتی|استعداد)/,
    },
    {
      mode: "qalamchi",
      weight: 10,
      re: /(قلم\s*چی|قلمچی|کانون)/,
    },
    {
      mode: "summer",
      weight: 9,
      re: /(باشگاه تابستانی|تابستان|تابستانه)/,
    },
    {
      mode: "admissions",
      weight: 9,
      re: /(پیش\s*ثبت\s*نام|ثبت\s*نام|پذیرش|مدارک)/,
    },
    {
      mode: "career",
      weight: 8,
      re: /(انتخاب رشته|آینده شغلی|رشته تحصیلی|کنکور.*رشته)/,
    },
    {
      mode: "counselor",
      weight: 8,
      re: /(برنامه مطالعاتی|برنامه ریزی|مشاوره|هدف|پیشرفت|نمره|کنکور)/,
    },
    {
      mode: "parent",
      weight: 8,
      re: /(فرزندم|دخترم|پسرم|والدین|شهریه)/,
    },
    {
      mode: "school",
      weight: 7,
      re: /(مدرسه|دبستان|مؤسسه|موسسه|آدرس|گالری|افتخارات|خدمات)/,
    },
  ];

  for (const rule of rules) {
    if (rule.re.test(q)) scores[rule.mode] += rule.weight;
  }

  let best: AtrinModeId = "general";
  let bestScore = 0;
  (Object.keys(scores) as AtrinModeId[]).forEach((key) => {
    if (scores[key] > bestScore) {
      bestScore = scores[key];
      best = key;
    }
  });

  return bestScore >= 6 ? best : "general";
}
