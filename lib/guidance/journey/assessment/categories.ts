/**
 * Interest Assessment — 15 explainable preference dimensions.
 * Labels describe questionnaire patterns, not clinical types.
 */

export const ASSESSMENT_CATEGORY_IDS = [
  "interests",
  "personality",
  "work_style",
  "learning_style",
  "social",
  "leadership",
  "research",
  "creativity",
  "helping",
  "technical",
  "business",
  "environmental",
  "decision_making",
  "stress_tolerance",
  "future_goals",
] as const;

export type AssessmentCategoryId = (typeof ASSESSMENT_CATEGORY_IDS)[number];

export type AssessmentCategoryDefinition = {
  id: AssessmentCategoryId;
  title: string;
  description: string;
  highTraitLabel: string;
  highTraitDescription: string;
  lowTraitLabel: string;
  lowTraitDescription: string;
};

export const ASSESSMENT_CATEGORIES: readonly AssessmentCategoryDefinition[] = [
  {
    id: "interests",
    title: "علایق",
    description: "موضوعاتی که در سؤال‌ها توجه شما را بیشتر جلب کرده‌اند",
    highTraitLabel: "کنجکاوی موضوعی گسترده",
    highTraitDescription:
      "در این آزمون، دنبال‌کردن موضوع‌های متنوع و یادگیری تازه را بیشتر انتخاب کرده‌اید.",
    lowTraitLabel: "تمرکز موضوعی محدودتر",
    lowTraitDescription:
      "پاسخ‌ها نشان می‌دهد تنوع موضوعی برایتان اولویت کمتری داشته؛ این ضعف نیست، فقط الگوی همین آزمون است.",
  },
  {
    id: "personality",
    title: "شخصیت (ترجیح تعامل)",
    description: "ترجیح شما در مواجهه با موقعیت‌ها، نه تیپ‌بندی روان‌شناختی",
    highTraitLabel: "بررسی پیش از اقدام",
    highTraitDescription:
      "در سؤال‌های این بخش، فکر کردن و سنجیدن گزینه‌ها را بیشتر از اقدام سریع گزارش کرده‌اید.",
    lowTraitLabel: "اقدام سریع‌تر",
    lowTraitDescription:
      "پاسخ‌ها به اقدام مستقیم بیشتر متمایل بوده تا توقف طولانی روی گزینه‌ها.",
  },
  {
    id: "work_style",
    title: "سبک کار",
    description: "ترجیح نظم، برنامه و ریتم انجام کار",
    highTraitLabel: "کار با برنامه",
    highTraitDescription:
      "ساختار، چک‌لیست و تمام‌کردن کار طبق برنامه در پاسخ‌هایتان پررنگ‌تر بوده است.",
    lowTraitLabel: "کار منعطف‌تر",
    lowTraitDescription:
      "در این آزمون، کار بدون چارچوب ثابت را بیشتر پسندیده‌اید تا برنامه خشک.",
  },
  {
    id: "learning_style",
    title: "سبک یادگیری",
    description: "شیوه‌ای که برای فهم مطلب در سؤال‌ها انتخاب کرده‌اید",
    highTraitLabel: "یادگیری با تمرین",
    highTraitDescription:
      "تمرین عملی، توضیح به دیگران یا آزمایش را بیشتر از مطالعه‌ی صرف انتخاب کرده‌اید.",
    lowTraitLabel: "یادگیری با مطالعه",
    lowTraitDescription:
      "خواندن و فهمیدن پیش از عمل، در پاسخ‌های این بخش بیشتر دیده می‌شود.",
  },
  {
    id: "social",
    title: "ترجیح اجتماعی",
    description: "میزان انرژی‌گرفتن از جمع و گفت‌وگو",
    highTraitLabel: "انرژی از جمع",
    highTraitDescription:
      "گفت‌وگو، گروه و بودن کنار دیگران در این آزمون ترجیح پررنگ‌تری داشته است.",
    lowTraitLabel: "انرژی از خلوت",
    lowTraitDescription:
      "پاسخ‌ها کار و فکر در خلوت را بیشتر از جمع‌های شلوغ نشان می‌دهد.",
  },
  {
    id: "leadership",
    title: "رهبری",
    description: "تمایل به هدایت گروه و پذیرفتن مسئولیت نتیجه",
    highTraitLabel: "هدایت گروه",
    highTraitDescription:
      "گرفتن نقش هماهنگ‌کننده و مسئولیت نتیجه، در پاسخ‌های این بخش بالاتر آمده است.",
    lowTraitLabel: "نقش همراه",
    lowTraitDescription:
      "ترجیح داده‌اید دیگران هدایت کنند و شما روی کار مشخص خود متمرکز بمانید.",
  },
  {
    id: "research",
    title: "توان تحلیلی",
    description: "تمایل به علت‌یابی، داده و بررسی عمیق — نه نمره هوش",
    highTraitLabel: "تحلیل و علت‌یابی",
    highTraitDescription:
      "سؤال پرسیدن از چرایی، بررسی داده و دقت روی جزئیات تحلیلی در پاسخ‌ها بیشتر بوده است.",
    lowTraitLabel: "عمل‌گرایی سریع",
    lowTraitDescription:
      "در این آزمون، ورود سریع به عمل را بیشتر از کندوکاو طولانی گزارش کرده‌اید.",
  },
  {
    id: "creativity",
    title: "خلاقیت",
    description: "ترجیح راه‌حل تازه در برابر روش آشنا",
    highTraitLabel: "ایده‌های تازه",
    highTraitDescription:
      "ساخت، طراحی و راه‌حل غیرمعمول در پاسخ‌هایتان بیشتر انتخاب شده است.",
    lowTraitLabel: "روش‌های آزموده",
    lowTraitDescription:
      "روش‌های مشخص و امتحان‌شده را در این بخش بیشتر پسندیده‌اید.",
  },
  {
    id: "helping",
    title: "کمک به دیگران",
    description: "رضایت از حمایت، آموزش و گره‌گشایی برای دیگران",
    highTraitLabel: "گره‌گشایی برای دیگران",
    highTraitDescription:
      "کمک، آموزش و همراهی با مسئله دیگران در این آزمون امتیاز بالاتری گرفته است.",
    lowTraitLabel: "تمرکز روی کار شخصی",
    lowTraitDescription:
      "پاسخ‌ها نشان می‌دهد انرژی‌تان بیشتر صرف کار خودتان می‌شود تا مراقبت از مسئله دیگران.",
  },
  {
    id: "technical",
    title: "گرایش فنی",
    description: "کشش به ابزار، سیستم، عدد و فهمیدن نحوه کار چیزها",
    highTraitLabel: "کار با سیستم و ابزار",
    highTraitDescription:
      "فناوری، عدد، مکانیزم و ساخت فنی در پاسخ‌ها جذاب‌تر آمده است.",
    lowTraitLabel: "فاصله از کار فنی",
    lowTraitDescription:
      "در این آزمون، کارهای غیر فنی را بیشتر از درگیر شدن با ابزار و سیستم انتخاب کرده‌اید.",
  },
  {
    id: "business",
    title: "گرایش کارآفرینی",
    description: "تمایل به فرصت، مذاکره و مدیریت منابع — نه پیش‌بینی موفقیت کسب‌وکار",
    highTraitLabel: "فرصت و منابع",
    highTraitDescription:
      "فکر کردن به فرصت، متقاعد کردن و مدیریت زمان/پول/افراد در پاسخ‌ها پررنگ بوده است.",
    lowTraitLabel: "فاصله از فضای کسب‌وکار",
    lowTraitDescription:
      "موضوع‌های معامله، ریسک مالی و راه‌اندازی کار در این آزمون کمتر انتخاب شده‌اند.",
  },
  {
    id: "environmental",
    title: "ترجیح محیط",
    description: "محیط کاری و زندگی که در سؤال‌ها انتخاب کرده‌اید",
    highTraitLabel: "محیط باز و طبیعی",
    highTraitDescription:
      "فضای باز، طبیعت یا کار میدانی در پاسخ‌های این بخش بیشتر آمده است.",
    lowTraitLabel: "محیط بسته و شهری",
    lowTraitDescription:
      "دفتر، شهر و فضای کنترل‌شده را بیشتر از محیط میدانی پسندیده‌اید.",
  },
  {
    id: "decision_making",
    title: "تصمیم‌گیری",
    description: "ترجیح سرعت در برابر جمع‌آوری شواهد",
    highTraitLabel: "تصمیم با شواهد",
    highTraitDescription:
      "جمع‌کردن اطلاعات و سنجیدن پیامد را در سؤال‌های تصمیم بیشتر انتخاب کرده‌اید.",
    lowTraitLabel: "تصمیم سریع",
    lowTraitDescription:
      "در این آزمون، بستن تصمیم و حرکت را بیشتر از معطلی روی گزینه‌ها گزارش کرده‌اید.",
  },
  {
    id: "stress_tolerance",
    title: "تاب‌آوری فشار",
    description: "گزارش شما از کار تحت فشار زمانی — نه تشخیص اضطراب",
    highTraitLabel: "پایداری زیر فشار",
    highTraitDescription:
      "در سؤال‌های این بخش، حفظ تمرکز هنگام ضرب‌الاجل را بیشتر گزارش کرده‌اید.",
    lowTraitLabel: "نیاز به ریتم آرام‌تر",
    lowTraitDescription:
      "پاسخ‌ها نشان می‌دهد فشار زمانی زیاد، بازدهی شما را در این آزمون پایین‌تر آورده است.",
  },
  {
    id: "future_goals",
    title: "افق آینده",
    description: "نگاه شما به مسیر چندساله‌ی تحصیل و کار در همین پرسشنامه",
    highTraitLabel: "افق بلندمدت",
    highTraitDescription:
      "هدف چندساله و ساختن مسیر تدریجی در پاسخ‌های این بخش پررنگ‌تر بوده است.",
    lowTraitLabel: "افق نزدیک",
    lowTraitDescription:
      "انتخاب‌های کوتاه‌مدت و نتیجه زودتر، در این آزمون بیشتر دیده می‌شود.",
  },
];

export function getAssessmentCategory(
  id: string,
): AssessmentCategoryDefinition | null {
  return ASSESSMENT_CATEGORIES.find((category) => category.id === id) ?? null;
}
