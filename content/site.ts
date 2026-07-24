export const siteConfig = {
  name: "ستارگان پلاس",
  nameEn: "SetareganPlus",
  tagline: "سکوی آموزشی دیجیتال مرکز آموزشی نسیم‌شهر",
  description:
    "ستارگان پلاس سکوی دیجیتال مرکز آموزشی نسیم‌شهر برای معرفی خدمات آموزشی، راهنمایی مسیر ثبت‌نام و توسعه تدریجی خدمات دیجیتال است.",
} as const;

export const navLinks = [
  { href: "/", label: "صفحه اصلی" },
  { href: "/team", label: "تیم ما" },
  { href: "/achievements", label: "افتخارات" },
  { href: "/assessments", label: "آزمون" },
  { href: "/courses", label: "دوره‌ها" },
  { href: "/classes", label: "کلاس‌ها" },
  { href: "/exams", label: "آزمون‌ها" },
  { href: "/consultation", label: "مشاوره" },
  { href: "/pre-registration", label: "پیش‌ثبت‌نام" },
] as const;

export const footerLinks = [
  { href: "/about", label: "درباره ما" },
  { href: "/contact", label: "تماس" },
  { href: "/faq", label: "سوالات متداول" },
] as const;

export const registrationNotice = {
  heading: "ثبت‌نام آنلاین",
  body: "ثبت‌نام و پیش‌ثبت‌نام آنلاین در نسخه‌های آینده سکو فعال خواهد شد. اطلاعات این صفحه صرفاً راهنمای خدمات است.",
} as const;

export const footerContent = {
  description:
    "ستارگان پلاس بستر دیجیتال مرکز آموزشی نسیم‌شهر برای ارائه و مدیریت خدمات آموزشی است.",
  note: "این سکو در حال توسعه است و به‌تدریج قابلیت‌های جدید اضافه خواهد شد.",
} as const;

/** @deprecated Prefer `content/about-page.ts` — kept for breadcrumbs / legacy refs */
export const aboutContent = {
  title: "درباره مؤسسه آموزشی ستارگان",
  subtitle: "از سال ۱۳۹۴، همراه خانواده‌ها در مسیر رشد، یادگیری و موفقیت",
  breadcrumbs: [
    { label: "صفحه اصلی", href: "/" },
    { label: "درباره ما" },
  ],
  sections: [] as const,
} as const;

export const contactContent = {
  title: "تماس با ما",
  subtitle: "اطلاعات تماس و پیش‌ثبت‌نام",
  breadcrumbs: [
    { label: "صفحه اصلی", href: "/" },
    { label: "تماس" },
  ],
  sections: [
    {
      heading: "اطلاعات تماس",
      body: "شماره تماس، نشانی، ساعات کاری و راه‌های ارتباطی رسمی پس از تأیید نهایی در این صفحه منتشر خواهد شد.",
    },
    {
      heading: "پیش‌ثبت‌نام",
      body: "فرآیند پیش‌ثبت‌نام آنلاین در نسخه‌های آینده سکو فعال می‌شود. در حال حاضر می‌توانید از طریق مراجعه حضوری به مرکز آموزشی نسیم‌شهر یا پیگیری از مسیرهای ارتباطی رسمی مرکز اقدام کنید.",
    },
    {
      heading: "پرسش‌ها",
      body: "اگر سؤالی درباره خدمات آموزشی مرکز یا برنامه توسعه سکو دارید، صفحه سوالات متداول را ببینید یا پس از انتشار اطلاعات تماس رسمی با ما در ارتباط باشید.",
    },
  ],
} as const;
