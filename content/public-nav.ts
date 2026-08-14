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
        href: "/consultation",
        label: "انتخاب رشته",
        description: "تصمیم آگاهانه برای آینده",
      },
      {
        href: "/contact",
        label: "پانسیون",
        description: "فضای مطالعه و همراهی",
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
  /** Portal entry — placeholder until full portal UX ships. */
  secondary: { label: "ورود به پرتال", href: "/portal/login" },
} as const;
