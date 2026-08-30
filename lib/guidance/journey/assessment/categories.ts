/**
 * Guidance Journey Engine Step 2 — Interest Assessment category registry.
 * 11 curated dimensions, ~4-5 questions each (~50 total).
 */

export const ASSESSMENT_CATEGORY_IDS = [
  "personality",
  "work_style",
  "interests",
  "learning_style",
  "creativity",
  "leadership",
  "technical",
  "social",
  "research",
  "business",
  "artistic",
] as const;

export type AssessmentCategoryId = (typeof ASSESSMENT_CATEGORY_IDS)[number];

export type AssessmentCategoryDefinition = {
  id: AssessmentCategoryId;
  title: string;
  description: string;
  /** Used to build the personality profile narrative when this category scores high. */
  highTraitLabel: string;
  highTraitDescription: string;
};

export const ASSESSMENT_CATEGORIES: readonly AssessmentCategoryDefinition[] = [
  {
    id: "personality",
    title: "شخصیت",
    description: "نحوه تعامل تو با دنیای اطراف و تصمیم‌گیری‌هایت",
    highTraitLabel: "درون‌نگر و تحلیل‌گر",
    highTraitDescription:
      "به تفکر عمیق و بررسی دقیق قبل از تصمیم‌گیری تمایل داری.",
  },
  {
    id: "work_style",
    title: "سبک کاری",
    description: "ترجیح تو برای نظم، برنامه‌ریزی و ریتم کار",
    highTraitLabel: "منظم و هدف‌محور",
    highTraitDescription: "کار در قالب برنامه و ساختار مشخص برایت لذت‌بخش‌تر است.",
  },
  {
    id: "interests",
    title: "علایق عمومی",
    description: "موضوعاتی که طبیعتاً توجهت را جذب می‌کنند",
    highTraitLabel: "کنجکاو و متنوع‌طلب",
    highTraitDescription: "به موضوعات متنوع و یادگیری مستمر علاقه داری.",
  },
  {
    id: "learning_style",
    title: "سبک یادگیری",
    description: "بهترین شکل یادگیری و درک مطالب برای تو",
    highTraitLabel: "یادگیرنده عملی",
    highTraitDescription: "با تمرین و تجربه مستقیم بهتر یاد می‌گیری.",
  },
  {
    id: "creativity",
    title: "خلاقیت",
    description: "تمایل به ایده‌پردازی و راه‌حل‌های تازه",
    highTraitLabel: "خلاق و ایده‌پرداز",
    highTraitDescription: "به دنبال راه‌حل‌های تازه و غیرمعمول هستی.",
  },
  {
    id: "leadership",
    title: "رهبری",
    description: "تمایل به هدایت تیم و مسئولیت‌پذیری در گروه",
    highTraitLabel: "رهبر و مسئولیت‌پذیر",
    highTraitDescription: "در هدایت گروه و تصمیم‌گیری برای دیگران احساس راحتی می‌کنی.",
  },
  {
    id: "technical",
    title: "گرایش فنی",
    description: "تمایل به کار با ابزار، فناوری و مسائل مهندسی",
    highTraitLabel: "فنی و دقیق",
    highTraitDescription: "حل مسائل فنی و کار با ابزار و فناوری برایت جذاب است.",
  },
  {
    id: "social",
    title: "گرایش اجتماعی",
    description: "تمایل به کمک، آموزش و ارتباط با دیگران",
    highTraitLabel: "اجتماعی و همدل",
    highTraitDescription: "کمک به دیگران و ارتباط انسانی برایت اولویت دارد.",
  },
  {
    id: "research",
    title: "گرایش پژوهشی",
    description: "تمایل به کشف، تحلیل و پژوهش عمیق",
    highTraitLabel: "پژوهشگر و تحلیلی",
    highTraitDescription: "دوست داری ریشه مسائل را کشف و تحلیل کنی.",
  },
  {
    id: "business",
    title: "گرایش تجاری",
    description: "تمایل به کسب‌وکار، مذاکره و مدیریت منابع",
    highTraitLabel: "کارآفرین و اقتصادی",
    highTraitDescription: "به فرصت‌های اقتصادی و مدیریت منابع علاقه داری.",
  },
  {
    id: "artistic",
    title: "گرایش هنری",
    description: "تمایل به بیان هنری، زیبایی‌شناسی و طراحی",
    highTraitLabel: "هنرمند و زیبایی‌گرا",
    highTraitDescription: "بیان هنری و طراحی زیبا برایت معنادار است.",
  },
];

export function getAssessmentCategory(
  id: AssessmentCategoryId,
): AssessmentCategoryDefinition {
  const category = ASSESSMENT_CATEGORIES.find((c) => c.id === id);
  if (!category) throw new Error(`Unknown assessment category: ${id}`);
  return category;
}
