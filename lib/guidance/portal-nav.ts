/**
 * Guidance ERP — portal student nav item (flag-gated in layout).
 */

import type { PortalNavItem } from "@/components/portal/PortalNav";

export const GUIDANCE_STUDENT_PORTAL_NAV: PortalNavItem[] = [
  {
    href: "/portal/student/services/guidance",
    label: "انتخاب رشته",
    match: "prefix",
  },
];
