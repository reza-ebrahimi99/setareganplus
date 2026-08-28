/**
 * Benchmark fixtures by grade folder (Grade1 … Grade12).
 * Subject coverage lives in each grade module; aggregated in index.
 */

import type { EvaluationBenchmarkItem } from "@/lib/atrin/evaluation/types";

export const GRADE1: EvaluationBenchmarkItem[] = [
  {
    id: "g1-persian-alphabet",
    gradeFolder: "Grade1",
    subjectFolder: "Persian",
    question: "حرف ب را با مثال برای کلاس اول توضیح بده",
    expectedSubject: "persian",
    expectedGrade: 1,
    expectedIntent: "explain",
    expectedStrategy: "language_grammar",
    expectedResponseStructure: ["summary", "hint", "step", "practice"],
  },
];

export const GRADE2: EvaluationBenchmarkItem[] = [
  {
    id: "g2-math-add",
    gradeFolder: "Grade2",
    subjectFolder: "Math",
    question: "۱۲ + ۵ را محاسبه کن پایه دوم",
    expectedSubject: "math",
    expectedGrade: 2,
    expectedIntent: "solve",
    expectedQuestionType: "calculation",
    expectedStrategy: "math_steps",
    expectedResponseStructure: ["summary", "hint", "step", "final_answer"],
    expectedNormalizedIncludes: ["12", "5"],
  },
];

export const GRADE3: EvaluationBenchmarkItem[] = [
  {
    id: "g3-math-mul",
    gradeFolder: "Grade3",
    subjectFolder: "Math",
    question: "۴ × ۶ را مرحله‌به‌مرحله محاسبه کن پایه سوم",
    expectedSubject: "math",
    expectedGrade: 3,
    expectedIntent: "solve",
    expectedQuestionType: "calculation",
    expectedStrategy: "math_steps",
    expectedResponseStructure: ["summary", "hint", "step", "final_answer"],
    expectedNormalizedIncludes: ["*"],
  },
];

export const GRADE4: EvaluationBenchmarkItem[] = [
  {
    id: "g4-science",
    gradeFolder: "Grade4",
    subjectFolder: "Science",
    question: "در علوم، چرخه آب را ساده توضیح بده",
    expectedSubject: "science",
    expectedGrade: null,
    expectedIntent: "explain",
    expectedStrategy: "biology_concept",
    expectedResponseStructure: ["summary", "step", "practice"],
  },
];

export const GRADE5: EvaluationBenchmarkItem[] = [
  {
    id: "g5-persian-dictation",
    gradeFolder: "Grade5",
    subjectFolder: "Persian",
    question: "املای کلمه مسئولیت را بررسی کن",
    expectedSubject: "dictation",
    expectedGrade: null,
    expectedIntent: "check",
    expectedStrategy: "language_grammar",
    expectedResponseStructure: ["summary", "hint", "final_answer"],
  },
];

export const GRADE6: EvaluationBenchmarkItem[] = [
  {
    id: "g6-english",
    gradeFolder: "Grade6",
    subjectFolder: "English",
    question: "Explain present simple grammar with examples for English class",
    expectedSubject: "english",
    expectedGrade: null,
    expectedIntent: "explain",
    expectedQuestionType: "grammar",
    expectedStrategy: "language_grammar",
    expectedResponseStructure: ["summary", "step", "practice"],
  },
  {
    id: "g6-gifted",
    gradeFolder: "Grade6",
    subjectFolder: "Gifted",
    question: "تمرین تیزهوشان هوش منطقی",
    expectedSubject: "gifted",
    expectedGrade: null,
    expectedIntent: "practice",
    expectedStrategy: "exam_tricks",
    expectedResponseStructure: ["summary", "exam_tips", "step", "final_answer"],
  },
];

export const GRADE7: EvaluationBenchmarkItem[] = [
  {
    id: "g7-arabic",
    gradeFolder: "Grade7",
    subjectFolder: "Arabic",
    question: "صرف فعل ذهب در عربی را توضیح بده",
    expectedSubject: "arabic",
    expectedGrade: null,
    expectedIntent: "explain",
    expectedStrategy: "language_grammar",
    expectedResponseStructure: ["summary", "step", "practice"],
  },
];

export const GRADE8: EvaluationBenchmarkItem[] = [
  {
    id: "g8-math-fraction",
    gradeFolder: "Grade8",
    subjectFolder: "Math",
    question: "½ + ⅓ را محاسبه کن پایه هشتم",
    expectedSubject: "math",
    expectedGrade: 8,
    expectedIntent: "solve",
    expectedQuestionType: "calculation",
    expectedStrategy: "math_steps",
    expectedResponseStructure: [
      "summary",
      "hint",
      "step",
      "final_answer",
      "common_mistakes",
    ],
    expectedNormalizedIncludes: ["1/2"],
  },
  {
    id: "g8-homework",
    gradeFolder: "Grade8",
    subjectFolder: "Math",
    question: "این معادله را حلش کن: 2x+5=17",
    expectedSubject: "math",
    expectedGrade: null,
    expectedIntent: "homework",
    expectedQuestionType: "equation",
    expectedStrategy: "homework_progressive",
    expectedResponseStructure: ["summary", "hint", "step", "final_answer"],
  },
  {
    id: "g8-geometry",
    gradeFolder: "Grade8",
    subjectFolder: "Math",
    question: "مساحت مثلث را محاسبه کن — هندسه",
    expectedSubject: "geometry",
    expectedGrade: null,
    expectedIntent: "solve",
    expectedQuestionType: "geometry",
    expectedStrategy: "math_steps",
    expectedResponseStructure: ["summary", "hint", "step", "final_answer"],
  },
];

export const GRADE9: EvaluationBenchmarkItem[] = [
  {
    id: "g9-physics",
    gradeFolder: "Grade9",
    subjectFolder: "Physics",
    question: "در فیزیک، نیرو و شتاب را با فرمول توضیح بده",
    expectedSubject: "physics",
    expectedGrade: null,
    expectedIntent: "explain",
    expectedStrategy: "physics_formula",
    expectedResponseStructure: ["summary", "step", "final_answer"],
  },
  {
    id: "g9-writing",
    gradeFolder: "Grade9",
    subjectFolder: "Persian",
    question: "این انشا را بهتر بنویس و ویرایش کن",
    expectedSubject: "writing",
    expectedGrade: null,
    expectedIntent: "improve_writing",
    expectedStrategy: "writing_improve",
    expectedResponseStructure: ["summary", "step", "final_answer"],
  },
];

export const GRADE10: EvaluationBenchmarkItem[] = [
  {
    id: "g10-chemistry",
    gradeFolder: "Grade10",
    subjectFolder: "Chemistry",
    question: "واکنش H₂SO₄ را در شیمی توضیح بده",
    expectedSubject: "chemistry",
    expectedGrade: null,
    expectedIntent: "explain",
    expectedStrategy: "chemistry_reaction",
    expectedResponseStructure: ["summary", "step", "final_answer"],
    expectedNormalizedIncludes: ["H2SO4"],
  },
  {
    id: "g10-programming",
    gradeFolder: "Grade10",
    subjectFolder: "Programming",
    question: "یک حلقه for در کد پایتون را توضیح بده",
    expectedSubject: "programming",
    expectedGrade: null,
    expectedIntent: "explain",
    expectedQuestionType: "programming",
    expectedStrategy: "programming_debug",
    expectedResponseStructure: ["summary", "step", "practice"],
  },
];

export const GRADE11: EvaluationBenchmarkItem[] = [
  {
    id: "g11-biology",
    gradeFolder: "Grade11",
    subjectFolder: "Biology",
    question: "فتوسنتز را در زیست‌شناسی مفهومی توضیح بده",
    expectedSubject: "biology",
    expectedGrade: null,
    expectedIntent: "explain",
    expectedStrategy: "biology_concept",
    expectedResponseStructure: ["summary", "step", "practice"],
  },
  {
    id: "g11-exam-physics",
    gradeFolder: "Grade11",
    subjectFolder: "Physics",
    question: "سؤال امتحان فیزیک درباره انرژی جنبشی",
    expectedSubject: "physics",
    expectedGrade: null,
    expectedIntent: "exam",
    expectedStrategy: "exam_tricks",
    expectedResponseStructure: ["summary", "exam_tips", "step", "final_answer"],
  },
];

export const GRADE12: EvaluationBenchmarkItem[] = [
  {
    id: "g12-konkur",
    gradeFolder: "Grade12",
    subjectFolder: "Konkur",
    question: "یک تست کنکور ریاضی پایه دوازدهم با ترفند سریع",
    expectedSubject: "konkur",
    expectedGrade: 12,
    expectedIntent: "exam",
    expectedStrategy: "exam_tricks",
    expectedResponseStructure: [
      "summary",
      "exam_tips",
      "step",
      "final_answer",
    ],
  },
];

export const ATRIN_EDUCATION_BENCHMARKS: EvaluationBenchmarkItem[] = [
  ...GRADE1,
  ...GRADE2,
  ...GRADE3,
  ...GRADE4,
  ...GRADE5,
  ...GRADE6,
  ...GRADE7,
  ...GRADE8,
  ...GRADE9,
  ...GRADE10,
  ...GRADE11,
  ...GRADE12,
];
