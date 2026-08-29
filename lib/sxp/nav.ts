import type { PortalNavItem } from "@/components/portal/PortalNav";
import type { PortalOsNavItem } from "@/components/portal/nav/types";

/** Student OS — data-driven SXP nav (icons + dock flags). */
export const SXP_STUDENT_NAV: PortalOsNavItem[] = [
  {
    id: "experience",
    href: "/portal/student/experience",
    label: "تجربه",
    icon: "spark",
    accent: "purple",
  },
  {
    id: "timeline",
    href: "/portal/student/timeline",
    label: "روند",
    icon: "layers",
    accent: "teal",
  },
];

/** Parent portal keeps legacy chip nav items (unchanged UX). */
export const SXP_PARENT_NAV: PortalNavItem[] = [
  { href: "/portal/parent/experience", label: "تجربه" },
  { href: "/portal/parent/timeline", label: "روند" },
];
