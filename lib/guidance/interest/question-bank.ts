/**
 * Interest Discovery — curated question bank (premium, short sections).
 * Not 80 questions at once. Trait tags reserved for future RIASEC scoring.
 */

import type {
  InterestQuestion,
  InterestSectionId,
} from "@/lib/guidance/interest/types";

export const INTEREST_SECTION_META: Record<
  InterestSectionId,
  { title: string; description: string; order: number }
> = {
  introduction: {
    title: "مقدمه",
    description: "آشنایی کوتاه با سفر کشف رغبت",
    order: 0,
  },
  career_interests: {
    title: "علایق شغلی",
    description: "چه کارهایی انرژی‌ات را می‌گیرد؟",
    order: 1,
  },
  learning_style: {
    title: "سبک یادگیری",
    description: "چطور بهتر یاد می‌گیری؟",
    order: 2,
  },
  personality: {
    title: "شخصیت",
    description: "ترجیحات شخصی در موقعیت‌های روزمره",
    order: 3,
  },
  working_preferences: {
    title: "ترجیحات کاری",
    description: "محیط و ریتم کاری ایده‌آل تو",
    order: 4,
  },
  review: {
    title: "بازبینی",
    description: "یک نگاه سریع قبل از ثبت نهایی",
    order: 5,
  },
  completed: {
    title: "پایان",
    description: "آزمون رغبت ثبت شد",
    order: 6,
  },
};

/** Question sections that count toward progress (excludes intro/review/completed). */
export const INTEREST_SCORED_SECTION_IDS: readonly InterestSectionId[] = [
  "career_interests",
  "learning_style",
  "personality",
  "working_preferences",
];

export const INTEREST_QUESTIONS: readonly InterestQuestion[] = [
  {
    id: "q-career-energy",
    sectionId: "career_interests",
    type: "card_selection",
    title: "کدام فضا بیشتر انرژی‌ات را می‌گیرد؟",
    description: "یکی را انتخاب کن — بعداً می‌توانی تغییرش بدهی.",
    required: true,
    estimatedSeconds: 25,
    illustrationSlot: "career-energy",
    options: [
      {
        id: "build",
        label: "ساختن و طراحی",
        description: "ساخت چیزهای ملموس یا دیجیتال",
        traitTag: "R",
      },
      {
        id: "explore",
        label: "کاوش و تحقیق",
        description: "سؤال پرسیدن و فهمیدن چرایی",
        traitTag: "I",
      },
      {
        id: "create",
        label: "خلق و بیان",
        description: "هنر، نوشتن، ایده‌های تازه",
        traitTag: "A",
      },
      {
        id: "help",
        label: "کمک به دیگران",
        description: "آموزش، مراقبت، همراهی",
        traitTag: "S",
      },
      {
        id: "lead",
        label: "رهبری و اثرگذاری",
        description: "هدایت تیم و تصمیم‌گیری",
        traitTag: "E",
      },
      {
        id: "organize",
        label: "نظم و دقت",
        description: "برنامه، داده، جزئیات",
        traitTag: "C",
      },
    ],
  },
  {
    id: "q-career-multi",
    sectionId: "career_interests",
    type: "multiple_choice",
    title: "کدام فعالیت‌ها را دوست داری؟",
    description: "تا سه مورد را انتخاب کن.",
    required: true,
    maxSelections: 3,
    estimatedSeconds: 35,
    options: [
      { id: "lab", label: "آزمایش و مشاهده", traitTag: "I" },
      { id: "code", label: "کدنویسی یا حل مسئله فنی", traitTag: "R" },
      { id: "write", label: "نوشتن یا قصه‌گویی", traitTag: "A" },
      { id: "teach", label: "تدریس یا مربیگری", traitTag: "S" },
      { id: "sell", label: "متقاعد کردن و مذاکره", traitTag: "E" },
      { id: "plan", label: "برنامه‌ریزی و چک‌لیست", traitTag: "C" },
    ],
  },
  {
    id: "q-career-scale",
    sectionId: "career_interests",
    type: "scale",
    title: "چقدر از کار گروهی لذت می‌بری؟",
    description: "۱ = تقریباً هیچ · ۵ = خیلی زیاد",
    required: true,
    scaleMin: 1,
    scaleMax: 5,
    scaleMinLabel: "تنهایی بهترم",
    scaleMaxLabel: "با تیم زنده‌ام",
    estimatedSeconds: 15,
    options: [],
  },
  {
    id: "q-learn-mode",
    sectionId: "learning_style",
    type: "single_choice",
    title: "بهترین شکل یادگیری برای تو کدام است؟",
    description: "نزدیک‌ترین گزینه را انتخاب کن.",
    required: true,
    estimatedSeconds: 20,
    options: [
      { id: "visual", label: "دیدن نمودار و تصویر", traitTag: "visual" },
      { id: "audio", label: "شنیدن توضیح", traitTag: "auditory" },
      { id: "read", label: "خواندن متن", traitTag: "reading" },
      { id: "practice", label: "تمرین عملی", traitTag: "kinesthetic" },
    ],
  },
  {
    id: "q-learn-pace",
    sectionId: "learning_style",
    type: "scale",
    title: "ریتم یادگیری ایده‌آل‌ات چیست؟",
    description: "۱ = آرام و عمیق · ۵ = سریع و چالشی",
    required: true,
    scaleMin: 1,
    scaleMax: 5,
    scaleMinLabel: "آرام",
    scaleMaxLabel: "سریع",
    estimatedSeconds: 15,
    options: [],
  },
  {
    id: "q-learn-priority",
    sectionId: "learning_style",
    type: "priority_ranking",
    title: "اولویت‌های یادگیری را بچین",
    description: "از مهم‌ترین به کم‌اهمیت‌ترین مرتب کن (حداکثر ۴).",
    required: true,
    maxSelections: 4,
    supportsDragDrop: true,
    estimatedSeconds: 40,
    options: [
      { id: "clarity", label: "وضوح و ساختار" },
      { id: "examples", label: "مثال‌های واقعی" },
      { id: "feedback", label: "بازخورد سریع" },
      { id: "freedom", label: "آزادی کشف" },
    ],
  },
  {
    id: "q-person-energy",
    sectionId: "personality",
    type: "single_choice",
    title: "بعد از یک روز شلوغ، چه چیزی شارژت می‌کند؟",
    description: "نزدیک‌ترین حس را انتخاب کن.",
    required: true,
    estimatedSeconds: 20,
    options: [
      { id: "alone", label: "زمان آرام تنها", traitTag: "introvert" },
      { id: "friends", label: "وقت با دوستان نزدیک", traitTag: "ambivert" },
      { id: "crowd", label: "جمع و گفت‌وگوی پرانرژی", traitTag: "extravert" },
    ],
  },
  {
    id: "q-person-decide",
    sectionId: "personality",
    type: "card_selection",
    title: "در تصمیم‌های مهم بیشتر به چه تکیه می‌کنی؟",
    description: "یک کارت را انتخاب کن.",
    required: true,
    estimatedSeconds: 20,
    options: [
      { id: "logic", label: "منطق و داده", traitTag: "thinking" },
      { id: "values", label: "ارزش‌ها و احساس", traitTag: "feeling" },
      { id: "both", label: "ترکیب هر دو", traitTag: "balanced" },
    ],
  },
  {
    id: "q-person-change",
    sectionId: "personality",
    type: "scale",
    title: "چقدر با تغییر ناگهانی راحتی؟",
    description: "۱ = سخت · ۵ = خیلی راحت",
    required: true,
    scaleMin: 1,
    scaleMax: 5,
    scaleMinLabel: "سخت",
    scaleMaxLabel: "راحت",
    estimatedSeconds: 15,
    options: [],
  },
  {
    id: "q-work-env",
    sectionId: "working_preferences",
    type: "image_selection",
    title: "کدام محیط کاری را تصور می‌کنی؟",
    description:
      "فعلاً انتخاب متنی است — جایگاه تصویر برای فازهای بعدی آماده است.",
    required: true,
    estimatedSeconds: 25,
    illustrationSlot: "work-env",
    options: [
      {
        id: "lab",
        label: "آزمایشگاه / کارگاه",
        illustrationSlot: "env-lab",
        traitTag: "R",
      },
      {
        id: "studio",
        label: "استودیو خلاق",
        illustrationSlot: "env-studio",
        traitTag: "A",
      },
      {
        id: "office",
        label: "دفتر منظم",
        illustrationSlot: "env-office",
        traitTag: "C",
      },
      {
        id: "field",
        label: "میدان و ارتباط با مردم",
        illustrationSlot: "env-field",
        traitTag: "S",
      },
    ],
  },
  {
    id: "q-work-multi",
    sectionId: "working_preferences",
    type: "multiple_choice",
    title: "در کار چه چیزهایی برایت مهم است؟",
    description: "تا دو مورد را انتخاب کن.",
    required: true,
    maxSelections: 2,
    estimatedSeconds: 25,
    options: [
      { id: "impact", label: "تأثیر واقعی روی دیگران" },
      { id: "growth", label: "رشد مهارت‌ها" },
      { id: "stability", label: "ثبات و امنیت" },
      { id: "freedom", label: "آزادی زمان و مکان" },
      { id: "prestige", label: "اعتبار و پیشرفت شغلی" },
    ],
  },
  {
    id: "q-work-scale",
    sectionId: "working_preferences",
    type: "scale",
    title: "چقدر ساختار و برنامه روزانه می‌خواهی؟",
    description: "۱ = کاملاً آزاد · ۵ = کاملاً ساخت‌یافته",
    required: true,
    scaleMin: 1,
    scaleMax: 5,
    scaleMinLabel: "آزاد",
    scaleMaxLabel: "ساخت‌یافته",
    estimatedSeconds: 15,
    options: [],
  },
];

export function getInterestQuestionsForSection(
  sectionId: InterestSectionId,
): InterestQuestion[] {
  return INTEREST_QUESTIONS.filter((q) => q.sectionId === sectionId);
}

export function getInterestQuestionById(
  id: string,
): InterestQuestion | undefined {
  return INTEREST_QUESTIONS.find((q) => q.id === id);
}
