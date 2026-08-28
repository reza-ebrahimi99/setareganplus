import type {
  AtrinPrimaryIntent,
  ScoredIntent,
} from "@/lib/atrin/pipeline/types";
import type { EducationAnalysis } from "@/lib/atrin/education/types";
import type { AtrinModeId } from "@/content/atrin";
import type { WebsiteGuideIntent } from "@/types/action-card";

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u200c\u200f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type Rule = {
  intent: AtrinPrimaryIntent;
  weight: number;
  re: RegExp;
  signal: string;
};

const RULES: Rule[] = [
  { intent: "registration", weight: 12, re: /پیش\s*ثبت\s*نام|ثبت\s*نام/, signal: "registration" },
  { intent: "admissions", weight: 10, re: /پذیرش|مدارک|ظرفیت/, signal: "admissions" },
  { intent: "parent", weight: 11, re: /فرزندم|دخترم|پسرم|والدین|برای بچه‌ام/, signal: "parent" },
  { intent: "homework", weight: 12, re: /تکلیف|حلش\s*کن|حل\s*کن|تمرین\s*\d+/, signal: "homework" },
  { intent: "exam", weight: 11, re: /آزمون|امتحان|کنکور|قلم\s*چی|قلمچی/, signal: "exam" },
  { intent: "study_plan", weight: 11, re: /برنامه\s*مطالعاتی|برنامه\s*ریزی|چند ساعت مطالعه/, signal: "study_plan" },
  { intent: "career", weight: 10, re: /انتخاب رشته|آینده شغلی|رشته تحصیلی/, signal: "career" },
  { intent: "math", weight: 10, re: /ریاضی|معادله|مشتق|انتگرال|هندسه|جبر/, signal: "math" },
  { intent: "physics", weight: 10, re: /فیزیک|نیرو|شتاب|الکتریسیته/, signal: "physics" },
  { intent: "chemistry", weight: 10, re: /شیمی|واکنش|مول|اسید|باز/, signal: "chemistry" },
  { intent: "biology", weight: 9, re: /زیست|سلول|ژنتیک|گیاه|جانور/, signal: "biology" },
  { intent: "persian", weight: 8, re: /ادبیات|دستور زبان فارسی|انشا|نگارش/, signal: "persian" },
  { intent: "english", weight: 8, re: /انگلیسی|grammar|vocabulary|essay/, signal: "english" },
  { intent: "teaching", weight: 8, re: /توضیح بده|یاد بده|مفهوم|درس بده/, signal: "teaching" },
  { intent: "school_info", weight: 9, re: /مدرسه|دبستان|مؤسسه|موسسه|امکانات|آدرس/, signal: "school" },
  { intent: "events", weight: 8, re: /رویداد|همایش|کارگاه|برنامه مدرسه/, signal: "events" },
  { intent: "news", weight: 7, re: /خبر|اطلاعیه|اعلان/, signal: "news" },
  { intent: "teacher", weight: 7, re: /معلم|دبیر|استاد/, signal: "teacher" },
  { intent: "general_chat", weight: 4, re: /سلام|خوبی|ممنون|مرسی/, signal: "chat" },
];

/**
 * Multi-intent classifier with confidence scores.
 */
export function detectAtrinIntents(
  query: string,
  education: EducationAnalysis | null,
  modeId: AtrinModeId,
): ScoredIntent[] {
  const q = normalize(query);
  const scores = new Map<AtrinPrimaryIntent, ScoredIntent>();

  const bump = (intent: AtrinPrimaryIntent, amount: number, signal: string) => {
    const prev = scores.get(intent);
    if (prev) {
      prev.confidence = Math.min(1, prev.confidence + amount / 20);
      if (!prev.signals.includes(signal)) prev.signals.push(signal);
      return;
    }
    scores.set(intent, {
      intent,
      confidence: Math.min(1, amount / 20),
      signals: [signal],
    });
  };

  for (const rule of RULES) {
    if (rule.re.test(q)) bump(rule.intent, rule.weight, rule.signal);
  }

  if (education?.isEducational) {
    bump("teaching", 8, "education_engine");
    if (education.homeworkMode) bump("homework", 10, "homework_mode");
    if (education.examMode) bump("exam", 10, "exam_mode");
    switch (education.subject.value) {
      case "math":
        bump("math", 9, "subject_math");
        break;
      case "physics":
        bump("physics", 9, "subject_physics");
        break;
      case "chemistry":
        bump("chemistry", 9, "subject_chemistry");
        break;
      case "biology":
        bump("biology", 9, "subject_biology");
        break;
      case "persian":
        bump("persian", 8, "subject_persian");
        break;
      case "english":
        bump("english", 8, "subject_english");
        break;
      default:
        break;
    }
  }

  if (modeId === "parent") bump("parent", 8, "mode_parent");
  if (modeId === "admissions") bump("admissions", 8, "mode_admissions");
  if (modeId === "study") bump("teaching", 6, "mode_study");
  if (modeId === "counselor") bump("study_plan", 6, "mode_counselor");
  if (modeId === "career") bump("career", 7, "mode_career");
  if (modeId === "gifted") bump("exam", 6, "mode_gifted");

  const ranked = [...scores.values()].sort(
    (a, b) => b.confidence - a.confidence,
  );
  if (ranked.length === 0) {
    return [{ intent: "unknown", confidence: 0.2, signals: ["fallback"] }];
  }
  return ranked.slice(0, 4);
}

export function primaryIntentOf(
  intents: readonly ScoredIntent[],
): AtrinPrimaryIntent {
  return intents[0]?.intent ?? "unknown";
}

export function mapPrimaryToGuideIntent(
  primary: AtrinPrimaryIntent,
  modeHint: WebsiteGuideIntent | null,
): WebsiteGuideIntent {
  switch (primary) {
    case "admissions":
    case "registration":
      return "admissions";
    case "school_info":
    case "events":
    case "news":
    case "teacher":
      return "school";
    case "homework":
    case "teaching":
    case "exam":
    case "study_plan":
    case "career":
    case "math":
    case "physics":
    case "chemistry":
    case "biology":
    case "persian":
    case "english":
      return "study";
    case "parent":
      return "consultation";
    case "general_chat":
      return "greeting";
    default:
      return modeHint ?? "general";
  }
}
