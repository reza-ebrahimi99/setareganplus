import { aboutPageMeta } from "@/content/about-page";
import { publicNavLinks } from "@/content/public-nav";

export const siteConfig = {
  name: "ستارگان پلاس",
  nameEn: "SetareganPlus",
  tagline: "سکوی آموزشی دیجیتال مرکز آموزشی نسیم‌شهر",
  description:
    "ستارگان پلاس سکوی دیجیتال مرکز آموزشی نسیم‌شهر برای معرفی خدمات آموزشی، راهنمایی مسیر ثبت‌نام و توسعه تدریجی خدمات دیجیتال است.",
} as const;

/** @deprecated Prefer `publicNavLinks` from `@/content/public-nav` — kept in sync for legacy imports. */
export const navLinks = publicNavLinks;

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

/**
 * Legacy InnerPageLayout shape for /about — meta synced from `aboutPageMeta`.
 * Renamed so it cannot be confused with homepage `aboutContent` in `content/home.ts`.
 * Live /about page renders `content/about-page.ts`, not `sections` here.
 */
export const legacyAboutPageContent = {
  title: aboutPageMeta.title,
  subtitle: aboutPageMeta.subtitle,
  breadcrumbs: aboutPageMeta.breadcrumbs,
  sections: [
    {
      heading: "داستان برند",
      body: "مؤسسه آموزشی ستارگان از سال ۱۳۹۴ با دغدغهٔ آموزش باکیفیت شکل گرفت و امروز با دبستان غیردولتی ستارگان آینده، نمایندگی رسمی قلم‌چی و خدمات دیجیتال SetareganPlus همراه خانواده‌هاست.",
    },
    {
      heading: "مسیر رشد",
      body: "از آموزشگاه تقویتی و آمادگی کنکور تا دبستان و نمایندگی قلم‌چی؛ مسیر رشد مجموعه در صفحه درباره ما به‌صورت کامل روایت شده است.",
    },
    {
      heading: "ارتباط",
      body: "برای تماس، مسیر مراجعه و شبکه‌های اجتماعی، صفحه درباره ما و صفحه تماس را ببینید.",
    },
  ],
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
