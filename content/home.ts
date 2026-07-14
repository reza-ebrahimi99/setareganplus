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
  title: branding.primary,
  subtitle: "سامانه یکپارچه آموزش، مشاوره و برنامه‌ریزی تحصیلی",
  affiliation: "نمایندگی رسمی کانون فرهنگی آموزش (قلم‌چی)",
  slogan: officialSlogan,
  description:
    "خدمات آموزشی، آزمون و مشاوره با تیمی از ۸۷ دبیر و مشاور آموزشی و سوابق تأییدشده در کنکور و مدارس تیزهوشان.",
  eyebrow: "نمایندگی رسمی کانون فرهنگی آموزش (قلم‌چی)",
} as const;

/** StarOS media slots — assign url from media library when available */
export const heroMedia = {
  logo: {
    url: "/images/brand/logo.jpg",
    alt: "لوگوی مؤسسه علمی ستارگان",
  } satisfies MediaAsset,
  ghalamchiLogo: {
    url: "/images/brand/ghalamchi.jpg",
    alt: "لوگوی کانون فرهنگی آموزش قلم‌چی — نمایندگی نسیم‌شهر",
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
  primary: { label: "پیش‌ثبت‌نام", href: "/pre-registration" },
  secondary: { label: "دوره‌ها", href: "/courses" },
  tertiary: { label: "مشاوره", href: "/consultation" },
} as const;

/**
 * Hero presentation stats — دبستان ستارگان آینده (presentation Phase 1).
 * Distinct from institutionStats used in achievements / trust.
 */
export const heroDisplayStats = [
  { value: "۹", label: "کلاس درس" },
  { value: "۲۳", label: "دبیر" },
  { value: "۲۵۵", label: "فارغ‌التحصیل" },
  { value: "۴۳", label: "قبولی تیزهوشان و نمونه‌دولتی" },
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
    url: "/images/about/about.jpg" as string | null,
    alt: "نمای تابلوی نمایندگی قلم‌چی شعبه پسران",
  } satisfies MediaAsset,
  branches: {
    heading: "نمایندگی‌های رسمی قلم‌چی",
    description: "دو شعبه فعال برای دانش‌آموزان دختر و پسر",
    items: [
      {
        title: "شعبه دختران",
        description: "ویژه دانش‌آموزان دختر",
        media: {
          url: "/images/about/girls-branch.jpg",
          alt: "تابلوی نمایندگی قلم‌چی شعبه دختران نسیم‌شهر",
        } satisfies MediaAsset,
      },
      {
        title: "شعبه پسران",
        description: "ویژه دانش‌آموزان پسر",
        media: {
          url: "/images/about/about.jpg",
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

// ─── Why choose us (consumed by TrustSection until renamed) ─────────────────

export const trustSectionContent = {
  eyebrow: "مزیت‌های ما",
  heading: "چرا ستارگان پلاس",
  description:
    "نمایندگی رسمی قلم‌چی نسیم‌شهر با تیم آموزشی گسترده و سوابق تأییدشده در کنکور و مدارس برتر.",
} as const;

export const trustItems = [
  {
    title: "نمایندگی رسمی قلم‌چی نسیم‌شهر",
    description:
      "نمایندگی رسمی کانون فرهنگی آموزش (قلم‌چی) نسیم‌شهر با برنامه آموزشی و آزمون‌های استاندارد کانون.",
  },
  {
    title: "۸۷ دبیر و مشاور آموزشی",
    description:
      "تیم آموزشی مرکز متشکل از ۸۷ دبیر و مشاور است که برنامه درسی، آزمون‌ها و مشاوره تحصیلی را پوشش می‌دهند.",
  },
  {
    title: "بیش از ۱۵۶۰ فارغ‌التحصیل",
    description:
      "بیش از ۱۵۶۰ دانش‌آموز از مجموعه آموزشی ستارگان فارغ‌التحصیل شده‌اند.",
  },
  {
    title: "۷۳ رتبه زیر ۱۰۰۰",
    description:
      "۷۳ رتبه زیر ۱۰۰۰ کنکور سراسری در سه رشته تحصیلی توسط دانش‌آموزان مجموعه کسب شده است.",
  },
  {
    title: "۵۹ قبولی مدارس برتر",
    description:
      "۵۹ قبولی در مدارس تیزهوشان و نمونه دولتی توسط دانش‌آموزان مجموعه آموزشی ستارگان.",
  },
] as const;

export const whyChooseContent = trustSectionContent;
export const whyChooseItems = trustItems;

// ─── Educational services (consumed by PremiumServices) ──────────────────────

export const servicesSectionContent = {
  eyebrow: "خدمات ما",
  heading: "خدمات آموزشی",
  description:
    "مرکز آموزشی ستارگان پلاس طیف خدمات آموزشی کانون قلم‌چی را در نسیم‌شهر ارائه می‌دهد.",
} as const;

// ─── Achievements (institution only) ─────────────────────────────────────────

export const achievementsContent = {
  eyebrow: "افتخارات",
  heading: "دستاوردهای مجموعه",
  description:
    "دستاوردهای تأییدشده مرکز آموزشی ستارگان پلاس و نمایندگی قلم‌چی نسیم‌شهر.",
} as const;

export const achievementItems = [
  {
    metric: "۸۷",
    title: "دبیر و مشاور آموزشی",
    description: "تیم آموزشی و مشاوره‌ای مرکز متشکل از ۸۷ نفر",
  },
  {
    metric: "۱۵۶۰+",
    title: "فارغ‌التحصیل",
    description: "بیش از ۱۵۶۰ دانش‌آموز از مجموعه آموزشی ستارگان فارغ‌التحصیل شده‌اند",
  },
  {
    metric: "۷۳",
    title: "رتبه زیر ۱۰۰۰ کنکور",
    description: "۷۳ رتبه زیر ۱۰۰۰ در سه رشته تحصیلی",
  },
  {
    metric: "۵۹",
    title: "قبولی مدارس برتر",
    description: "۵۹ قبولی در مدارس تیزهوشان و نمونه دولتی",
  },
] as const;

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
      url: "/images/brand/logo.jpg",
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
};

export const successStoriesContent = {
  eyebrow: "داستان موفقیت",
  heading: "دانش‌آموزان موفق",
  description:
    "داستان‌های موفقیت دانش‌آموزان پس از ساختاردهی نام‌ها و نتایج دقیق منتشر خواهد شد.",
  isPlaceholder: true,
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
