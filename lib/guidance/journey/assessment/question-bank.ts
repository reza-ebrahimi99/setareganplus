/**
 * Guidance Journey Engine Step 2 — curated question bank (~50 items).
 * All questions use a 1-5 Likert scale ("کاملاً مخالفم" .. "کاملاً موافقم").
 * Reversed items (`reverse: true`) are scored as (6 - answer) before averaging.
 */

import type { AssessmentCategoryId } from "@/lib/guidance/journey/assessment/categories";

export type AssessmentQuestion = {
  id: string;
  categoryId: AssessmentCategoryId;
  text: string;
  reverse?: boolean;
};

export const ASSESSMENT_QUESTIONS: readonly AssessmentQuestion[] = [
  // personality (5)
  { id: "p1", categoryId: "personality", text: "قبل از تصمیم‌گیری‌های مهم، معمولاً همه گزینه‌ها را با دقت بررسی می‌کنم." },
  { id: "p2", categoryId: "personality", text: "ترجیح می‌دهم به‌جای اقدام سریع، ابتدا فکر کنم." },
  { id: "p3", categoryId: "personality", text: "در موقعیت‌های جدید معمولاً آرام و متمرکز باقی می‌مانم." },
  { id: "p4", categoryId: "personality", text: "احساساتم را معمولاً منطقی و کنترل‌شده بیان می‌کنم." },
  { id: "p5", categoryId: "personality", text: "تغییرات ناگهانی برنامه‌ها برایم چالش‌برانگیز است.", reverse: true },

  // work_style (5)
  { id: "w1", categoryId: "work_style", text: "کار کردن با برنامه و چک‌لیست مشخص را ترجیح می‌دهم." },
  { id: "w2", categoryId: "work_style", text: "دوست دارم قبل از شروع هر کار، هدف و مراحل آن را دقیق مشخص کنم." },
  { id: "w3", categoryId: "work_style", text: "نظم و دقت در جزئیات برایم اهمیت زیادی دارد." },
  { id: "w4", categoryId: "work_style", text: "کار بدون برنامه‌ریزی مشخص برایم آسان است.", reverse: true },
  { id: "w5", categoryId: "work_style", text: "ضرب‌الاجل‌ها را معمولاً زودتر از موعد تکمیل می‌کنم." },

  // interests (5)
  { id: "i1", categoryId: "interests", text: "دوست دارم درباره موضوعات متنوع و جدید مطالعه کنم." },
  { id: "i2", categoryId: "interests", text: "همیشه چند حوزه علاقه‌مندی مختلف را دنبال می‌کنم." },
  { id: "i3", categoryId: "interests", text: "کنجکاوی من را وادار می‌کند دائم سؤال بپرسم." },
  { id: "i4", categoryId: "interests", text: "یادگیری چیزهای تازه برایم لذت‌بخش است، حتی خارج از رشته تحصیلی‌ام." },
  { id: "i5", categoryId: "interests", text: "دنبال‌کردن اخبار و روندهای جدید علمی/فرهنگی برایم جالب است." },

  // learning_style (5)
  { id: "l1", categoryId: "learning_style", text: "با انجام تمرین عملی بهتر از خواندن صرف یاد می‌گیرم." },
  { id: "l2", categoryId: "learning_style", text: "دیدن نمودار و تصویر کمک زیادی به فهم من می‌کند." },
  { id: "l3", categoryId: "learning_style", text: "توضیح‌دادن مطلب به دیگران باعث می‌شود بهتر آن را بفهمم." },
  { id: "l4", categoryId: "learning_style", text: "ترجیح می‌دهم پیش از عمل، مطلب را کامل مطالعه کنم.", reverse: true },
  { id: "l5", categoryId: "learning_style", text: "آزمایش‌وخطا روش موردعلاقه من برای یادگیری است." },

  // creativity (4)
  { id: "c1", categoryId: "creativity", text: "معمولاً راه‌حل‌های غیرمعمول برای مسائل پیدا می‌کنم." },
  { id: "c2", categoryId: "creativity", text: "ایده‌پردازی و تخیل بخش لذت‌بخشی از زندگی من است." },
  { id: "c3", categoryId: "creativity", text: "دوست دارم چیزهای تازه بسازم یا طراحی کنم." },
  { id: "c4", categoryId: "creativity", text: "ترجیح می‌دهم از روش‌های شناخته‌شده و امتحان‌شده استفاده کنم.", reverse: true },

  // leadership (4)
  { id: "ld1", categoryId: "leadership", text: "در کار گروهی معمولاً نقش هدایت‌کننده را بر عهده می‌گیرم." },
  { id: "ld2", categoryId: "leadership", text: "مسئولیت‌پذیری در قبال نتیجه کار گروه برایم راحت است." },
  { id: "ld3", categoryId: "leadership", text: "می‌توانم دیگران را برای رسیدن به هدف مشترک ترغیب کنم." },
  { id: "ld4", categoryId: "leadership", text: "ترجیح می‌دهم دیگران تصمیم بگیرند و من اجرا کنم.", reverse: true },

  // technical (4)
  { id: "t1", categoryId: "technical", text: "کار با ابزار، دستگاه یا نرم‌افزارهای فنی برایم جذاب است." },
  { id: "t2", categoryId: "technical", text: "حل مسائل ریاضی یا مهندسی برایم لذت‌بخش است." },
  { id: "t3", categoryId: "technical", text: "دوست دارم بدانم چیزها دقیقاً چگونه کار می‌کنند." },
  { id: "t4", categoryId: "technical", text: "کدنویسی، مدارهای الکترونیکی یا مکانیک برایم هیجان‌انگیز است." },

  // social (4)
  { id: "s1", categoryId: "social", text: "کمک به حل مشکلات دیگران برایم رضایت‌بخش است." },
  { id: "s2", categoryId: "social", text: "گفت‌وگو و همدلی با افراد جدید برایم آسان است." },
  { id: "s3", categoryId: "social", text: "آموزش‌دادن به دیگران را دوست دارم." },
  { id: "s4", categoryId: "social", text: "ترجیح می‌دهم بیشتر وقتم را تنها بگذرانم.", reverse: true },

  // research (4)
  { id: "r1", categoryId: "research", text: "دوست دارم علت وقوع پدیده‌ها را عمیقاً بررسی کنم." },
  { id: "r2", categoryId: "research", text: "جمع‌آوری و تحلیل داده برایم جالب است." },
  { id: "r3", categoryId: "research", text: "خواندن مقالات علمی یا گزارش‌های تحلیلی برایم لذت‌بخش است." },
  { id: "r4", categoryId: "research", text: "دوست دارم فرضیه‌ای بسازم و آن را آزمایش کنم." },

  // business (4)
  { id: "b1", categoryId: "business", text: "فکرکردن به فرصت‌های کسب‌وکار و سرمایه‌گذاری برایم جالب است." },
  { id: "b2", categoryId: "business", text: "مذاکره و متقاعدکردن دیگران برایم راحت است." },
  { id: "b3", categoryId: "business", text: "دوست دارم منابع (زمان، پول، افراد) را به‌صورت مؤثر مدیریت کنم." },
  { id: "b4", categoryId: "business", text: "ریسک‌پذیری در تصمیم‌های اقتصادی برایم قابل‌قبول است." },

  // artistic (4)
  { id: "a1", categoryId: "artistic", text: "زیبایی‌شناسی و طراحی بصری برایم اهمیت زیادی دارد." },
  { id: "a2", categoryId: "artistic", text: "بیان احساسات از طریق هنر (نوشتن، موسیقی، طراحی) برایم لذت‌بخش است." },
  { id: "a3", categoryId: "artistic", text: "دوست دارم فضاها یا اشیا را زیباتر و خلاقانه‌تر کنم." },
  { id: "a4", categoryId: "artistic", text: "به جزئیات بصری و هنری در محیط اطرافم توجه زیادی دارم." },
];

export function getQuestionsForCategory(
  categoryId: AssessmentCategoryId,
): AssessmentQuestion[] {
  return ASSESSMENT_QUESTIONS.filter((q) => q.categoryId === categoryId);
}

export const ASSESSMENT_QUESTION_COUNT = ASSESSMENT_QUESTIONS.length;
