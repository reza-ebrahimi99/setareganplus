import type { EducationGrade } from "@/lib/atrin/education/types";

/** Avoid \\b — it breaks on Persian letters (non-\\w in JS). */
const GRADE_WORDS: Array<{ re: RegExp; grade: EducationGrade }> = [
  { re: /(?:کلاس|پایه|grade)\s*(?:اول|۱|1)(?!\d)/i, grade: 1 },
  { re: /(?:کلاس|پایه|grade)\s*(?:دوم|۲|2)(?!\d)/i, grade: 2 },
  { re: /(?:کلاس|پایه|grade)\s*(?:سوم|۳|3)(?!\d)/i, grade: 3 },
  { re: /(?:کلاس|پایه|grade)\s*(?:چهارم|۴|4)(?!\d)/i, grade: 4 },
  { re: /(?:کلاس|پایه|grade)\s*(?:پنجم|۵|5)(?!\d)/i, grade: 5 },
  { re: /(?:کلاس|پایه|grade)\s*(?:ششم|۶|6)(?!\d)/i, grade: 6 },
  { re: /(?:کلاس|پایه|grade)\s*(?:هفتم|۷|7)(?!\d)/i, grade: 7 },
  { re: /(?:کلاس|پایه|grade)\s*(?:هشتم|۸|8)(?!\d)/i, grade: 8 },
  { re: /(?:کلاس|پایه|grade)\s*(?:نهم|۹|9)(?!\d)/i, grade: 9 },
  { re: /(?:کلاس|پایه|grade)\s*(?:دهم|۱۰|10)(?!\d)/i, grade: 10 },
  { re: /(?:کلاس|پایه|grade)\s*(?:یازدهم|۱۱|11)(?!\d)/i, grade: 11 },
  { re: /(?:کلاس|پایه|grade)\s*(?:دوازدهم|۱۲|12)(?!\d)/i, grade: 12 },
];

export function detectEducationGrade(normalized: string): {
  value: EducationGrade;
  confidence: number;
  signals: string[];
} {
  for (const item of GRADE_WORDS) {
    if (item.re.test(normalized)) {
      return {
        value: item.grade,
        confidence: 0.95,
        signals: ["explicit_grade"],
      };
    }
  }

  const signals: string[] = [];
  let estimate: EducationGrade = null;
  let confidence = 0;

  if (/ابتدایی|دبستان|املا|جمع\s*و\s*تفریق/.test(normalized)) {
    estimate = 4;
    confidence = 0.45;
    signals.push("elementary_vocab");
  }
  if (/متوسطه\s*اول|راهنمایی|کسر|درصد|معادله\s*یک\s*مجهولی/.test(normalized)) {
    estimate = 8;
    confidence = 0.5;
    signals.push("middle_vocab");
  }
  if (/متوسطه\s*دوم|کنکور|مشتق|انتگرال|مثلثات|استوکیومتری/.test(normalized)) {
    estimate = 11;
    confidence = 0.55;
    signals.push("highschool_vocab");
  }
  if (/تیزهوشان/.test(normalized)) {
    estimate = estimate ?? 6;
    confidence = Math.max(confidence, 0.4);
    signals.push("gifted");
  }

  if (confidence < 0.4) {
    return { value: null, confidence: 0, signals: [] };
  }

  return { value: estimate, confidence, signals };
}
