import type {
  DetectionScore,
  EducationIntent,
} from "@/lib/atrin/education/types";

export function detectEducationIntent(
  normalized: string,
): DetectionScore<EducationIntent> {
  const checks: Array<{ intent: EducationIntent; re: RegExp; weight: number }> =
    [
      { intent: "homework", re: /حلش\s*کن|حل\s*کن|جواب\s*بده|homework/i, weight: 8 },
      { intent: "hint", re: /راهنمایی|نکته|hint|فقط\s*راهنما/i, weight: 7 },
      { intent: "exam", re: /آزمون|امتحان|تست\s*کنکور|\bexam\b/i, weight: 7 },
      { intent: "practice", re: /تمرین|مشابه|practice|exercise/i, weight: 6 },
      { intent: "explain", re: /توضیح|شرح\s*بده|explain|مثل\s*معلم/i, weight: 6 },
      { intent: "check", re: /درست\s*هست|غلط\s*هست|بررسی\s*کن|check/i, weight: 6 },
      {
        intent: "improve_writing",
        re: /ویرایش|بهتر\s*بنویس|اصلاح\s*متن|improve/i,
        weight: 7,
      },
      { intent: "translate", re: /ترجمه|translate/i, weight: 6 },
      { intent: "learn", re: /یاد\s*بگیر|مفهوم|learn|درس\s*بده/i, weight: 5 },
      { intent: "solve", re: /محاسبه|پیدا\s*کن|solve|جواب/i, weight: 4 },
    ];

  let best: EducationIntent = "general";
  let bestScore = 0;
  const signals: string[] = [];

  for (const item of checks) {
    if (item.re.test(normalized)) {
      if (item.weight > bestScore) {
        best = item.intent;
        bestScore = item.weight;
        signals.length = 0;
        signals.push(item.intent);
      }
    }
  }

  return {
    value: best,
    confidence: bestScore >= 4 ? Math.min(1, bestScore / 10) : 0.2,
    signals,
  };
}
