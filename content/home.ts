// ─────────────────────────────────────────────────────────────────────────────
// Homepage content — ستارگان پلاس / مرکز آموزشی نسیم‌شهر
// Verified facts only. Items marked isPlaceholder must NOT render as real data.
// Media: url is null until resolved from StarOS media library (admin uploads).
// ─────────────────────────────────────────────────────────────────────────────

import type { MediaAsset } from "@/lib/media";

/** Official branding hierarchy (top → bottom) */
export const branding = {
  primary: "ستارگان پلاس",
  secondary: "مرکز آموزشی نسیم‌شهر",
  tertiary: "نمایندگی کانون فرهنگی آموزش (قلم‌چی)",
} as const;

export const officialSlogan = "چون تو لایق بهترینی..." as const;

// ─── Statistics (institution vs school — never mix) ──────────────────────────

/**
 * مرکز آموزشی ستارگان پلاس / نمایندگی قلم‌چی نسیم‌شهر
 * Primary homepage statistics — hero and institution achievements.
 */
export const institutionStats = [
  { value: "۸۷", label: "دبیر و مشاور آموزشی" },
  { value: "۱۵۶۰+", label: "فارغ‌التحصیل" },
  { value: "۷۳", label: "رتبه زیر ۱۰۰۰" },
  { value: "۵۹", label: "قبولی تیزهوشان و نمونه دولتی" },
] as const;

export const institutionStatsDetail = {
  teachersAndConsultants: 87,
  graduates: "1560+",
  ranksUnder1000: 73,
  ranksUnder1000Note: "در سه رشته تحصیلی",
  giftedAndNemuneAdmissions: 59,
} as const;

/**
 * دبستان غیردولتی ستارگان آینده only — school-specific section in About.
 * Must NOT appear in hero or institution achievement blocks.
 */
export const schoolStats = {
  foundedYear: "۱۴۰۱",
  classrooms: 9,
  teachers: 23,
  graduates: 255,
  giftedAdmissions: 9,
  facilities: [
    { title: "کلاس‌های هوشمند", description: "فضای آموزشی مجهز به فناوری روز" },
    { title: "آزمایشگاه", description: "آموزش عملی علوم با تجهیزات آزمایشگاهی" },
    { title: "حیاط مدرسه", description: "فضای باز مناسب برای فعالیت و بازی دانش‌آموزان" },
  ],
} as const;

/** @deprecated Use institutionStats — kept for components not yet updated */
export const heroStats = institutionStats;

/**
 * Distinct institution entities — do not merge in copy or UI.
 * دبستان ستارگان آینده ≠ مرکز ستارگان پلاس ≠ نمایندگی قلم‌چی
 */
export const institutionEntities = {
  setareganAyandeh: {
    name: "دبستان غیردولتی ستارگان آینده",
    role: "مؤسسه آموزشی پایه ابتدایی",
    description:
      "دبستان غیردولتی ستارگان آینده، مؤسسه آموزشی مجزا در مقطع ابتدایی است. این مدرسه در سال ۱۴۰۱ تأسیس شده و امکاناتی شامل کلاس‌های هوشمند، آزمایشگاه و حیاط مدرسه دارد.",
  },
  setareganPlus: {
    name: "مرکز آموزشی ستارگان پلاس",
    role: "مرکز آموزشی تکمیلی و آمادگی تحصیلی",
    description:
      "مرکز آموزشی ستارگان پلاس، بخش آموزشی تکمیلی مجموعه ستارگان است و خدمات دوره‌ای، کلاس‌های تقویتی، آزمون و مشاوره را با تیمی از ۸۷ دبیر و مشاور آموزشی ارائه می‌دهد.",
  },
  ghalamchiBranch: {
    name: "نمایندگی رسمی کانون فرهنگی آموزش (قلم‌چی) نسیم‌شهر",
    role: "نمایندگی رسمی کانون قلم‌چی",
    description:
      "نمایندگی رسمی کانون فرهنگی آموزش (قلم‌چی) نسیم‌شهر، برنامه آموزشی، آزمون‌ها و خدمات مشاوره مطابق استانداردهای کانون قلم‌چی را در نسیم‌شهر ارائه می‌دهد.",
  },
} as const;

// ─── Hero ────────────────────────────────────────────────────────────────────

export const heroContent = {
  /** Primary brand label above the logo mark */
  brand: branding.primary,
  title: "جایی که آینده ساخته می‌شود.",
  subtitle:
    "از نخستین گام دبستان تا موفقیت در مدارس برتر، تیزهوشان، نمونه دولتی، کنکور و انتخاب رشته، کنار دانش‌آموزان هستیم.",
  affiliation: "نمایندگی رسمی کانون فرهنگی آموزش (قلم‌چی)",
  slogan: officialSlogan,
  description:
    "از نخستین گام دبستان تا موفقیت در مدارس برتر، تیزهوشان، نمونه دولتی، کنکور و انتخاب رشته، کنار دانش‌آموزان هستیم.",
  eyebrow: "مؤسسه علمی ستارگان",
  /** Scroll cue — CMS-ready */
  scrollHint: "ادامه مسیر",
} as const;

/**
 * @deprecated Carousel scenes removed — single cinematic hero only.
 * Kept empty for gradual migration of older imports.
 */
export const heroScenes = [] as const;

/** @deprecated Live ticker removed from homepage hero (no rotating chrome). */
export const heroTickerItems = [] as const;

/** @deprecated Scene rotation removed. */
export const heroSceneIntervalMs = 0;

/** StarOS media slots — assign url from media library when available */
export const heroMedia = {
  logo: {
    url: "/images/brand/logo.png",
    alt: "لوگوی مؤسسه علمی ستارگان",
  } satisfies MediaAsset,
  /** JPG fallback kept for legacy / emergency use — prefer logo.png */
  logoFallback: {
    url: "/images/brand/logo.jpg",
    alt: "لوگوی مؤسسه علمی ستارگان",
  } satisfies MediaAsset,
  ghalamchiLogo: {
    url: "/images/brand/ghalamchi.jpg",
    alt: "لوگوی کانون فرهنگی آموزش قلم‌چی — نمایندگی نسیم‌شهر",
  } satisfies MediaAsset,
  /**
   * Optional cinematic hero video (mp4/webm). When null, cover image is used.
   * Assign from StarOS media / public assets when available — never broken URL.
   */
  video: {
    url: null as string | null,
    alt: "ویدیوی معرفی فضای آموزشی ستارگان پلاس",
  } satisfies MediaAsset,
  background: {
    url: "/images/hero/hero.jpg",
    alt: "دانش‌آموزان و فضای آموزشی نمایندگی قلم‌چی نسیم‌شهر",
  } satisfies MediaAsset,
} as const;

/** @deprecated Use heroMedia — kept for gradual migration */
export const heroImages = {
  logo: heroMedia.logo.url,
  ghalamchiLogo: heroMedia.ghalamchiLogo.url,
  background: heroMedia.background.url,
  founder: null,
  campus: null,
} as const;

export const founderContent = {
  name: "رضا ابراهیمی",
  roles: [
    "فارغ‌التحصیل دانشگاه صنعتی امیرکبیر (پلی‌تکنیک تهران)",
    "مؤسس دبستان غیردولتی ستارگان آینده",
    "مدیرعامل مؤسسه آموزشی ستارگان",
    "مسئول نمایندگی قلم‌چی نسیم‌شهر",
    "مؤلف کتاب ریاضی جامع کنکور",
    "بیش از ۱۳ سال سابقه تدریس، مشاوره و برنامه‌ریزی تحصیلی",
  ],
  bio: "رضا ابراهیمی، مؤسس و مدیرعامل مؤسسه آموزشی ستارگان، مدیر نمایندگی رسمی قلم‌چی نسیم‌شهر و مدیر دبستان غیردولتی ستارگان آینده است. ایشان به‌عنوان مدرس و مؤلف ریاضیات، راهبری آموزشی مجموعه ستارگان را بر عهده دارند.",
  portrait: {
    url: "/images/founder/portrait.jpg",
    alt: "پرتره رضا ابراهیمی، مؤسس و مدیرعامل مؤسسه آموزشی ستارگان",
  } satisfies MediaAsset,
} as const;

export const heroCtas = {
  primary: { label: "ثبت‌نام", href: "/pre-registration" },
  secondary: { label: "مشاهده افتخارات", href: "/achievements" },
  tertiary: { label: "رزرو مشاوره", href: "/consultation" },
  shop: { label: "فروشگاه آموزشی", href: "/shop" },
  /** @deprecated Use shop — kept for gradual migration */
  gallery: { label: "فروشگاه آموزشی", href: "/shop" },
} as const;

/**
 * Homepage hero trust stats — CMS-ready placeholders.
 * Teacher count intentionally omitted. Values are editable later via content/CMS.
 */
export const heroDisplayStats = [
  {
    id: "founded",
    value: "۱۳۹۴",
    label: "سال تأسیس",
    editable: false,
  },
  {
    id: "graduates",
    value: "—",
    label: "فارغ‌التحصیلان",
    editable: true,
  },
  {
    id: "top-school-admissions",
    value: "—",
    label: "قبولی مدارس برتر",
    editable: true,
  },
  {
    id: "active-students",
    value: "—",
    label: "دانش‌آموزان فعال",
    editable: true,
  },
] as const;

// ─── Contact (verified — shared by FinalCta and Contact sections) ────────────

export const contactContent = {
  phones: [
    { value: "۰۲۱۵۶۷۶۶۷۷۲", href: "tel:02156766772" },
    { value: "۰۲۱۵۶۷۶۶۸۷۴", href: "tel:02156766874" },
    { value: "۰۹۳۸۰۱۹۰۵۸۶", href: "tel:09380190586" },
    { value: "۰۹۳۸۴۵۶۷۰۵۴", href: "tel:09384567054" },
  ],
  hours: {
    daily: "هر روز: ۱۲:۰۰ تا ۲۰:۳۰",
    thursday: "پنج‌شنبه: ۱۰:۰۰ تا ۲۰:۳۰",
  },
  branches: [
    {
      name: "شعبه پسران",
      address:
        "نسیم‌شهر، خیابان امام خمینی، بین بانک مسکن و کلانتری، کوچه مدرسه، پلاک ۵",
      mapUrl: "https://maps.app.goo.gl/jKQLs65S6Jv8MfKv8?g_st=ac",
    },
    {
      name: "شعبه دختران",
      address:
        "نسیم‌شهر، خیابان امام خمینی، نرسیده به خیابان سوم، کوچه پاییزان، پلاک ۱۸۸",
      mapUrl: "https://maps.app.goo.gl/b8b8v3bMTGksEUhMA?g_st=ac",
    },
    {
      name: "دبستان غیردولتی ستارگان آینده",
      address:
        "نسیم‌شهر، خیابان امام خمینی، بین خیابان اول و دوم، روبروی پلیس ۱۰+",
      mapUrl: "https://maps.app.goo.gl/EBx391TsJ8jv3UsY9",
    },
  ],
  social: [
    {
      platform: "اینستاگرام",
      label: "Ghalamchinasimshahr",
      href: "https://instagram.com/Ghalamchinasimshahr",
    },
    {
      platform: "بله",
      label: "کانال بله",
      href: "https://ble.ir/join/ANGRKipzkv",
    },
    {
      platform: "تلگرام",
      label: "کانال تلگرام",
      href: "https://t.me/setareganinstitute1",
    },
  ],
} as const;

// ─── About ───────────────────────────────────────────────────────────────────

export const aboutContent = {
  eyebrow: "دبستان ستارگان آینده",
  heading: "دبستان غیردولتی ستارگان آینده",
  description:
    "مقطع ابتدایی مجموعه ستارگان با فضای آموزشی مستقل، امکانات تخصصی و مسیر روشن برای رشد دانش‌آموزان.",
  cover: {
    url: "/images/about/about.png" as string | null,
    alt: "نمای تابلوی نمایندگی قلم‌چی شعبه پسران",
  } satisfies MediaAsset,
  branches: {
    eyebrow: "کانون فرهنگی آموزش",
    heading: "نمایندگی رسمی کانون فرهنگی آموزش (قلم‌چی)",
    description: "دو شعبه فعال برای دانش‌آموزان دختر و پسر",
    items: [
      {
        title: "شعبه دختران",
        description: "ویژه دانش‌آموزان دختر",
        media: {
          url: "/images/about/girls-branch.png",
          alt: "تابلوی نمایندگی قلم‌چی شعبه دختران نسیم‌شهر",
        } satisfies MediaAsset,
      },
      {
        title: "شعبه پسران",
        description: "ویژه دانش‌آموزان پسر",
        media: {
          url: "/images/about/about.png",
          alt: "تابلوی نمایندگی قلم‌چی شعبه پسران نسیم‌شهر",
        } satisfies MediaAsset,
      },
    ],
  },
  lead:
    "دبستان غیردولتی ستارگان آینده از سال ۱۴۰۱ فعالیت می‌کند و با ۹ کلاس درس، تیم ۲۳ نفرهٔ دبیران و امکاناتی شامل کلاس‌های هوشمند، آزمایشگاه و حیاط مدرسه، مسیر ابتدایی را پوشش می‌دهد.",
  entities: [
    institutionEntities.setareganAyandeh,
    institutionEntities.setareganPlus,
    institutionEntities.ghalamchiBranch,
  ],
  schoolSection: {
    heading: "حقایق رسمی دبستان",
    description:
      "آمار و امکانات زیر مختص دبستان غیردولتی ستارگان آینده است.",
    stats: schoolStats,
  },
  relatedNote:
    "مرکز آموزشی ستارگان پلاس و نمایندگی رسمی قلم‌چی نسیم‌شهر، بخش‌های تکمیلی همان مجموعه هستند و آمار آن‌ها جداگانه گزارش می‌شود.",
  cta: { label: "بیشتر بدانید", href: "/about" },
} as const;

// ─── Why Setaregan (storytelling — not metric cards) ─────────────────────────

export const whySetareganContent = {
  eyebrow: "چرا ستارگان",
  heading: "جایی که اعتماد ساخته می‌شود",
  description:
    "ستارگان پلاس فقط کلاس نیست؛ یک اکوسیستم آموزشی است که تجربه، منتورینگ، برنامه‌ریزی، نتیجه و فناوری را در یک مسیر منسجم کنار هم می‌گذارد.",
} as const;

export const whySetareganPillars = [
  {
    id: "experience",
    title: "تجربه",
    description:
      "سال‌ها حضور در میدان آموزش نسیم‌شهر و نمایندگی رسمی قلم‌چی؛ درک واقعی از دغدغه خانواده و مسیر دانش‌آموز.",
  },
  {
    id: "mentoring",
    title: "منتورینگ",
    description:
      "همراهی انسانی مشاور و دبیر؛ نه نسخه‌ی کلی، بلکه راهنمایی متناسب با پایه، هدف و شخصیت هر دانش‌آموز.",
  },
  {
    id: "planning",
    title: "برنامه‌ریزی",
    description:
      "مسیر شفاف از دبستان تا کنکور و انتخاب رشته؛ با گام‌های قابل اندازه‌گیری و پیگیری منظم.",
  },
  {
    id: "results",
    title: "نتایج",
    description:
      "تمرکز روی خروجی واقعی: پیشرفت درسی، آمادگی آزمون و تصمیم آگاهانه برای آینده تحصیلی.",
  },
  {
    id: "technology",
    title: "فناوری",
    description:
      "سکوی دیجیتال ستارگان پلاس و آترین؛ دسترسی سریع‌تر به راهنمایی، ثبت‌نام و خدمات مکمل.",
  },
] as const;

/** @deprecated Prefer whySetareganContent — kept for gradual migration */
export const trustSectionContent = {
  eyebrow: whySetareganContent.eyebrow,
  heading: whySetareganContent.heading,
  description: whySetareganContent.description,
} as const;

/** @deprecated Prefer whySetareganPillars */
export const trustItems = whySetareganPillars.map((pillar) => ({
  title: pillar.title,
  description: pillar.description,
}));

export const whyChooseContent = whySetareganContent;
export const whyChooseItems = trustItems;

// ─── Educational journey ─────────────────────────────────────────────────────

export const educationalJourneyContent = {
  eyebrow: "مسیر رشد",
  heading: "سفر آموزشی ستارگان",
  description:
    "از نخستین کلاس تا انتخاب رشته؛ هر مرحله یک ایستگاه روشن با هدف مشخص.",
} as const;

export const educationalJourney = [
  {
    id: "elementary",
    title: "دبستان",
    description: "پایه‌ای محکم برای عشق به یادگیری و عادت‌های درست مطالعه.",
    href: "/about",
    mark: "۱",
  },
  {
    id: "middle",
    title: "متوسطه اول",
    description: "تقویت بنیان درسی و آمادگی برای مسیرهای برتر تحصیلی.",
    href: "/courses",
    mark: "۲",
  },
  {
    id: "high",
    title: "متوسطه دوم",
    description: "برنامه منسجم پایه‌های دهم تا دوازدهم و امتحانات نهایی.",
    href: "/courses",
    mark: "۳",
  },
  {
    id: "konkur",
    title: "کنکور",
    description: "آمادگی هدفمند با برنامه، آزمون و همراهی مشاور.",
    href: "/courses",
    mark: "۴",
  },
  {
    id: "major",
    title: "انتخاب رشته",
    description: "تصمیم آگاهانه برای آینده؛ هم‌راستا با استعداد و هدف.",
    href: "/consultation",
    mark: "۵",
  },
] as const;

/** @deprecated Prefer educationalJourney */
export const servicesSectionContent = educationalJourneyContent;
export const educationalPaths = educationalJourney.map((step) => ({
  title: step.title,
  description: step.description,
  href: step.href,
}));

// ─── Achievements (institution only) ─────────────────────────────────────────

export const achievementsContent = {
  eyebrow: "افتخارات",
  heading: "اثبات مسیر",
  description:
    "ویترین افتخارات، نشان‌ها و مسیر زمانی موفقیت‌ها — بدون آمار ساختگی.",
  showcaseEyebrow: "ویترین افتخارات",
  showcaseHeading: "موفقیت‌هایی که اعتماد می‌سازد",
  showcaseDescription:
    "افتخارات برجسته از سامانه محتوا؛ وقتی محتوا آماده باشد اینجا نمایش داده می‌شود.",
  showcaseCta: { label: "مشاهده همه افتخارات", href: "/achievements" },
  timelineHeading: "نشان‌ها و مسیر",
  timelineDescription: "شاخص‌های قابل ویرایش از محتوا/CMS — بدون شمارش دبیر.",
} as const;

/**
 * Homepage achievement metrics — CMS-ready placeholders.
 * Teacher count intentionally omitted.
 */
export const achievementPlaceholders = [
  {
    id: "founded",
    value: "۱۳۹۴",
    label: "سال تأسیس",
    editable: false,
  },
  {
    id: "graduates",
    value: "—",
    label: "فارغ‌التحصیلان",
    editable: true,
  },
  {
    id: "top-school-admissions",
    value: "—",
    label: "قبولی مدارس برتر",
    editable: true,
  },
  {
    id: "ranks",
    value: "—",
    label: "رتبه‌های برجسته",
    editable: true,
  },
] as const;

export const achievementTimeline = [
  {
    id: "foundation",
    year: "۱۳۹۴",
    title: "آغاز مسیر",
    description: "شکل‌گیری هویت آموزشی ستارگان در نسیم‌شهر.",
  },
  {
    id: "ghalamchi",
    year: "—",
    title: "نمایندگی قلم‌چی",
    description: "گسترش خدمات آزمون و برنامه استاندارد کانون.",
  },
  {
    id: "ecosystem",
    year: "امروز",
    title: "اکوسیستم دیجیتال",
    description: "ستارگان پلاس و آترین برای همراهی خانواده‌ها.",
  },
] as const;

/** @deprecated Prefer achievementPlaceholders for homepage */
export const achievementItems = achievementPlaceholders.map((item) => ({
  metric: item.value,
  title: item.label,
  description: item.editable
    ? "مقدار از محتوا/CMS قابل ویرایش است."
    : "واقعیت تأییدشده مؤسسه.",
}));

/** School-only achievements — for About section, not homepage hero */
export const schoolAchievementItems = [
  {
    metric: "۱۴۰۱",
    title: "سال تأسیس دبستان",
    description: "آغاز فعالیت دبستان غیردولتی ستارگان آینده",
  },
  {
    metric: "۹",
    title: "کلاس درس",
    description: "۹ کلاس درس مجهز در دبستان ستارگان آینده",
  },
  {
    metric: "۲۳",
    title: "دبیر",
    description: "تیم آموزشی دبستان متشکل از ۲۳ دبیر",
  },
  {
    metric: "۲۵۵",
    title: "فارغ‌التحصیل",
    description: "۲۵۵ دانش‌آموز از دبستان ستارگان آینده فارغ‌التحصیل شده‌اند",
  },
  {
    metric: "۹",
    title: "قبولی تیزهوشان",
    description: "۹ قبولی در آزمون ورود به مدارس تیزهوشان",
  },
] as const;

// ─── Ghalamchi partnership ───────────────────────────────────────────────────

export const partnershipContent = {
  eyebrow: "همکاری رسمی",
  heading: "نمایندگی رسمی کانون فرهنگی آموزش (قلم‌چی) نسیم‌شهر",
  description:
    "مرکز آموزشی ستارگان پلاس به‌عنوان نمایندگی رسمی کانون فرهنگی آموزش (قلم‌چی) نسیم‌شهر فعالیت می‌کند.",
  statement:
    "نمایندگی رسمی کانون فرهنگی آموزش (قلم‌چی) نسیم‌شهر برنامه آموزشی، آزمون‌های منظم و محتوای آموزشی مطابق استانداردهای کانون قلم‌چی را در اختیار دانش‌آموزان نسیم‌شهر قرار می‌دهد.",
  slogan: officialSlogan,
  logos: {
    institution: {
      url: "/images/brand/logo.png",
      alt: "لوگوی مؤسسه علمی ستارگان",
    } satisfies MediaAsset,
    ghalamchi: {
      url: "/images/brand/ghalamchi.jpg",
      alt: "لوگوی کانون فرهنگی آموزش قلم‌چی — نمایندگی نسیم‌شهر",
    } satisfies MediaAsset,
  },
  benefits: [
    {
      title: "برنامه استاندارد کانون",
      description: "اجرای برنامه آموزشی یکپارچه مطابق کانون فرهنگی آموزش قلم‌چی",
      badge: "قلم‌چی",
    },
    {
      title: "آزمون‌های منظم",
      description: "برگزاری آزمون‌های آموزشی در چارچوب نظام ارزیابی کانون قلم‌چی",
      badge: "قلم‌چی",
    },
    {
      title: "محتوای آموزشی کانون",
      description: "دسترسی به منابع و محتوای آموزشی کانون قلم‌چی",
      badge: "قلم‌چی",
    },
    {
      title: "مشاوره تحصیلی",
      description: "راهنمایی تحصیلی در مسیر کنکور و انتخاب رشته",
      badge: "ستارگان پلاس",
    },
  ],
  externalLink: {
    label: "وب‌سایت کانون قلم‌چی",
    href: "https://www.kanoon.ir",
  },
} as const;

// ─── Student success stories ───────────────────────────────────────────────────
// Empty until names and exact results are structured — not fabricated.

export type SuccessStory = {
  quote: string;
  author: string;
  detail?: string;
  role?: "parent" | "student";
};

export const successStoriesContent = {
  eyebrow: "اعتماد خانواده‌ها",
  heading: "صدای والدین و دانش‌آموزان",
  description:
    "نقل‌قول‌های تأییدشده پس از رضایت خانواده‌ها در کارت‌های شیشه‌ای اینجا نمایش داده می‌شود.",
  emptyHeading: "در حال جمع‌آوری نظرات تأییدشده",
  emptyBody:
    "به احترام حریم خصوصی خانواده‌ها، هیچ نقل‌قول ساختگی منتشر نمی‌کنیم. به‌زودی تجربه واقعی والدین و دانش‌آموزان اینجا می‌آید.",
  isPlaceholder: true,
} as const;

export const featuredTeachersContent = {
  eyebrow: "اساتید برجسته",
  heading: "چهره‌هایی که مسیر را هدایت می‌کنند",
  description:
    "آشنایی با بخشی از دبیران و مشاوران منتخب مجموعه — حرفه‌ای، دقیق و الهام‌بخش.",
  cta: { label: "مشاهده همه اعضای تیم", href: "/team" },
} as const;

/** Homepage consultation conversion block */
export const consultationCtaContent = {
  eyebrow: "مشاوره تخصصی",
  heading: "آینده را با یک گفتگوی درست شروع کنید",
  description:
    "رزرو مشاوره برای انتخاب مسیر، برنامه‌ریزی تحصیلی و تصمیم‌های مهم خانواده — شفاف، آرام و حرفه‌ای.",
  primary: { label: "رزرو مشاوره", href: "/consultation" },
  secondary: { label: "ثبت‌نام", href: "/pre-registration" },
} as const;

/** Homepage Atrin product — launcher remains global via AiAssistantHost */
export const atrinHomeContent = {
  eyebrow: "آترین",
  heading: "مشاور آموزشی دیجیتال ستارگان",
  description:
    "آترین چت‌بات نیست؛ همراه آموزشی مؤسسه علمی ستارگان است برای راهنمایی ثبت‌نام، مشاوره، قلم‌چی و مسیر تحصیلی.",
  primary: { label: "آشنایی با آترین", href: "/atrin" },
  secondary: { label: "شروع گفتگو", href: "/atrin" },
  capabilities: [
    {
      title: "راهنمای مؤسسه",
      body: "دوره‌ها، قلم‌چی و مسیر ثبت‌نام را شفاف توضیح می‌دهد.",
    },
    {
      title: "مشاوره تحصیلی",
      body: "برنامه، تیزهوشان، کنکور و انتخاب رشته.",
    },
    {
      title: "همراه والدین",
      body: "پذیرش، تماس و قدم بعدی با لحن گرم و حرفه‌ای.",
    },
  ],
} as const;

export const successStories: readonly SuccessStory[] = [];

// ─── Gallery ─────────────────────────────────────────────────────────────────
// Semantic entries with image paths — files added in a later asset step.

export const galleryContent = {
  eyebrow: "گالری",
  heading: "تصاویر مجموعه",
  description: "گوشه‌ای از فعالیت‌ها، رویدادها و فضای آموزشی مجموعه ستارگان.",
} as const;

export type GallerySlot = "feature" | "secondary" | "tile";
export type GalleryFit = "cover" | "contain";

/**
 * Gallery mapping (visual audit):
 * gallery-5 → همایش ادبیات یازدهم (flyer/instructor visible) — featured
 * gallery-1 → کارگاه / کلاس آموزشی گروهی
 * gallery-4 → نشست آموزشی حضوری در کلاس پرجمعیت
 * gallery-6 → نشست آموزشی با استاد پای تخته
 * gallery-3 → آزمون حضوری یا مطالعه انفرادی دانش‌آموزان پسر
 * gallery-2 → گردهمایی دانش‌آموزان در فضای مرکز
 */
export const galleryImages = [
  {
    mediaKey: "ghalamchi-events/hamayesh-adabiat-yazdahom",
    title: "همایش ادبیات یازدهم",
    category: "همایش",
    caption: "با حضور استاد مسیح آراسته",
    slot: "feature" as const satisfies GallerySlot,
    fit: "cover" as const satisfies GalleryFit,
    objectPosition: "object-[center_26%]",
    media: {
      url: "/images/gallery/gallery-5.jpg",
      alt: "همایش ادبیات پایه یازدهم با بروشور رویداد و حضور استاد در نمایندگی قلم‌چی",
    } satisfies MediaAsset,
  },
  {
    mediaKey: "ghalamchi-events/kargah-amoozeshi",
    title: "کارگاه آموزشی",
    category: "آموزش",
    caption: "تدریس گروهی با جزوه و تمرین",
    slot: "secondary" as const satisfies GallerySlot,
    fit: "cover" as const satisfies GalleryFit,
    objectPosition: "object-[center_30%]",
    media: {
      url: "/images/gallery/gallery-1.jpg",
      alt: "استاد در حال تدریس برای جمعی از دانش‌آموزان در کارگاه آموزشی",
    } satisfies MediaAsset,
  },
  {
    mediaKey: "ghalamchi-events/neshast-amoozeshi-kelas",
    title: "نشست آموزشی",
    category: "کلاس",
    caption: "کلاس حضوری پرجمعیت",
    slot: "tile" as const satisfies GallerySlot,
    fit: "cover" as const satisfies GalleryFit,
    objectPosition: "object-[center_35%]",
    media: {
      url: "/images/gallery/gallery-4.jpg",
      alt: "نمای کلاس آموزشی شلوغ با حضور استاد پای تخته و دانش‌آموزان",
    } satisfies MediaAsset,
  },
  {
    mediaKey: "ghalamchi-events/neshast-amoozeshi-ostad",
    title: "کلاس و برنامه آموزشی",
    category: "آموزش",
    caption: "جلسه تدریس حضوری",
    slot: "tile" as const satisfies GallerySlot,
    fit: "cover" as const satisfies GalleryFit,
    objectPosition: "object-center",
    media: {
      url: "/images/gallery/gallery-6.jpg",
      alt: "استاد در حال آموزش کنار تخته سفید برای جمعی از دانش‌آموزان",
    } satisfies MediaAsset,
  },
  {
    mediaKey: "ghalamchi-events/azmoon-hozouri",
    title: "آزمون حضوری",
    category: "آزمون",
    caption: "فعالیت انفرادی دانش‌آموزان",
    slot: "tile" as const satisfies GallerySlot,
    fit: "cover" as const satisfies GalleryFit,
    objectPosition: "object-[center_42%]",
    media: {
      url: "/images/gallery/gallery-3.jpg",
      alt: "دانش‌آموزان در حال پاسخ‌گویی به آزمون یا تمرین حضوری در کلاس",
    } satisfies MediaAsset,
  },
  {
    mediaKey: "ghalamchi-events/gerdhamaei-daneshjooyan",
    title: "گردهمایی دانش‌آموزان",
    category: "فضای مرکز",
    caption: "تعامل در فضای آموزشی",
    slot: "tile" as const satisfies GallerySlot,
    fit: "cover" as const satisfies GalleryFit,
    objectPosition: "object-[center_60%]",
    media: {
      url: "/images/gallery/gallery-2.jpg",
      alt: "جمعی از دانش‌آموزان در فضای داخلی مرکز آموزشی در حال گفت‌وگو",
    } satisfies MediaAsset,
  },
] as const;

// ─── Latest news ─────────────────────────────────────────────────────────────

export const newsContent = {
  eyebrow: "اخبار",
  heading: "آخرین اخبار",
  description: "اطلاعیه‌ها و رویدادهای رسمی مجموعه آموزشی ستارگان.",
} as const;

export const newsItems = [
  {
    title: "آزمون هدیه تشریحی ویژه دانش‌آموزان پایه یازدهم",
    date: "۱۹ تیر ۱۴۰۵",
    description:
      "برگزارشده با استقبال دانش‌آموزان از سراسر نسیم‌شهر برای آمادگی امتحانات نهایی.",
  },
  {
    title: "جشن پیشرفت تحصیلی قلم‌چی نسیم‌شهر",
    date: "دی ۱۴۰۴",
    description:
      "مراسم آموزشی و انگیزشی همراه با بررسی کارنامه، اهدای مجلات آموزشی و تقدیر از دانش‌آموزان.",
  },
  {
    title: "جلسه مدیران نمایندگی قلم‌چی نسیم‌شهر",
    date: undefined,
    description:
      "نشست هماهنگی مدیران برای برنامه‌ریزی و ارتقای خدمات آموزشی.",
  },
] as const;

// ─── FAQ preview (consumed by FaqPreview until switched to content/faq.ts) ───

export const faqPreviewContent = {
  eyebrow: "پرسش و پاسخ",
  heading: "پرسش‌های رایج",
  description:
    "پاسخ کوتاه به برخی سؤالات پرتکرار. فهرست کامل در صفحه سوالات متداول موجود است.",
} as const;

export const faqPreviewItems = [
  {
    question: "ستارگان پلاس چیست؟",
    answer:
      "ستارگان پلاس نام مرکز آموزشی نسیم‌شهر است که به‌عنوان نمایندگی رسمی کانون فرهنگی آموزش (قلم‌چی) نسیم‌شهر فعالیت می‌کند.",
  },
  {
    question: "تفاوت دبستان ستارگان آینده با مرکز ستارگان پلاس چیست؟",
    answer:
      "دبستان غیردولتی ستارگان آینده مقطع ابتدایی را پوشش می‌دهد. مرکز آموزشی ستارگان پلاس خدمات تکمیلی، کلاس‌های تقویتی، آزمون و مشاوره را ارائه می‌دهد. هر دو بخش مجموعه آموزشی ستارگان هستند اما مؤسسه مجزا با آمار و نقش متفاوت.",
  },
  {
    question: "آیا این مرکز نمایندگی رسمی قلم‌چی است؟",
    answer:
      "بله. مرکز آموزشی ستارگان پلاس نمایندگی رسمی کانون فرهنگی آموزش (قلم‌چی) نسیم‌شهر است.",
  },
  {
    question: "آیا ثبت‌نام آنلاین فعال است؟",
    answer:
      "ثبت‌نام آنلاین از طریق این وب‌سایت به‌زودی فعال می‌شود. تا آن زمان برای پیش‌ثبت‌نام با شماره‌های ۰۲۱۵۶۷۶۶۷۷۲ یا ۰۹۳۸۰۱۹۰۵۸۶ تماس بگیرید.",
  },
] as const;

// ─── Contact CTA (consumed by FinalCta) ──────────────────────────────────────

export const finalCtaContent = {
  eyebrow: "ارتباط با ما",
  heading: "آماده‌اید با ما در ارتباط باشید؟",
  description:
    "برای پیش‌ثبت‌نام، مشاوره تحصیلی یا اطلاع از خدمات مرکز، با ما تماس بگیرید یا به یکی از شعب مراجعه کنید.",
  slogan: officialSlogan,
  contact: contactContent,
  primaryLabel: "تماس با ما",
  primaryHref: "/contact",
  secondaryLabel: "پیش‌ثبت‌نام",
  secondaryHref: "/pre-registration",
} as const;

// ─── Legacy exports (components not yet on homepage — kept to avoid build breaks) ─

export const platformVisionContent = {
  heading: "چشم‌انداز سکو",
  description:
    "موارد زیر بخش‌های برنامه‌ریزی‌شده برای آینده هستند و اکنون به‌صورت عملیاتی در دسترس نیستند.",
} as const;

export const platformVisionItems = [
  {
    title: "پنل دانش‌آموز",
    description: "دسترسی شخصی به برنامه، خدمات و پیگیری‌ها؛ در نقشه توسعه.",
    badge: "قابلیت برنامه‌ریزی‌شده",
  },
  {
    title: "پنل اولیا",
    description: "پیگیری مسیر آموزشی فرزند و ارتباط با مرکز؛ زیرساخت در حال آماده‌سازی.",
    badge: "در نقشه توسعه",
  },
  {
    title: "پنل مشاور",
    description: "ابزارهای پشتیبانی مشاوره تحصیلی؛ در مراحل طراحی.",
    badge: "قابلیت برنامه‌ریزی‌شده",
  },
  {
    title: "CRM",
    description: "مدیریت سرنخ‌ها و پیگیری ارتباط با متقاضیان؛ زیرساخت در حال آماده‌سازی.",
    badge: "در نقشه توسعه",
  },
  {
    title: "امور مالی و اقساط",
    description: "پیگیری تعهدات مالی در آینده؛ هنوز پیاده‌سازی نشده است.",
    badge: "قابلیت برنامه‌ریزی‌شده",
  },
  {
    title: "پیامک و اطلاع‌رسانی",
    description: "اطلاع‌رسانی هدفمند به خانواده‌ها و دانش‌آموزان؛ در برنامه توسعه.",
    badge: "در نقشه توسعه",
  },
  {
    title: "کلاس آنلاین",
    description: "دسترسی به خدمات آموزشی آنلاین؛ زیرساخت در حال آماده‌سازی.",
    badge: "قابلیت برنامه‌ریزی‌شده",
  },
  {
    title: "گزارش‌های مدیریتی",
    description: "نمای مدیریتی برای تصمیم‌گیری آموزشی؛ در مراحل آینده.",
    badge: "در نقشه توسعه",
  },
] as const;

export const enrollmentJourneyContent = {
  heading: "مسیر ثبت‌نام",
  description:
    "مسیر پیشنهادی برای آشنایی با خدمات و آماده‌سازی پیش‌ثبت‌نام.",
} as const;

export const enrollmentSteps = [
  {
    title: "انتخاب خدمت",
    description: "آشنایی با دوره‌ها، کلاس‌ها، آزمون‌ها یا مشاوره از صفحات اطلاعاتی.",
  },
  {
    title: "مطالعه شرایط",
    description: "بررسی توضیحات هر خدمت و پرسش‌های متداول پیش از اقدام.",
  },
  {
    title: "پیش‌ثبت‌نام",
    description: "ثبت درخواست اولیه از طریق مرکز یا وب‌سایت.",
  },
  {
    title: "ارتباط با مرکز",
    description: "پیگیری از مسیرهای رسمی مرکز آموزشی نسیم‌شهر.",
  },
  {
    title: "تکمیل ثبت‌نام",
    description: "مرحله نهایی پس از تأیید مرکز.",
  },
] as const;
