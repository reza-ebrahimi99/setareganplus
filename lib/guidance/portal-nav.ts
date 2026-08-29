/**
 * Guidance ERP — portal student nav item (flag-gated in layout).
 * Data-only; Student OS sidebar/dock render from this config.
 */

import type { PortalOsNavItem } from "@/components/portal/nav/types";

export const GUIDANCE_STUDENT_PORTAL_NAV: PortalOsNavItem[] = [
  {
    id: "guidance",
    href: "/portal/student/services/guidance",
    label: "انتخاب رشته",
    icon: "route",
    match: "prefix",
    accent: "gold",
    dock: true,
  },
];
