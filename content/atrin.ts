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
  product: "آترین AI",
  subtitle: "همراه هوشمند آموزش و موفقیت",
  institutionLine: "دستیار هوشمند مؤسسه علمی ستارگان",
  statusOnline: "آنلاین",
  closeLabel: "بستن آترین",
  backdropLabel: "بستن پس‌زمینه آترین",
  composerLabel: "پیام به آترین",
  clearLabel: "پاک کردن گفتگو",
  fabAria: "باز کردن آترین، دستیار هوشمند مؤسسه علمی ستارگان",
} as const;

export const ATRIN_LAUNCHER_ROTATIONS = [
  "از آترین چیزی بپرس…",
  "برنامه مطالعاتی می‌خواهی؟",
  "تیزهوشان؟",
  "شهریه؟",
  "پیش ثبت نام؟",
] as const;

export const ATRIN_HERO = {
  greeting: "سلام 👋",
  headline: "من آترین هستم",
  role: "مشاور هوشمند مؤسسه علمی ستارگان",
  descriptionLead: "هر سوالی درباره",
  topics: [
    "مدرسه",
    "ثبت نام",
    "پیش ثبت نام",
    "قلم چی",
    "تیزهوشان",
    "برنامه ریزی",
    "انتخاب رشته",
    "سوالات درسی",
    "مشاوره تحصیلی",
  ] as const,
  descriptionTail: "از من بپرسید.",
  ctaPrimary: "شروع گفتگو",
  ctaSecondary: "خدمات مؤسسه",
  secondaryHref: "/about",
} as const;

export const ATRIN_QUICK_QUESTIONS = [
  { id: "lesson", emoji: "📚", label: "سوال درسی", prompt: "یک سوال درسی دارم" },
  {
    id: "counsel",
    emoji: "🧠",
    label: "مشاوره تحصیلی",
    prompt: "مشاوره تحصیلی می‌خواهم",
  },
  {
    id: "institute",
    emoji: "🏫",
    label: "معرفی مؤسسه",
    prompt: "درباره مؤسسه علمی ستارگان بگو",
  },
  {
    id: "prereg",
    emoji: "📝",
    label: "پیش ثبت نام",
    prompt: "پیش ثبت نام",
  },
  {
    id: "gifted",
    emoji: "🏆",
    label: "تیزهوشان",
    prompt: "آمادگی تیزهوشان",
  },
  { id: "ghalamchi", emoji: "📖", label: "قلم چی", prompt: "قلم چی" },
  {
    id: "plan",
    emoji: "🎯",
    label: "برنامه مطالعاتی",
    prompt: "برنامه مطالعاتی می‌خواهم",
  },
  { id: "tuition", emoji: "💰", label: "شهریه", prompt: "شهریه" },
  { id: "contact", emoji: "📍", label: "تماس", prompt: "تماس" },
  {
    id: "major",
    emoji: "🎓",
    label: "انتخاب رشته",
    prompt: "انتخاب رشته",
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
  { id: "pdf", label: "دانلود PDF", href: "/courses", hint: "مسیر دوره‌ها" },
  { id: "video", label: "ویدیو", href: "/gallery", hint: "گالری و محتوا" },
  { id: "practice", label: "تمرین", href: "/exams", hint: "آزمون و تمرین" },
] as const;

export const ATRIN_COUNSELOR_GOALS = [
  {
    id: "plan",
    title: "برنامه مطالعاتی",
    subtitle: "ساختار هفتگی و اولویت‌ها",
    href: "/consultation",
  },
  {
    id: "gifted",
    title: "تیزهوشان",
    subtitle: "آمادگی هدفمند",
    href: "/courses",
  },
  {
    id: "konkur",
    title: "کنکور",
    subtitle: "مسیر بلندمدت",
    href: "/consultation",
  },
] as const;

export const ATRIN_PARENT_CARDS = [
  {
    id: "admissions",
    title: "پذیرش",
    subtitle: "پیش‌ثبت‌نام و مدارک",
    href: "/pre-registration",
  },
  {
    id: "tuition",
    title: "شهریه",
    subtitle: "استعلام و راهنما",
    href: "/contact",
  },
  {
    id: "consultation",
    title: "مشاوره",
    subtitle: "جلسه با مشاور",
    href: "/consultation",
  },
  {
    id: "achievements",
    title: "افتخارات",
    subtitle: "نتایج و قبولی‌ها",
    href: "/achievements",
  },
] as const;

export const ATRIN_LANDING = {
  metaTitle: "آترین AI | دستیار هوشمند مؤسسه علمی ستارگان",
  metaDescription:
    "آترین، همراه هوشمند آموزش و موفقیت — مشاوره، ثبت‌نام، قلم‌چی، تیزهوشان و سؤالات درسی.",
  heroEyebrow: "آترین AI",
  heroTitle: "آینده گفتگو با آموزش",
  heroBody:
    "آترین چهره عمومی هوش مصنوعی StarOS است؛ گرم، حرفه‌ای و همیشه در کنار مسیر موفقیت.",
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
