import { GUIDANCE_PORTAL_LOGIN } from "@/lib/guidance/portal-nav";

/**
 * Public primary navigation — conversion-focused IA.
 * Nested items map to existing public routes (placeholders where pages are pending).
 */
export type PublicNavChild = {
  href: string;
  label: string;
  description?: string;
};

export type PublicNavItem = {
  href: string;
  label: string;
  description?: string;
  children?: readonly PublicNavChild[];
};

export const publicNavItems: readonly PublicNavItem[] = [
  { href: "/", label: "خانه" },
  {
    href: "/about",
    label: "درباره ما",
    description: "داستان، هویت و مسیر مؤسسه علمی ستارگان",
    children: [
      {
        href: "/about",
        label: "معرفی مجموعه",
        description: "شناخت هویت و مسیر ستارگان",
      },
      {
        href: "/about/founder",
        label: "معرفی بنیانگذار",
        description: "چشم‌انداز، مأموریت و فلسفه شکل‌گیری",
      },
      {
        href: "/about/team",
        label: "تیم ما",
        description: "مدیران، دبیران و مشاوران مجموعه",
      },
      {
        href: "/about/story",
        label: "داستان ستارگان",
        description: "مسیر شکل‌گیری از ۱۳۹۴ تا امروز",
      },
      {
        href: "/about/vision",
        label: "ارزش‌ها و چشم‌انداز",
        description: "اصول، مأموریت و افق آینده",
      },
    ],
  },
  {
    href: "/achievements",
    label: "دستاوردها",
    description: "افتخارات و نتایج تأییدشده",
    children: [
      {
        href: "/achievements",
        label: "افتخارات",
        description: "ویترین موفقیت‌های دانش‌آموزان",
      },
      {
        href: "/assessments",
        label: "نتایج آزمون‌ها",
        description: "کارنامه و نتایج ارزیابی‌ها",
      },
    ],
  },
  {
    href: "/courses",
    label: "آموزش",
    description: "مسیر رشد از دبستان تا کنکور",
    children: [
      {
        href: "/about",
        label: "دبستان",
        description: "پایه محکم برای آغاز مسیر",
      },
      {
        href: "/courses",
        label: "متوسطه اول",
        description: "تقویت بنیان درسی",
      },
      {
        href: "/courses",
        label: "متوسطه دوم",
        description: "آمادگی نهایی و کنکور",
      },
      {
        href: "/courses",
        label: "کنکور",
        description: "برنامه، آزمون و همراهی مشاور",
      },
      {
        href: "/achievements",
        label: "نمونه دولتی و تیزهوشان",
        description: "مسیر مدارس برتر",
      },
    ],
  },
  {
    href: "/classes",
    label: "ابزارها",
    description: "خدمات مکمل مسیر تحصیلی",
    children: [
      { href: "/classes", label: "کلاس", description: "کلاس‌های تقویتی و تخصصی" },
      {
        href: "/consultation",
        label: "مشاوره",
        description: "راهنمایی تحصیلی و انتخاب مسیر",
      },
      {
        href: "/shop",
        label: "کتاب و جزوه",
        description: "منابع آموزشی و فروشگاه",
      },
      {
        href: "/contact",
        label: "پانسیون",
        description: "فضای مطالعه و همراهی",
      },
    ],
  },
  {
    href: GUIDANCE_PORTAL_LOGIN,
    label: "سامانه جامع انتخاب رشته",
    description: "مسیر یکپارچه انتخاب رشته تا پذیرش دانشگاه",
    children: [
      {
        href: GUIDANCE_PORTAL_LOGIN,
        label: "ورود دانش‌آموز",
        description: "داشبورد انتخاب رشته و مسیر همراهی",
      },
      {
        href: "/guidance",
        label: "معرفی سامانه",
        description: "آشنایی با دپارتمان انتخاب رشته",
      },
      {
        href: "/discover",
        label: "کانون کشف",
        description: "رشته، دانشگاه و مقطع را پیش از انتخاب بشناسید",
      },
    ],
  },
  { href: "/gallery", label: "گالری" },
  { href: "/contact", label: "تماس" },
] as const;

/** Flat links for footer / simple consumers. */
export const publicNavLinks = publicNavItems.map((item) => ({
  href: item.href,
  label: item.label,
})) as ReadonlyArray<{ href: string; label: string }>;

export const headerCtas = {
  primary: { label: "ثبت‌نام", href: "/pre-registration" },
  /** Guidance-aware portal entry — preserves post-login destination. */
  secondary: { label: "ورود به پرتال", href: GUIDANCE_PORTAL_LOGIN },
} as const;
