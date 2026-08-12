import type {
  DetectionScore,
  EducationSubject,
} from "@/lib/atrin/education/types";

type Rule = {
  subject: EducationSubject;
  weight: number;
  patterns: RegExp[];
};

const MATH_OPS = new RegExp(String.raw`\d+\s*[+\-*/=^]\s*\d+`);

const RULES: Rule[] = [
  {
    subject: "math",
    weight: 5,
    patterns: [
      /ریاضی|معادله|جبر|عدد|محاسبه|جمع|تفریق|ضرب|تقسیم|کسری|کسر|درصد|توان|رادیکال/,
      MATH_OPS,
      /solve|equation|algebra|fraction/i,
    ],
  },
  {
    subject: "geometry",
    weight: 6,
    patterns: [
      /هندسه|مثلث|دایره|مربع|مستطیل|زاویه|مساحت|محیط|حجم|فیثاغورس|متوازی/,
      /triangle|circle|angle|perimeter|area/i,
    ],
  },
  {
    subject: "calculus",
    weight: 7,
    patterns: [/مشتق|انتگرال|حد\b|دیفرانسیل|calculus|derivative|integral|limit/i],
  },
  {
    subject: "statistics",
    weight: 6,
    patterns: [
      /آمار|احتمال|میانگین|واریانس|انحراف|probability|statistics|mean|variance/i,
    ],
  },
  {
    subject: "discrete_math",
    weight: 6,
    patterns: [/گسسته|ترکیبیات|گراف|منطق|ماتریس|دنباله|سری|matrix|combinator/i],
  },
  {
    subject: "chemistry",
    weight: 7,
    patterns: [
      /شیمی|واکنش|(?<!فر)مول|اسید|(?:^|[^ا-ی])باز(?:[^ا-ی]|$)|نمک|عنصر|جدول\s*تناوبی|اکسایش|احیا|\bph\b|استوکیومتری/,
      /H2SO4|CO2|NaCl|H2O|\bFe\b|\bCu\b|chemistry|\bmole\b|stoichiometr/i,
      /(?:^|[^A-Za-z])(?:H2O|CO2|NaCl|H2SO4)(?:[^A-Za-z]|$)/,
    ],
  },
  {
    subject: "physics",
    weight: 7,
    patterns: [
      /فیزیک|نیرو|شتاب|سرعت|انرژی|الکتریسیته|مغناطیس|نور|موج|فشار|گرما|قانون\s*نیوتن/,
      /physics|force|velocity|acceleration|ohm|watt|joule/i,
    ],
  },
  {
    subject: "biology",
    weight: 6,
    patterns: [
      /زیست|سلول|ژن|فتوسنتز|گوارش|گردش\s*خون|گیاه|جانور|biology|cell|gene/i,
    ],
  },
  {
    subject: "science",
    weight: 4,
    patterns: [/علوم|تجربی|آزمایش|science|experiment/i],
  },
  {
    subject: "persian",
    weight: 5,
    patterns: [
      /فارسی|دستور\s*زبان|آرایه|غلط\s*املایی|معنی\s*واژه|نثر|شعر|الفبا|حرف\s*[اآبپت]|کلمه\s*خوانی/,
      /grammar.*persian/i,
    ],
  },
  {
    subject: "writing",
    weight: 6,
    patterns: [/انشا|نگارش|ویرایش\s*متن|بهتر\s*بنویس|writing|essay/i],
  },
  {
    subject: "dictation",
    weight: 6,
    patterns: [/املا|دیکته|dictation/i],
  },
  {
    subject: "arabic",
    weight: 6,
    patterns: [/عربی|صرف|نحو|ترجمه\s*عربی|arabic/i],
  },
  {
    subject: "english",
    weight: 5,
    patterns: [/انگلیسی|grammar|vocabulary|translate|english|tense|verb/i],
  },
  {
    subject: "religion",
    weight: 5,
    patterns: [/دینی|قرآن|احکام|پیامبر|religion|islamic/i],
  },
  {
    subject: "history",
    weight: 5,
    patterns: [/تاریخ|سلسله|انقلاب|جنگ|تاریخ\s*ایران|history/i],
  },
  {
    subject: "geography",
    weight: 5,
    patterns: [/جغرافیا|قاره|اقیانوس|آب\s*و\s*هوا|نقشه|geography/i],
  },
  {
    subject: "social_studies",
    weight: 4,
    patterns: [/مطالعات\s*اجتماعی|اجتماعی|مدنی|social\s*studies/i],
  },
  {
    subject: "gifted",
    weight: 7,
    patterns: [/تیزهوشان|نمونه\s*دولتی|استعداد|gifted/i],
  },
  {
    subject: "konkur",
    weight: 7,
    patterns: [/کنکور|سازمان\s*سنجش|رتبه|konkur|konkoor/i],
  },
  {
    subject: "programming",
    weight: 6,
    patterns: [
      /برنامه\s*نویسی|پایتون|جاوا|الگوریتم|کد|python|javascript|function|loop|array/i,
    ],
  },
];

export function detectEducationSubject(
  normalized: string,
): DetectionScore<EducationSubject> {
  const scores = new Map<
    EducationSubject,
    { score: number; signals: string[] }
  >();

  for (const rule of RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(normalized)) {
        const current = scores.get(rule.subject) ?? { score: 0, signals: [] };
        current.score += rule.weight;
        current.signals.push(pattern.source.slice(0, 40));
        scores.set(rule.subject, current);
      }
    }
  }

  let best: EducationSubject = "unknown";
  let bestScore = 0;
  let signals: string[] = [];

  for (const [subject, data] of scores) {
    if (data.score > bestScore) {
      best = subject;
      bestScore = data.score;
      signals = data.signals;
    }
  }

  const confidence = Math.min(1, bestScore / 12);
  if (bestScore < 4) {
    return { value: "unknown", confidence: 0, signals: [] };
  }

  return { value: best, confidence, signals };
}
