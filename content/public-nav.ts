/**
 * Public primary navigation — conversion-focused IA.
 * Nested items map to existing public routes (placeholders where pages are pending).
 */
export type PublicNavChild = {
  href: string;
  label: string;
};

export type PublicNavItem = {
  href: string;
  label: string;
  /** Optional emoji accent for top-level groups (decorative). */
  icon?: string;
  children?: readonly PublicNavChild[];
};

export const publicNavItems: readonly PublicNavItem[] = [
  { href: "/", label: "خانه" },
  { href: "/about", label: "درباره ما" },
  {
    href: "/achievements",
    label: "دستاوردها",
    children: [
      { href: "/achievements", label: "افتخارات" },
      { href: "/assessments", label: "نتایج آزمون‌ها" },
    ],
  },
  {
    href: "/courses",
    label: "آموزش",
    children: [
      { href: "/about", label: "دبستان" },
      { href: "/courses", label: "متوسطه اول" },
      { href: "/courses", label: "متوسطه دوم" },
      { href: "/courses", label: "کنکور" },
      { href: "/achievements", label: "نمونه دولتی و تیزهوشان" },
    ],
  },
  {
    href: "/classes",
    label: "ابزارها",
    children: [
      { href: "/classes", label: "کلاس" },
      { href: "/consultation", label: "مشاوره" },
      { href: "/shop", label: "کتاب و جزوه" },
      { href: "/consultation", label: "انتخاب رشته" },
      { href: "/contact", label: "پانسیون" },
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
  primary: { label: "پیش‌ثبت‌نام", href: "/pre-registration" },
  /** Portal entry — placeholder until full portal UX ships. */
  secondary: { label: "ورود به پرتال", href: "/portal/login" },
} as const;
