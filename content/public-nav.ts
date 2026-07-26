/**
 * Single source of truth for public primary navigation (desktop + mobile).
 * SiteHeader / MainNav must render this list — do not hardcode parallel menus.
 */

export type PublicNavChildLink = {
  href: string;
  label: string;
};

export type PublicNavLink = {
  href: string;
  label: string;
  children?: readonly PublicNavChildLink[];
};

/**
 * Final primary menu (order is intentional):
 * خانه → درباره ما → تیم ما → دستاوردها → دوره‌ها و کلاس‌ها → گالری → مشاوره
 *
 * دستاوردها is a dropdown:
 * - افتخارات مؤسسه → /achievements
 * - نتایج آزمون‌های قلم‌چی → /assessments (public assessment directory)
 * - آرشیو رتبه‌های برتر کنکور → /achievements/top-ranks
 *
 * پیش‌ثبت‌نام stays as the gold header CTA only (not a text nav item).
 */
export const publicNavLinks = [
  { href: "/", label: "خانه" },
  { href: "/about", label: "درباره ما" },
  { href: "/team", label: "تیم ما" },
  {
    href: "/achievements",
    label: "دستاوردها",
    children: [
      { href: "/achievements", label: "افتخارات مؤسسه" },
      { href: "/assessments", label: "نتایج آزمون‌های قلم‌چی" },
      {
        href: "/achievements/top-ranks",
        label: "آرشیو رتبه‌های برتر کنکور",
      },
    ],
  },
  { href: "/courses", label: "دوره‌ها و کلاس‌ها" },
  { href: "/gallery", label: "گالری" },
  { href: "/consultation", label: "مشاوره" },
] as const satisfies readonly PublicNavLink[];

export function publicNavIncludesHref(href: string): boolean {
  return publicNavLinks.some((link) => {
    if (link.href === href) return true;
    if (!("children" in link) || !link.children) return false;
    return link.children.some((child) => child.href === href);
  });
}

export function isPublicNavPathActive(
  link: PublicNavLink,
  activePath?: string,
): boolean {
  if (!activePath) return false;
  if (link.href === "/") return activePath === "/";
  if (activePath === link.href || activePath.startsWith(`${link.href}/`)) {
    return true;
  }
  const children = link.children;
  if (!children) return false;
  return children.some(
    (child) =>
      activePath === child.href || activePath.startsWith(`${child.href}/`),
  );
}

export function isPublicNavChildActive(
  href: string,
  activePath?: string,
): boolean {
  if (!activePath) return false;
  if (href === "/") return activePath === "/";
  if (activePath === href) return true;
  if (!activePath.startsWith(`${href}/`)) return false;

  // Static sibling under /achievements must not activate «افتخارات مؤسسه».
  if (href === "/achievements") {
    const rest = activePath.slice("/achievements/".length);
    if (rest === "top-ranks" || rest.startsWith("top-ranks/")) {
      return false;
    }
  }

  return true;
}
