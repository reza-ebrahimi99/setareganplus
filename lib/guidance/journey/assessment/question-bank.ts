/**
 * Free Interest Assessment — 60 Likert items in 10 sections of 6.
 * Explainable preference questions. Not a clinical instrument.
 */

import type { AssessmentCategoryId } from "@/lib/guidance/journey/assessment/categories";

export type AssessmentQuestion = {
  id: string;
  categoryId: AssessmentCategoryId;
  sectionId: string;
  text: string;
  reverse?: boolean;
};

export type AssessmentSectionDefinition = {
  id: string;
  title: string;
  description: string;
  questionIds: readonly string[];
};

export const ASSESSMENT_QUESTIONS: readonly AssessmentQuestion[] = [
  // S1 شناخت خود — personality 4 + decision 2
  { id: "p1", sectionId: "self", categoryId: "personality", text: "قبل از تصمیم‌گیری‌های مهم، معمولاً همه گزینه‌ها را با دقت بررسی می‌کنم." },
  { id: "p2", sectionId: "self", categoryId: "personality", text: "ترجیح می‌دهم به‌جای اقدام سریع، ابتدا فکر کنم." },
  { id: "p3", sectionId: "self", categoryId: "personality", text: "در موقعیت‌های تازه معمولاً آرام و متمرکز باقی می‌مانم." },
  { id: "p4", sectionId: "self", categoryId: "personality", text: "احساساتم را معمولاً منطقی و کنترل‌شده بیان می‌کنم." },
  { id: "d1", sectionId: "self", categoryId: "decision_making", text: "برای بستن یک انتخاب، دوست دارم شواهد کافی جمع کنم." },
  { id: "d2", sectionId: "self", categoryId: "decision_making", text: "اگر اطلاعات ناقص باشد، باز هم سریع تصمیم می‌گیرم و جلو می‌روم.", reverse: true },

  // S2 تصمیم و نظم — decision 2 + work 4
  { id: "d3", sectionId: "decide_work", categoryId: "decision_making", text: "پیامد هر گزینه را قبل از انتخاب، برای خودم روشن می‌کنم." },
  { id: "d4", sectionId: "decide_work", categoryId: "decision_making", text: "معمولاً اولین گزینه‌ی قابل‌قبول را برمی‌دارم تا کار راه بیفتد.", reverse: true },
  { id: "w1", sectionId: "decide_work", categoryId: "work_style", text: "کار کردن با برنامه و چک‌لیست مشخص را ترجیح می‌دهم." },
  { id: "w2", sectionId: "decide_work", categoryId: "work_style", text: "دوست دارم قبل از شروع هر کار، هدف و مراحل آن را دقیق مشخص کنم." },
  { id: "w3", sectionId: "decide_work", categoryId: "work_style", text: "نظم و دقت در جزئیات برایم اهمیت زیادی دارد." },
  { id: "w4", sectionId: "decide_work", categoryId: "work_style", text: "کار بدون برنامه‌ریزی مشخص برایم آسان‌تر است.", reverse: true },

  // S3 یادگیری — learning 4 + interests 2
  { id: "l1", sectionId: "learn", categoryId: "learning_style", text: "با انجام تمرین عملی بهتر از خواندن صرف یاد می‌گیرم." },
  { id: "l2", sectionId: "learn", categoryId: "learning_style", text: "دیدن نمودار و تصویر کمک زیادی به فهم من می‌کند." },
  { id: "l3", sectionId: "learn", categoryId: "learning_style", text: "توضیح‌دادن مطلب به دیگران باعث می‌شود بهتر آن را بفهمم." },
  { id: "l4", sectionId: "learn", categoryId: "learning_style", text: "ترجیح می‌دهم پیش از عمل، مطلب را کامل مطالعه کنم.", reverse: true },
  { id: "i1", sectionId: "learn", categoryId: "interests", text: "دوست دارم درباره موضوعات متنوع و جدید مطالعه کنم." },
  { id: "i2", sectionId: "learn", categoryId: "interests", text: "همیشه چند حوزه علاقه‌مندی مختلف را همزمان دنبال می‌کنم." },

  // S4 کنجکاوی و افق — interests 2 + future 4
  { id: "i3", sectionId: "horizon", categoryId: "interests", text: "کنجکاوی من را وادار می‌کند دائم سؤال بپرسم." },
  { id: "i4", sectionId: "horizon", categoryId: "interests", text: "یادگیری چیزهای تازه برایم لذت‌بخش است، حتی خارج از درس اصلی‌ام." },
  { id: "f1", sectionId: "horizon", categoryId: "future_goals", text: "برای پنج سال آینده تصویر روشنی از مسیر تحصیل یا کار دارم." },
  { id: "f2", sectionId: "horizon", categoryId: "future_goals", text: "حاضرم برای هدف دور، چند سال سخت‌تر کار یا درس بخوانم." },
  { id: "f3", sectionId: "horizon", categoryId: "future_goals", text: "بیشتر به نتیجه‌ی نزدیک (چند ماه آینده) فکر می‌کنم تا مسیر چندساله.", reverse: true },
  { id: "f4", sectionId: "horizon", categoryId: "future_goals", text: "انتخاب رشته را بخشی از یک مسیر بلندمدت می‌بینم، نه فقط یک فرم امسال." },

  // S5 مردم — social 4 + helping 2
  { id: "s1", sectionId: "people", categoryId: "social", text: "گفت‌وگو با افراد تازه برایم انرژی‌بخش است." },
  { id: "s2", sectionId: "people", categoryId: "social", text: "در جمع، راحت‌تر فکر می‌کنم تا وقتی تنها هستم." },
  { id: "s3", sectionId: "people", categoryId: "social", text: "کار گروهی را به کار کاملاً انفرادی ترجیح می‌دهم." },
  { id: "s4", sectionId: "people", categoryId: "social", text: "ترجیح می‌دهم بیشتر وقتم را تنها بگذرانم.", reverse: true },
  { id: "h1", sectionId: "people", categoryId: "helping", text: "وقتی کسی گیر کرده، خودم جلو می‌روم تا کمکش کنم." },
  { id: "h2", sectionId: "people", categoryId: "helping", text: "آموزش‌دادن یک مطلب به دیگری برایم رضایت‌بخش است." },

  // S6 کمک و رهبری — helping 2 + leadership 4
  { id: "h3", sectionId: "lead", categoryId: "helping", text: "شنیدن مسئله دیگران و همراهی با آن، بخشی از کار موردعلاقه من است." },
  { id: "h4", sectionId: "lead", categoryId: "helping", text: "ترجیح می‌دهم روی کار خودم بمانم تا درگیر مشکل دیگران شوم.", reverse: true },
  { id: "ld1", sectionId: "lead", categoryId: "leadership", text: "در کار گروهی معمولاً نقش هماهنگ‌کننده را بر عهده می‌گیرم." },
  { id: "ld2", sectionId: "lead", categoryId: "leadership", text: "مسئولیت نتیجه کار گروه برایم قابل‌قبول است." },
  { id: "ld3", sectionId: "lead", categoryId: "leadership", text: "می‌توانم دیگران را برای رسیدن به هدف مشترک همراه کنم." },
  { id: "ld4", sectionId: "lead", categoryId: "leadership", text: "ترجیح می‌دهم دیگران تصمیم بگیرند و من اجرا کنم.", reverse: true },

  // S7 تحلیل — analytical 4 + technical 2
  { id: "r1", sectionId: "analyze", categoryId: "research", text: "دوست دارم علت وقوع پدیده‌ها را عمیق بررسی کنم." },
  { id: "r2", sectionId: "analyze", categoryId: "research", text: "جمع‌آوری و مقایسه داده برایم جالب است." },
  { id: "r3", sectionId: "analyze", categoryId: "research", text: "خواندن گزارش‌های دقیق و تحلیلی برایم لذت‌بخش است." },
  { id: "r4", sectionId: "analyze", categoryId: "research", text: "اگر بتوانم سریع به نتیجه برسم، بررسی طولانی را کنار می‌گذارم.", reverse: true },
  { id: "t1", sectionId: "analyze", categoryId: "technical", text: "کار با ابزار، دستگاه یا نرم‌افزار فنی برایم جذاب است." },
  { id: "t2", sectionId: "analyze", categoryId: "technical", text: "حل مسئله‌های عددی یا منطقی برایم لذت‌بخش است." },

  // S8 فنی و خلاق — technical 2 + creativity 4
  { id: "t3", sectionId: "craft", categoryId: "technical", text: "دوست دارم بدانم چیزها دقیقاً چگونه کار می‌کنند." },
  { id: "t4", sectionId: "craft", categoryId: "technical", text: "ترجیح می‌دهم با آدم‌ها کار کنم تا با دستگاه و سیستم.", reverse: true },
  { id: "c1", sectionId: "craft", categoryId: "creativity", text: "معمولاً راه‌حل‌های غیرمعمول برای مسائل پیدا می‌کنم." },
  { id: "c2", sectionId: "craft", categoryId: "creativity", text: "ایده‌پردازی بخش لذت‌بخشی از کار یا درس من است." },
  { id: "c3", sectionId: "craft", categoryId: "creativity", text: "دوست دارم چیز تازه‌ای بسازم یا طراحی کنم." },
  { id: "c4", sectionId: "craft", categoryId: "creativity", text: "ترجیح می‌دهم از روش‌های شناخته‌شده و امتحان‌شده استفاده کنم.", reverse: true },

  // S9 کارآفرینی و محیط — business 4 + environmental 2
  { id: "b1", sectionId: "venture", categoryId: "business", text: "فکرکردن به فرصت کار و ساختن یک فعالیت مستقل برایم جالب است." },
  { id: "b2", sectionId: "venture", categoryId: "business", text: "مذاکره و متقاعدکردن دیگران برایم نسبتاً راحت است." },
  { id: "b3", sectionId: "venture", categoryId: "business", text: "دوست دارم منابع (زمان، پول، افراد) را خودم مدیریت کنم." },
  { id: "b4", sectionId: "venture", categoryId: "business", text: "ریسک مالی یا شغلی حساب‌شده برایم قابل‌قبول است." },
  { id: "e1", sectionId: "venture", categoryId: "environmental", text: "کار در فضای باز یا محیط طبیعی را به دفتر بسته ترجیح می‌دهم." },
  { id: "e2", sectionId: "venture", categoryId: "environmental", text: "حضور در شهر شلوغ و ساختمان‌های اداری برایم انرژی‌بخش است.", reverse: true },

  // S10 محیط، فشار — environmental 2 + stress 4
  { id: "e3", sectionId: "place", categoryId: "environmental", text: "کار میدانی (سفر، سایت، آزمایشگاه بیرون) برایم جذاب است." },
  { id: "e4", sectionId: "place", categoryId: "environmental", text: "محیط آرام و قابل‌پیش‌بینی را به محیط متغیر ترجیح می‌دهم.", reverse: true },
  { id: "st1", sectionId: "place", categoryId: "stress_tolerance", text: "وقتی ضرب‌الاجل نزدیک است، تمرکزم را حفظ می‌کنم." },
  { id: "st2", sectionId: "place", categoryId: "stress_tolerance", text: "چند کار همزمان با فشار زمانی، بازدهی‌ام را معمولاً پایین می‌آورد.", reverse: true },
  { id: "st3", sectionId: "place", categoryId: "stress_tolerance", text: "بعد از یک اشتباه، نسبتاً سریع به کار برمی‌گردم." },
  { id: "st4", sectionId: "place", categoryId: "stress_tolerance", text: "فضای پرتنش کلاس یا کار، برای مدت طولانی حالم را خراب می‌کند.", reverse: true },
];

export const ASSESSMENT_SECTIONS: readonly AssessmentSectionDefinition[] = [
  {
    id: "self",
    title: "شناخت خود",
    description: "ترجیح شما در فکر کردن، آرام ماندن و بستن انتخاب",
    questionIds: ["p1", "p2", "p3", "p4", "d1", "d2"],
  },
  {
    id: "decide_work",
    title: "تصمیم و نظم کار",
    description: "چطور کار را شروع می‌کنید و چطور آن را می‌بندید",
    questionIds: ["d3", "d4", "w1", "w2", "w3", "w4"],
  },
  {
    id: "learn",
    title: "یادگیری",
    description: "چه چیزی به فهم شما کمک می‌کند",
    questionIds: ["l1", "l2", "l3", "l4", "i1", "i2"],
  },
  {
    id: "horizon",
    title: "کنجکاوی و افق",
    description: "موضوع‌های تازه و تصویری که از مسیر چندساله دارید",
    questionIds: ["i3", "i4", "f1", "f2", "f3", "f4"],
  },
  {
    id: "people",
    title: "مردم و جمع",
    description: "انرژی شما در خلوت، گفت‌وگو و همراهی",
    questionIds: ["s1", "s2", "s3", "s4", "h1", "h2"],
  },
  {
    id: "lead",
    title: "کمک و هدایت",
    description: "گره‌گشایی برای دیگران و نقش شما در گروه",
    questionIds: ["h3", "h4", "ld1", "ld2", "ld3", "ld4"],
  },
  {
    id: "analyze",
    title: "تحلیل",
    description: "علت‌یابی، داده و کشش به سیستم‌ها",
    questionIds: ["r1", "r2", "r3", "r4", "t1", "t2"],
  },
  {
    id: "craft",
    title: "ساخت و ایده",
    description: "کار فنی و راه‌حل‌های تازه",
    questionIds: ["t3", "t4", "c1", "c2", "c3", "c4"],
  },
  {
    id: "venture",
    title: "فرصت و محیط",
    description: "کسب‌وکار، منابع و جایی که دوست دارید کار کنید",
    questionIds: ["b1", "b2", "b3", "b4", "e1", "e2"],
  },
  {
    id: "place",
    title: "محیط و فشار",
    description: "فضای کار و گزارش شما از ضرب‌الاجل",
    questionIds: ["e3", "e4", "st1", "st2", "st3", "st4"],
  },
];

export function getQuestionsForCategory(
  categoryId: AssessmentCategoryId,
): AssessmentQuestion[] {
  return ASSESSMENT_QUESTIONS.filter((q) => q.categoryId === categoryId);
}

export function getQuestionsForSection(sectionId: string): AssessmentQuestion[] {
  const section = ASSESSMENT_SECTIONS.find((row) => row.id === sectionId);
  if (!section) return [];
  return section.questionIds
    .map((id) => ASSESSMENT_QUESTIONS.find((question) => question.id === id))
    .filter((question): question is AssessmentQuestion => Boolean(question));
}

export function firstIncompleteSectionIndex(answers: Record<string, number>): number {
  const idx = ASSESSMENT_SECTIONS.findIndex((section) =>
    getQuestionsForSection(section.id).some((question) => {
      const value = answers[question.id];
      return typeof value !== "number" || value < 1 || value > 5;
    }),
  );
  return idx < 0 ? ASSESSMENT_SECTIONS.length - 1 : idx;
}

export const ASSESSMENT_QUESTION_COUNT = ASSESSMENT_QUESTIONS.length;
export const ASSESSMENT_SECTION_COUNT = ASSESSMENT_SECTIONS.length;
