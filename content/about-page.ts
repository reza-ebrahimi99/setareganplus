import type { MediaAsset } from "@/lib/media";
import {
  contactContent,
  founderContent,
  galleryImages,
  heroMedia,
} from "@/content/home";

/**
 * Rich About page content — identity, trust, and conversion.
 * Distinct from homepage `aboutContent` (school facts) and legacy `site.aboutContent`.
 */

export const aboutPageMeta = {
  title: "درباره مؤسسه آموزشی ستارگان",
  subtitle:
    "از سال ۱۳۹۴، همراه خانواده‌ها در مسیر رشد، یادگیری و موفقیت",
  breadcrumbs: [
    { label: "صفحه اصلی", href: "/" },
    { label: "درباره ما" },
  ],
} as const;

export const aboutHeroContent = {
  eyebrow: "مؤسسه آموزشی ستارگان",
  title: "از سال ۱۳۹۴، همراه خانواده‌ها در مسیر رشد، یادگیری و موفقیت",
  subtitle:
    "مؤسسه آموزشی ستارگان با هدف ارائه آموزش باکیفیت، پرورش استعدادها و ایجاد فرصت‌های یادگیری مؤثر فعالیت خود را آغاز کرد و امروز با توسعه خدمات آموزشی همراه خانواده‌های بسیاری در مسیر آینده‌ای روشن است.",
  background: heroMedia.background,
  primaryCta: { label: "آشنایی بیشتر", href: "#brand-story" },
  secondaryCta: { label: "ثبت‌نام", href: "/pre-registration" },
} as const;

export const aboutBrandStoryContent = {
  id: "brand-story",
  eyebrow: "داستان برند",
  heading: "مسیری که با یک دغدغه آغاز شد",
  opening:
    "بعضی مسیرها با یک ساختمان آغاز نمی‌شوند؛ با یک دغدغه آغاز می‌شوند...",
  paragraphs: [
    "دغدغه‌ای ساده اما عمیق: اینکه هر دانش‌آموز، فارغ از محدودیت‌ها، شایستهٔ آموزشی باشد که استعدادش را ببیند، مسیرش را روشن کند و خانواده را همراه نگه دارد.",
    "از کلاس‌های تقویتی و آمادگی کنکور تا دبستان غیردولتی و نمایندگی رسمی قلم‌چی، ستارگان گام‌به‌گام بزرگ شد؛ نه با شعار، بلکه با حضور مداوم کنار خانواده‌ها.",
    "امروز SetareganPlus ادامهٔ همان مسیر است؛ پلی دیجیتال میان تجربهٔ حضوری مجموعه و دسترسی آسان‌تر به خدمات آموزشی، مشاوره و ثبت‌نام.",
  ],
} as const;

export const aboutTimelineContent = {
  eyebrow: "مسیر رشد",
  heading: "گاه‌شمار مجموعه",
  description:
    "نقاط عطفی که هویت آموزشی ستارگان را شکل داده‌اند؛ از آغاز تا امروز.",
  events: [
    {
      year: "۱۳۹۴",
      title: "آغاز فعالیت مؤسسه",
      description:
        "شروع مسیر با آموزشگاه تقویتی، آمادگی کنکور و برنامه‌ریزی تحصیلی برای دانش‌آموزان نسیم‌شهر.",
      tags: ["آموزشگاه تقویتی", "آمادگی کنکور", "برنامه‌ریزی تحصیلی"],
    },
    {
      year: "۱۴۰۰",
      title: "افتتاح دبستان غیردولتی ستارگان آینده",
      description:
        "گسترش افق آموزشی به مقطع ابتدایی با فضایی مستقل برای رشد پایه‌ای دانش‌آموزان.",
      tags: ["دبستان غیردولتی"],
    },
    {
      year: "۱۴۰۱",
      title: "اخذ نمایندگی رسمی قلم‌چی",
      description:
        "پیوند با استاندارد آموزشی کانون فرهنگی آموزش قلم‌چی و توسعهٔ خدمات آزمون و برنامهٔ درسی.",
      tags: ["نمایندگی رسمی", "قلم‌چی"],
    },
    {
      year: "امروز",
      title: "توسعه خدمات دیجیتال",
      description:
        "راه‌اندازی و توسعهٔ SetareganPlus برای دسترسی ساده‌تر خانواده‌ها به خدمات آموزشی مجموعه.",
      tags: ["SetareganPlus", "خدمات دیجیتال"],
    },
  ],
} as const;

export const aboutPhilosophyContent = {
  eyebrow: "فلسفه ما",
  heading: "اصولی که آموزش را معنا می‌کند",
  description:
    "چهار ستون هویت آموزشی ستارگان؛ از عمق یادگیری تا نوآوری.",
  items: [
    {
      title: "یادگیری عمیق",
      description:
        "تمرکز بر فهم مفهومی، تمرین هدفمند و تثبیت دانش؛ نه صرفاً عبور از سرفصل‌ها.",
    },
    {
      title: "پرورش استعداد",
      description:
        "شناسایی توانمندی‌های فردی و هدایت دانش‌آموز به مسیری که ظرفیت واقعی‌اش را شکوفا کند.",
    },
    {
      title: "همراهی خانواده",
      description:
        "آموزش وقتی پایدار می‌ماند که خانواده در جریان مسیر باشد و نقش حمایتی‌اش دیده شود.",
    },
    {
      title: "نوآوری آموزشی",
      description:
        "ترکیب تجربهٔ حضوری با ابزارهای دیجیتال برای یادگیری مؤثرتر و دسترسی آسان‌تر.",
    },
  ],
} as const;

export const aboutServicesContent = {
  eyebrow: "خدمات",
  heading: "طیف خدمات آموزشی ستارگان",
  description:
    "از تقویت پایه تا کنکور، مشاوره و دبستان؛ مسیری یکپارچه برای رشد.",
  items: [
    {
      title: "آموزش تقویتی",
      description: "تقویت دروس پایه و رفع ضعف‌های درسی با برنامهٔ منظم.",
      href: "/courses",
    },
    {
      title: "کنکور",
      description: "آمادگی کنکور با برنامه، آزمون و همراهی مشاوره‌ای.",
      href: "/courses",
    },
    {
      title: "مشاوره",
      description: "مشاوره تحصیلی برای انتخاب مسیر و مدیریت یادگیری.",
      href: "/consultation",
    },
    {
      title: "برنامه‌ریزی",
      description: "طراحی برنامهٔ مطالعاتی متناسب با هدف و زمان دانش‌آموز.",
      href: "/consultation",
    },
    {
      title: "دبستان ستارگان آینده",
      description: "مقطع ابتدایی با فضای آموزشی مستقل و مسیر رشد پایه‌ای.",
      href: "/#school-section",
    },
    {
      title: "دوره‌های تابستانی",
      description: "دوره‌های مکمل برای تثبیت یادگیری و آمادگی سال تحصیلی.",
      href: "/courses",
    },
  ],
} as const;

export const aboutWhyContent = {
  eyebrow: "چرا ستارگان",
  heading: "آنچه ما را متمایز می‌کند",
  description:
    "شش دلیل برای اعتماد خانواده‌هایی که آیندهٔ فرزندشان را جدی می‌گیرند.",
  items: [
    {
      title: "تجربه",
      description:
        "سال‌ها حضور مستمر در مسیر آموزش، کنکور و همراهی تحصیلی خانواده‌ها.",
    },
    {
      title: "کیفیت",
      description:
        "تأکید بر کیفیت تدریس، برنامه‌ریزی دقیق و ارزیابی مستمر پیشرفت.",
    },
    {
      title: "فناوری",
      description:
        "توسعهٔ خدمات دیجیتال از طریق SetareganPlus برای دسترسی ساده‌تر.",
    },
    {
      title: "برنامه‌ریزی",
      description:
        "مسیر یادگیری هدفمند؛ از تشخیص نیاز تا اجرای برنامهٔ شخصی‌سازی‌شده.",
    },
    {
      title: "اعتماد خانواده‌ها",
      description:
        "رابطهٔ شفاف با اولیا و همراهی واقعی در تصمیم‌های آموزشی.",
    },
    {
      title: "رشد مستمر",
      description:
        "از آموزشگاه تا دبستان و نمایندگی قلم‌چی؛ توسعهٔ پیوستهٔ خدمات.",
    },
  ],
} as const;

/** Verified metrics only — no unverified student/course counts. */
export const aboutStatsContent = {
  eyebrow: "در یک نگاه",
  heading: "مسیر رشد به زبان عدد",
  description:
    "اعداد زیر از تاریخ آغاز فعالیت مجموعه استخراج شده‌اند.",
  items: [
    {
      value: 1394,
      suffix: "",
      label: "از سال ۱۳۹۴",
      hint: "آغاز فعالیت",
      isYear: true,
    },
    {
      value: 10,
      suffix: "+",
      label: "سال‌های تجربه",
      hint: "همراهی آموزشی",
      isYear: false,
    },
  ],
} as const;

export const aboutGalleryContent = {
  eyebrow: "گالری",
  heading: "لحظه‌هایی از فضای آموزشی",
  description:
    "نگاهی به کلاس‌ها، رویدادها و فضای یادگیری مجموعه ستارگان.",
  items: galleryImages.map((image, index) => ({
    id: image.mediaKey,
    url: image.media.url,
    alt: image.media.alt,
    title: image.title,
    caption: image.caption,
    priority: index < 2,
  })),
} as const;

export const aboutFounderContent = {
  eyebrow: "پیام مؤسس",
  heading: "از زبان بنیان‌گذار",
  name: founderContent.name,
  roles: founderContent.roles.slice(0, 3),
  portrait: founderContent.portrait,
  message: [
    "آموزش برای ما صرفاً انتقال مطلب نیست؛ مسئولیتی است در قبال آیندهٔ یک انسان و آرامش یک خانواده.",
    "باور داریم هر دانش‌آموز اگر دیده شود، راهنمایی بگیرد و مسیر روشنی پیش رو داشته باشد، می‌تواند فراتر از انتظار خود پیش برود.",
    "ستارگان از همین باور شکل گرفت و امروز با تیم آموزشی، دبستان و خدمات دیجیتال، همان مسیر را ادامه می‌دهد.",
  ],
  signature: founderContent.name,
  signatureRole: "مؤسس و مدیرعامل مؤسسه آموزشی ستارگان",
} as const;

export const aboutVisionContent = {
  eyebrow: "چشم‌انداز",
  heading:
    "ما باور داریم آموزش، تنها انتقال دانش نیست؛ بلکه ساختن آینده انسان‌هاست.",
  description:
    "آینده‌ای که با یادگیری عمیق، پرورش استعداد و همراهی خانواده ساخته می‌شود.",
} as const;

export const aboutContactSectionContent = {
  eyebrow: "ارتباط با ما",
  heading: "همین امروز با ستارگان در تماس باشید",
  description:
    "از تماس تلفنی تا مراجعه حضوری و شبکه‌های اجتماعی؛ مسیر ارتباط کوتاه است.",
  cards: [
    {
      id: "phone",
      title: "تماس",
      description: "پاسخگویی در ساعات کاری مجموعه",
    },
    {
      id: "address",
      title: "آدرس",
      description: "شعب فعال در نسیم‌شهر",
    },
    {
      id: "social",
      title: "شبکه‌های اجتماعی",
      description: "اینستاگرام، بله و تلگرام",
    },
    {
      id: "consult",
      title: "مشاوره",
      description: "دریافت راهنمایی تحصیلی و ثبت‌نام",
    },
  ],
  emailNote: null as string | null,
  contact: contactContent,
} as const;

export const aboutMapContent = {
  eyebrow: "موقعیت",
  heading: "مسیر مراجعه به مجموعه",
  description:
    "نقشهٔ شعب مجموعه را ببینید و برای مسیریابی از دکمهٔ زیر استفاده کنید.",
  embedSrc: contactContent.mapEmbedSrc,
  directionsHref: contactContent.branches[0].mapUrl,
  directionsLabel: "مسیریابی",
  branches: contactContent.branches,
} as const;

export const aboutFloatingBarContent = {
  items: [
    {
      id: "call",
      label: "تماس",
      href: contactContent.phones[0].href,
      external: true,
    },
    {
      id: "map",
      label: "مسیر",
      href: contactContent.branches[0].mapUrl,
      external: true,
    },
    {
      id: "instagram",
      label: "اینستاگرام",
      href: contactContent.social[0].href,
      external: true,
    },
    {
      id: "bale",
      label: "بله",
      href: contactContent.social[1].href,
      external: true,
    },
    {
      id: "register",
      label: "ثبت‌نام",
      href: "/pre-registration",
      external: false,
    },
  ],
} as const;

export const aboutFooterCtaContent = {
  heading: "آینده از یک تصمیم درست آغاز می‌شود.",
  description:
    "اگر آماده‌اید مسیر یادگیری را جدی‌تر شروع کنید، همین امروز ثبت‌نام کنید یا مشاوره بگیرید.",
  background: {
    url: "/images/about/about.png",
    alt: "نمای مجموعه آموزشی ستارگان",
  } satisfies MediaAsset,
  primary: { label: "ثبت‌نام", href: "/pre-registration" },
  secondary: { label: "دریافت مشاوره", href: "/consultation" },
} as const;
