/**
 * آترین OS — modes, personality, prompts, commands (UI intelligence layer).
 */

import { aboutPageContent } from "@/content/about-page";

export type AtrinModeId =
  | "general"
  | "study"
  | "counselor"
  | "parent"
  | "school"
  | "admissions"
  | "qalamchi"
  | "summer"
  | "career"
  | "gifted";

export type AtrinPersonalityState =
  | "greeting"
  | "thinking"
  | "teaching"
  | "counseling"
  | "celebrating"
  | "searching"
  | "error"
  | "offline";

export type AtrinModeConfig = {
  id: AtrinModeId;
  label: string;
  tip: string;
  accent: string;
  gradient: string;
  icon: string;
  suggestions: readonly string[];
  cta: { label: string; href: string };
};

export const ATRIN_MODES: Record<AtrinModeId, AtrinModeConfig> = {
  general: {
    id: "general",
    label: "آترین",
    tip: "هر سؤالی درباره آموزش و موفقیت بپرسید.",
    accent: "#7c3aed",
    gradient: "from-[#7c3aed] to-[#06b6d4]",
    icon: "spark",
    suggestions: ["معرفی مؤسسه", "خدمات", "تماس"],
    cta: { label: "درباره مؤسسه", href: "/about" },
  },
  study: {
    id: "study",
    label: "حالت مطالعه",
    tip: "درس، مثال، تمرین و آزمونک را مرحله‌به‌مرحله ببینید.",
    accent: "#22d3ee",
    gradient: "from-[#0891b2] to-[#22d3ee]",
    icon: "book",
    suggestions: ["یک سوال ریاضی دارم", "مثال بزن", "تمرین بده"],
    cta: { label: "دوره‌ها", href: "/courses" },
  },
  counselor: {
    id: "counselor",
    label: "حالت مشاوره",
    tip: "هدف، برنامه هفتگی و گام بعدی را مشخص می‌کنیم.",
    accent: "#a78bfa",
    gradient: "from-[#7c3aed] to-[#a78bfa]",
    icon: "brain",
    suggestions: ["برنامه مطالعاتی", "انتخاب رشته", "مشاوره"],
    cta: { label: "رزرو مشاوره", href: "/consultation" },
  },
  parent: {
    id: "parent",
    label: "حالت والدین",
    tip: "پذیرش، شهریه و مسیر همراهی با لحن دوستانه.",
    accent: "#f472b6",
    gradient: "from-[#db2777] to-[#f472b6]",
    icon: "heart",
    suggestions: ["شهریه", "پیش ثبت نام", "مشاوره والدین"],
    cta: { label: "تماس با مشاور", href: "/contact" },
  },
  school: {
    id: "school",
    label: "راهنمای مدرسه",
    tip: "صفحات، خدمات و مسیرهای مؤسسه را پیدا کنید.",
    accent: "#34d399",
    gradient: "from-[#059669] to-[#34d399]",
    icon: "school",
    suggestions: ["درباره مدرسه", "گالری", "افتخارات"],
    cta: { label: "درباره ما", href: "/about" },
  },
  admissions: {
    id: "admissions",
    label: "پذیرش",
    tip: "پیش‌ثبت‌نام، مدارک و مسیر پذیرش.",
    accent: "#fbbf24",
    gradient: "from-[#d97706] to-[#fbbf24]",
    icon: "register",
    suggestions: ["پیش ثبت نام", "مدارک لازم", "تماس پذیرش"],
    cta: { label: "شروع پیش‌ثبت‌نام", href: "/pre-registration" },
  },
  qalamchi: {
    id: "qalamchi",
    label: "قلم‌چی",
    tip: "ثبت‌نام، برنامه آزمون و مسیر نمایندگی.",
    accent: "#38bdf8",
    gradient: "from-[#0284c7] to-[#38bdf8]",
    icon: "calendar",
    suggestions: ["ثبت نام قلم چی", "برنامه آزمون", "کارنامه"],
    cta: { label: "ثبت‌نام قلم‌چی", href: "/ghalamchi/register" },
  },
  summer: {
    id: "summer",
    label: "باشگاه تابستانی",
    tip: "برنامه تابستان و مسیر ثبت‌نام.",
    accent: "#fb923c",
    gradient: "from-[#ea580c] to-[#fb923c]",
    icon: "sun",
    suggestions: ["باشگاه تابستانی", "ثبت نام تابستان"],
    cta: { label: "پیش‌ثبت‌نام", href: "/pre-registration" },
  },
  career: {
    id: "career",
    label: "مسیر شغلی",
    tip: "انتخاب رشته و چشم‌انداز آینده.",
    accent: "#818cf8",
    gradient: "from-[#4f46e5] to-[#818cf8]",
    icon: "compass",
    suggestions: ["انتخاب رشته", "آینده شغلی", "مشاوره"],
    cta: { label: "مشاوره", href: "/consultation" },
  },
  gifted: {
    id: "gifted",
    label: "تیزهوشان",
    tip: "آمادگی هدفمند تیزهوشان و نمونه دولتی.",
    accent: "#eab308",
    gradient: "from-[#ca8a04] to-[#facc15]",
    icon: "trophy",
    suggestions: ["آمادگی تیزهوشان", "نمونه دولتی", "دوره‌ها"],
    cta: { label: "دوره‌های آمادگی", href: "/courses" },
  },
};

export const ATRIN_PERSONALITY: Record<
  AtrinPersonalityState,
  { headline: string; subtitle: string; accent: string; icon: string }
> = {
  greeting: {
    headline: "سلام، من آترین هستم",
    subtitle: "همراه هوشمند آموزش و موفقیت",
    accent: "#7c3aed",
    icon: "spark",
  },
  thinking: {
    headline: "در حال فکر کردن…",
    subtitle: "دارم بهترین مسیر را پیدا می‌کنم",
    accent: "#a78bfa",
    icon: "think",
  },
  teaching: {
    headline: "حالت تدریس",
    subtitle: "مفهوم را ساده و مرحله‌ای توضیح می‌دهم",
    accent: "#22d3ee",
    icon: "book",
  },
  counseling: {
    headline: "حالت مشاوره",
    subtitle: "هدف و برنامه را با هم می‌چینیم",
    accent: "#c4b5fd",
    icon: "brain",
  },
  celebrating: {
    headline: "آفرین!",
    subtitle: "پیشرفت شما ارزشمند است",
    accent: "#34d399",
    icon: "celebrate",
  },
  searching: {
    headline: "در حال جستجو…",
    subtitle: "منابع و مسیرهای مرتبط را می‌آورم",
    accent: "#38bdf8",
    icon: "search",
  },
  error: {
    headline: "مشکلی پیش آمد",
    subtitle: "می‌توانید دوباره تلاش کنید",
    accent: "#f87171",
    icon: "alert",
  },
  offline: {
    headline: "آفلاین هستید",
    subtitle: "اتصال اینترنت را بررسی کنید",
    accent: "#94a3b8",
    icon: "offline",
  },
};

export const ATRIN_COMMANDS = [
  { id: "teach", command: "/teach", label: "تدریس", prompt: "یک سوال درسی دارم", mode: "study" as const },
  { id: "plan", command: "/plan", label: "برنامه", prompt: "برنامه مطالعاتی می‌خواهم", mode: "counselor" as const },
  { id: "register", command: "/register", label: "ثبت‌نام", prompt: "پیش ثبت نام", mode: "admissions" as const },
  { id: "about", command: "/about", label: "درباره", prompt: "درباره مؤسسه علمی ستارگان بگو", mode: "school" as const },
  { id: "contact", command: "/contact", label: "تماس", prompt: "تماس", mode: "parent" as const },
  { id: "qalamchi", command: "/qalamchi", label: "قلم‌چی", prompt: "قلم چی", mode: "qalamchi" as const },
  { id: "gifted", command: "/gifted", label: "تیزهوشان", prompt: "آمادگی تیزهوشان", mode: "gifted" as const },
] as const;

export const ATRIN_PROMPT_GROUPS = [
  {
    id: "study",
    label: "مطالعه",
    prompts: ["یک سوال ریاضی دارم", "مفهوم را ساده توضیح بده", "تمرین بده"],
  },
  {
    id: "school",
    label: "مدرسه",
    prompts: ["درباره دبستان بگو", "گالری مدرسه", "افتخارات"],
  },
  {
    id: "counseling",
    label: "مشاوره",
    prompts: ["برنامه مطالعاتی", "انتخاب رشته", "مشاوره تحصیلی"],
  },
  {
    id: "admissions",
    label: "پذیرش",
    prompts: ["پیش ثبت نام", "مدارک لازم", "شهریه"],
  },
  {
    id: "qalamchi",
    label: "قلم‌چی",
    prompts: ["ثبت نام قلم چی", "برنامه آزمون", "کارنامه ها"],
  },
  {
    id: "summer",
    label: "تابستان",
    prompts: ["باشگاه تابستانی", "ثبت نام تابستان"],
  },
  {
    id: "career",
    label: "مسیر شغلی",
    prompts: ["انتخاب رشته", "آینده شغلی"],
  },
] as const;

export const ATRIN_TASK_TEMPLATES = [
  {
    id: "today",
    title: "تمرین امروز",
    kind: "homework" as const,
    hint: "۳۰ دقیقه مرور مفهوم",
    prompt: "برای امروز یک تمرین کوتاه مطالعاتی پیشنهاد بده.",
  },
  {
    id: "week",
    title: "هدف این هفته",
    kind: "planning" as const,
    hint: "۳ جلسه مطالعه متمرکز",
    prompt: "برایم برنامه مطالعاتی بنویس",
  },
  {
    id: "upcoming",
    title: "یادآوری نزدیک",
    kind: "reminder" as const,
    hint: "هماهنگی با مشاور",
    prompt: "شرایط ثبت نام چیست؟",
  },
  {
    id: "reading",
    title: "مطالعه پیشنهادی",
    kind: "reading" as const,
    hint: "مرور خلاصه درس",
    prompt: "سوال ریاضی دارم",
  },
] as const;

/** Trust metrics — reused from About content layer (no duplicated literals). */
export const ATRIN_TRUST_STATS = aboutPageContent.statistics.items;

export const ATRIN_TRUST_TIMELINE = aboutPageContent.story.timeline;

export const ATRIN_LANDING_EXTRA = {
  howItWorks: [
    { title: "سؤال بپرسید", body: "با زبان ساده درباره درس، پذیرش یا مشاوره بنویسید." },
    { title: "حالت هوشمند", body: "آترین حالت مناسب را تشخیص می‌دهد و چیدمان را عوض می‌کند." },
    { title: "اقدام کنید", body: "کارت‌های اقدام شما را به مسیر درست سایت می‌برند." },
  ],
  faq: [
    {
      q: "آترین جایگزین مشاور انسانی است؟",
      a: "خیر؛ آترین راهنمای هوشمند اولیه است و برای تصمیم‌های مهم به مشاور ارجاع می‌دهد.",
    },
    {
      q: "داده‌های من کجا ذخیره می‌شود؟",
      a: "حافظه سبک فقط روی دستگاه شماست و قابل پاک‌سازی است.",
    },
    {
      q: "آیا به CRM وصل است؟",
      a: "در این نسخه فقط لایه نمایش و آماده‌سازی است؛ بدون نوشتن در CRM.",
    },
  ],
  roadmap: [
    { title: "الان", body: "تجربه یکپارچه، حالت‌ها، کارت‌ها و حافظه محلی" },
    { title: "بعدی", body: "اتصال کنترل‌شده به پذیرش و پیگیری لید" },
    { title: "آینده", body: "برنامه شخصی‌سازی‌شده و گزارش پیشرفت" },
  ],
} as const;
