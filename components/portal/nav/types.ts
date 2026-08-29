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

/**
 * Split an href that may include `?query` into pathname + search string.
 */
export function splitPortalHref(href: string): {
  pathname: string;
  search: string;
} {
  const q = href.indexOf("?");
  if (q === -1) {
    return { pathname: href, search: "" };
  }
  return { pathname: href.slice(0, q), search: href.slice(q + 1) };
}

function readViewParam(search: string): string | null {
  if (!search) return null;
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  const view = params.get("view");
  return view && view.length > 0 ? view : null;
}

/**
 * Active-state helper — pathname + optional `?view=` awareness.
 * Pass `search` from `useSearchParams().toString()` on the client.
 */
export function isPortalNavActive(
  pathname: string,
  item: Pick<PortalOsNavItem, "href" | "match">,
  search?: string | null,
): boolean {
  const target = splitPortalHref(item.href);
  const itemView = readViewParam(target.search);
  const currentView = readViewParam(search ?? "");

  if (item.match === "exact") {
    if (pathname !== target.pathname) return false;
    // Dashboard-style items (no view in href): active only when no view param.
    if (!itemView) return !currentView;
    return currentView === itemView;
  }

  // Prefix match: ignore query on the item href for nested paths (e.g. /grades).
  if (pathname === target.pathname || pathname.startsWith(`${target.pathname}/`)) {
    if (!itemView) return true;
    return currentView === itemView;
  }
  return false;
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
