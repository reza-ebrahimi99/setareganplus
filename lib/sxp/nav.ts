import type { PortalNavItem } from "@/components/portal/PortalNav";

export const SXP_STUDENT_NAV: PortalNavItem[] = [
  { href: "/portal/student/experience", label: "تجربه" },
  { href: "/portal/student/timeline", label: "روند" },
  { href: "/portal/student/card", label: "کارت" },
];

export const SXP_PARENT_NAV: PortalNavItem[] = [
  { href: "/portal/parent/experience", label: "تجربه" },
  { href: "/portal/parent/timeline", label: "روند" },
  { href: "/portal/parent/card", label: "کارت" },
];

export const SXP_STUDENT_FILES_NAV: PortalNavItem = {
  href: "/portal/student/files",
  label: "فایل‌ها",
};

export const SXP_PARENT_FILES_NAV: PortalNavItem = {
  href: "/portal/parent/files",
  label: "فایل‌ها",
};

export const SXP_STUDENT_MORE_NAV: PortalNavItem[] = [
  { href: "/portal/student", label: "خانه تحصیلی", match: "exact" },
  { href: "/portal/student/profile", label: "پروفایل" },
  { href: "/portal/student/assessments", label: "آزمون‌ها" },
  { href: "/portal/student/achievements", label: "افتخارات" },
];

export const SXP_PARENT_MORE_NAV: PortalNavItem[] = [
  { href: "/portal/parent", label: "خانه تحصیلی", match: "exact" },
  { href: "/portal/parent/students", label: "فرزندان" },
  { href: "/portal/parent/assessments", label: "آزمون‌ها" },
  { href: "/portal/parent/achievements", label: "افتخارات" },
];

export function studentSxpNav(filesEnabled: boolean): PortalNavItem[] {
  return filesEnabled
    ? [...SXP_STUDENT_NAV, SXP_STUDENT_FILES_NAV]
    : SXP_STUDENT_NAV;
}

export function parentSxpNav(filesEnabled: boolean): PortalNavItem[] {
  return filesEnabled ? [...SXP_PARENT_NAV, SXP_PARENT_FILES_NAV] : SXP_PARENT_NAV;
}
