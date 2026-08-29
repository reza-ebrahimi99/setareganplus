import type { PortalIconName } from "@/components/portal/icons";
import type { PortalAccentId } from "@/components/portal/theme/types";

/**
 * Data-driven Student Portal OS navigation.
 * Sidebar / dock render from these configs — never hardcoded JSX trees.
 */

export type PortalNavMatch = "exact" | "prefix";

/** Legacy chip-nav item (Parent portal / PortalNav). */
export type PortalNavItem = {
  href: string;
  label: string;
  match?: PortalNavMatch;
};

/** Student OS nav item — fully data-driven. */
export type PortalOsNavItem = {
  id: string;
  href: string;
  label: string;
  icon: PortalIconName;
  match?: PortalNavMatch;
  accent?: PortalAccentId;
  /** Include in mobile bottom dock (max ~5). */
  dock?: boolean;
  /** Optional live status label (no fake data — omit when unknown). */
  statusLabel?: string;
};

export type PortalOsNavSection = {
  id: string;
  label?: string;
  items: PortalOsNavItem[];
};

export const STUDENT_PORTAL_PRIMARY_NAV: PortalOsNavItem[] = [
  {
    id: "home",
    href: "/portal/student",
    label: "خانه",
    icon: "home",
    match: "exact",
    accent: "gold",
    dock: true,
  },
  {
    id: "profile",
    href: "/portal/student/profile",
    label: "پروفایل",
    icon: "user",
    accent: "teal",
  },
  {
    id: "assessments",
    href: "/portal/student/assessments",
    label: "آزمون‌ها",
    icon: "chart",
    accent: "blue",
    dock: true,
  },
  {
    id: "achievements",
    href: "/portal/student/achievements",
    label: "افتخارات",
    icon: "trophy",
    accent: "orange",
    dock: true,
  },
];

export const STUDENT_PORTAL_NAV_SECTIONS_BASE: PortalOsNavSection[] = [
  {
    id: "main",
    label: "اصلی",
    items: STUDENT_PORTAL_PRIMARY_NAV,
  },
];

export function isPortalNavActive(
  pathname: string,
  item: Pick<PortalOsNavItem, "href" | "match">,
): boolean {
  if (item.match === "exact") {
    return pathname === item.href;
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/**
 * Compose student OS nav from base + optional feature modules.
 * Feature arrays come from flag-gated configs (SXP / Guidance) — no JSX.
 */
export function buildStudentPortalNavSections(input: {
  experienceItems?: readonly PortalOsNavItem[];
  serviceItems?: readonly PortalOsNavItem[];
}): PortalOsNavSection[] {
  const sections: PortalOsNavSection[] = [
    ...STUDENT_PORTAL_NAV_SECTIONS_BASE.map((section) => ({
      ...section,
      items: [...section.items],
    })),
  ];

  if (input.experienceItems && input.experienceItems.length > 0) {
    sections.push({
      id: "experience",
      label: "تجربه",
      items: [...input.experienceItems],
    });
  }

  if (input.serviceItems && input.serviceItems.length > 0) {
    sections.push({
      id: "services",
      label: "خدمات",
      items: [...input.serviceItems],
    });
  }

  return sections;
}

/** Flat dock items from sections (dock:true only, stable order). */
export function getStudentPortalDockItems(
  sections: readonly PortalOsNavSection[],
): PortalOsNavItem[] {
  return sections.flatMap((section) =>
    section.items.filter((item) => item.dock),
  );
}
