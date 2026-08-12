/**
 * آترین — public brand & UX copy (UI only).
 * OS modes / personality live in content/atrin-os.ts
 */

export {
  ATRIN_MODES,
  ATRIN_PERSONALITY,
  ATRIN_COMMANDS,
  ATRIN_PROMPT_GROUPS,
  ATRIN_TASK_TEMPLATES,
  ATRIN_TRUST_STATS,
  ATRIN_TRUST_TIMELINE,
  ATRIN_LANDING_EXTRA,
  type AtrinModeId,
  type AtrinPersonalityState,
  type AtrinModeConfig,
} from "@/content/atrin-os";

export const ATRIN_BRAND = {
  name: "آترین",
  product: "آترین",
  subtitle: "همراه آموزشی مؤسسه علمی ستارگان",
  institutionLine: "همراه آموزشی مؤسسه علمی ستارگان",
  statusOnline: "آنلاین",
  closeLabel: "بستن آترین",
  backdropLabel: "بستن پس‌زمینه آترین",
  composerLabel: "پیام به آترین",
  clearLabel: "پاک کردن گفتگو",
  fabAria: "آترین — هر سوالی داری بپرس",
  fabHeadline: "آترین",
  fabCaption: "هر سوالی داری بپرس 🙂",
} as const;

/** Primary launcher CTA — warm, human, no AI/robot language. */
export const ATRIN_LAUNCHER_CTA = "هر سوالی داری بپرس 🙂";

/** @deprecated Prefer ATRIN_LAUNCHER_CTA — kept for any legacy imports. */
export const ATRIN_LAUNCHER_ROTATIONS = [
  ATRIN_LAUNCHER_CTA,
] as const;

export const ATRIN_HERO = {
  greeting: "سلام 👋",
  invite: "هر سوالی داری بپرس.",
  headline: "آترین",
  role: "همراه آموزشی مؤسسه علمی ستارگان",
  descriptionLead: "",
  topics: [] as const,
  descriptionTail: "",
  ctaPrimary: "",
  ctaSecondary: "",
  secondaryHref: "/about",
  quickStartTitle: "یا یکی از این مسیرها را انتخاب کن.",
} as const;

export type AtrinQuickChipId =
  | "lesson"
  | "counsel"
  | "school"
  | "prereg"
  | "gifted"
  | "free";

export const ATRIN_QUICK_QUESTIONS = [
  {
    id: "lesson" as const,
    emoji: "📚",
    label: "سوال درسی",
  },
  {
    id: "counsel" as const,
    emoji: "🎯",
    label: "مشاوره",
  },
  {
    id: "school" as const,
    emoji: "🏫",
    label: "معرفی مؤسسه",
  },
  {
    id: "prereg" as const,
    emoji: "📝",
    label: "پیش‌ثبت‌نام",
  },
  {
    id: "gifted" as const,
    emoji: "🏆",
    label: "تیزهوشان و نمونه دولتی",
  },
  {
    id: "free" as const,
    emoji: "💬",
    label: "هرچی دوست داری...",
  },
] as const;

export const ATRIN_STUDY_SECTIONS = [
  { id: "lesson", label: "درس" },
  { id: "explanation", label: "توضیح" },
  { id: "examples", label: "مثال‌ها" },
  { id: "exercises", label: "تمرین" },
  { id: "quiz", label: "آزمونک" },
  { id: "resources", label: "منابع" },
] as const;

export const ATRIN_STUDY_ACTIONS = [
  {
    id: "photo",
    label: "ارسال عکس سوال",
    hint: "صورت سؤال را مرور کنیم",
    type: "chat" as const,
    prompt:
      "یک عکس از سؤال دارم. لطفاً راهنمایی کن تا صورت سؤال را دقیق بنویسم و قدم‌به‌قدم حل کنیم.",
  },
  {
    id: "type",
    label: "تایپ سوال",
    hint: "سؤال را همین‌جا بنویس",
    type: "chat" as const,
    prompt: "سوال ریاضی دارم",
  },
  {
    id: "plan",
    label: "برنامه مطالعاتی",
    hint: "برنامه شخصی‌سازی‌شده",
    type: "chat" as const,
    prompt: "برایم برنامه مطالعاتی بنویس",
  },
] as const;

export const ATRIN_COUNSELOR_GOALS = [
  {
    id: "plan",
    title: "برنامه مطالعاتی",
    subtitle: "ساختار هفتگی و اولویت‌ها",
    type: "chat" as const,
    prompt: "برایم برنامه مطالعاتی بنویس",
  },
  {
    id: "gifted",
    title: "تیزهوشان",
    subtitle: "آمادگی هدفمند",
    type: "navigate" as const,
    href: "/courses",
  },
  {
    id: "konkur",
    title: "کنکور",
    subtitle: "مسیر بلندمدت",
    type: "navigate" as const,
    href: "/consultation",
  },
] as const;

export const ATRIN_PARENT_CARDS = [
  {
    id: "admissions",
    title: "پذیرش",
    subtitle: "پیش‌ثبت‌نام و مدارک",
    type: "open-form" as const,
    href: "/pre-registration",
  },
  {
    id: "tuition",
    title: "شهریه",
    subtitle: "استعلام و راهنما",
    type: "navigate" as const,
    href: "/contact",
  },
  {
    id: "consultation",
    title: "مشاوره",
    subtitle: "جلسه با مشاور",
    type: "navigate" as const,
    href: "/consultation",
  },
  {
    id: "achievements",
    title: "افتخارات",
    subtitle: "نتایج و قبولی‌ها",
    type: "navigate" as const,
    href: "/achievements",
  },
] as const;

export const ATRIN_LANDING = {
  metaTitle: "آترین | همراه آموزشی مؤسسه علمی ستارگان",
  metaDescription:
    "آترین، همراه آموزشی مؤسسه علمی ستارگان — مشاوره، ثبت‌نام، قلم‌چی، تیزهوشان و سؤالات درسی.",
  heroEyebrow: "آترین",
  heroTitle: "آینده گفتگو با آموزش",
  heroBody:
    "آترین همراه گرم آموزشی مؤسسه علمی ستارگان است؛ حرفه‌ای و همیشه در کنار مسیر موفقیت.",
  capabilities: [
    {
      title: "راهنمای مؤسسه",
      body: "مدرسه، قلم‌چی، دوره‌ها و مسیر ثبت‌نام را شفاف توضیح می‌دهد.",
    },
    {
      title: "مشاوره تحصیلی",
      body: "برنامه مطالعاتی، تیزهوشان، کنکور و انتخاب رشته.",
    },
    {
      title: "همراه والدین",
      body: "پذیرش، شهریه، تماس و افتخارات با لحن دوستانه.",
    },
    {
      title: "حالت مطالعه",
      body: "ارائه درس، مثال، تمرین و منابع به‌صورت منظم و خوانا.",
    },
    {
      title: "پذیرش هوشمند",
      body: "پیش‌ثبت‌نام، مدارک و اقدام‌های سریع.",
    },
    {
      title: "حافظه سبک",
      body: "یادآوری پایه و علاقه‌ها فقط روی دستگاه شما.",
    },
  ],
  stats: [
    { value: "۲۴/۷", label: "آماده پاسخگویی" },
    { value: "۱۰", label: "حالت گفتگو" },
    { value: "۱۰۰٪", label: "تمرکز بر آموزش" },
    { value: "RTL", label: "طراحی بومی فارسی" },
  ],
  examples: [
    {
      q: "شهریه دبستان چقدر است؟",
      a: "آترین مسیر استعلام رسمی و تماس با مشاور را نشان می‌دهد.",
    },
    {
      q: "برای تیزهوشان از کجا شروع کنم؟",
      a: "حالت تیزهوشان فعال می‌شود و گام بعدی پیشنهاد می‌گردد.",
    },
    {
      q: "پیش ثبت نام چطور است؟",
      a: "کارت‌های اقدام مستقیم به فرم و مدارک هدایت می‌کنند.",
    },
  ],
  popular: [
    "پیش ثبت نام",
    "قلم چی",
    "تیزهوشان",
    "شهریه",
    "مشاوره تحصیلی",
    "انتخاب رشته",
  ],
  services: [
    { label: "پیش‌ثبت‌نام", href: "/pre-registration" },
    { label: "مشاوره", href: "/consultation" },
    { label: "قلم‌چی", href: "/ghalamchi/register" },
    { label: "دوره‌ها", href: "/courses" },
    { label: "افتخارات", href: "/achievements" },
    { label: "تماس", href: "/contact" },
  ],
  testimonials: [
    {
      quote: "فضای گفتگو با آترین حس یک مشاور واقعی می‌دهد.",
      name: "والدین — به‌زودی",
    },
    {
      quote: "پیدا کردن مسیر ثبت‌نام خیلی سریع‌تر شد.",
      name: "دانش‌آموز — به‌زودی",
    },
  ],
  ctaTitle: "همین حالا با آترین گفتگو کنید",
  ctaBody: "سریع، روشن و مخصوص مؤسسه علمی ستارگان.",
} as const;
