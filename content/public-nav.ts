/**
 * Single source of truth for public primary navigation (desktop + mobile).
 * SiteHeader / MainNav must render this list — do not hardcode parallel menus.
 */
export type PublicNavLink = {
  href: string;
  label: string;
};

/**
 * Final primary menu (order is intentional):
 * خانه → درباره ما → دستاوردها → دوره‌ها و کلاس‌ها → گالری → مشاوره
 *
 * - دستاوردها: hub for institute successes (افتخارات + نتایج آزمون)
 * - دوره‌ها و کلاس‌ها: merged courses/classes entry
 * - پیش‌ثبت‌نام stays as the gold header CTA only (not a text nav item)
 */
export const publicNavLinks = [
  { href: "/", label: "خانه" },
  { href: "/about", label: "درباره ما" },
  { href: "/achievements", label: "دستاوردها" },
  { href: "/courses", label: "دوره‌ها و کلاس‌ها" },
  { href: "/gallery", label: "گالری" },
  { href: "/consultation", label: "مشاوره" },
] as const satisfies readonly PublicNavLink[];

export type PublicNavHref = (typeof publicNavLinks)[number]["href"];

export function publicNavIncludesHref(href: string): boolean {
  return publicNavLinks.some((link) => link.href === href);
}
