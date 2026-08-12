import type {
  DetectionScore,
  EducationQuestionType,
} from "@/lib/atrin/education/types";

export function detectEducationQuestionType(
  normalized: string,
): DetectionScore<EducationQuestionType> {
  const rules: Array<{
    type: EducationQuestionType;
    re: RegExp;
    weight: number;
  }> = [
    { type: "multiple_choice", re: /گزینه|الف\)|ب\)|ج\)|د\)|multiple\s*choice/i, weight: 8 },
    { type: "true_false", re: /صحیح\s*یا\s*غلط|درست\s*\/\s*نادرست|true\s*false/i, weight: 8 },
    { type: "fill_blank", re: /جای\s*خالی|پر\s*کنید|____|fill\s*blank/i, weight: 7 },
    { type: "essay", re: /انشا|تشریحی|essay|توضیح\s*دهید/i, weight: 6 },
    { type: "proof", re: /اثبات|prove|proof/i, weight: 7 },
    { type: "equation", re: /معادله|equation|=/, weight: 5 },
    { type: "calculation", re: /محاسبه|حساب\s*کن|calculate/i, weight: 5 },
    { type: "geometry", re: /مثلث|زاویه|مساحت|هندسه/i, weight: 6 },
    { type: "diagram", re: /شکل|نمودار|diagram|figure/i, weight: 5 },
    { type: "definition", re: /تعریف|یعنی\s*چه|define|definition/i, weight: 5 },
    { type: "translation", re: /ترجمه|translate/i, weight: 6 },
    { type: "grammar", re: /دستور|گرامر|grammar|tense/i, weight: 6 },
    { type: "programming", re: /کد|الگوریتم|function|bug|برنامه/i, weight: 6 },
    { type: "word_problem", re: /مسئله|کلمه\s*ای|word\s*problem|اگر\s*.*چقدر/i, weight: 5 },
    { type: "experiment", re: /آزمایش|experiment/i, weight: 6 },
    { type: "reading", re: /متن\s*زیر|خواندن|comprehension|reading/i, weight: 5 },
    { type: "listening", re: /شنیداری|listening/i, weight: 6 },
  ];

  let best: EducationQuestionType = "unknown";
  let bestScore = 0;
  const signals: string[] = [];

  for (const rule of rules) {
    if (rule.re.test(normalized) && rule.weight > bestScore) {
      best = rule.type;
      bestScore = rule.weight;
      signals.length = 0;
      signals.push(rule.type);
    }
  }

  return {
    value: best,
    confidence: bestScore >= 5 ? Math.min(1, bestScore / 10) : 0,
    signals,
  };
}
