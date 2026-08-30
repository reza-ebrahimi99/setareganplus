/**
 * Guidance — portal entry + Guidance Platform nav (flag-gated in layout).
 * Data-only; chrome renders from these configs. Presentation layer only.
 */

import type {
  PortalOsNavItem,
  PortalOsNavSection,
} from "@/components/portal/nav/types";

const GP = "/portal/student/services/guidance";

/** Legacy Student Portal sidebar entry into Guidance (services section). */
export const GUIDANCE_STUDENT_PORTAL_NAV: PortalOsNavItem[] = [
  {
    id: "guidance",
    href: GP,
    label: "انتخاب رشته",
    icon: "route",
    match: "prefix",
    accent: "gold",
    dock: true,
  },
];

/**
 * Dedicated Guidance Platform navigation — Major Selection OS.
 * Activated when pathname is under /portal/student/services/guidance.
 * Maps to existing route + ?view= only (no new routes).
 */
export const GUIDANCE_PLATFORM_NAV_SECTIONS: PortalOsNavSection[] = [
  {
    id: "gp-main",
    label: "مسیر انتخاب رشته",
    items: [
      {
        id: "gp-dashboard",
        href: GP,
        label: "داشبورد",
        icon: "home",
        match: "exact",
        accent: "gold",
        dock: true,
      },
      {
        id: "gp-case",
        href: `${GP}?view=case`,
        label: "پرونده هدایت",
        icon: "clipboard",
        accent: "teal",
      },
      {
        id: "gp-journey",
        href: `${GP}?view=journey`,
        label: "سفر هدایت",
        icon: "route",
        accent: "purple",
        dock: true,
      },
      {
        id: "gp-analysis",
        href: `${GP}?view=analysis`,
        label: "تحلیل اولیه",
        icon: "chart",
        accent: "blue",
      },
      {
        id: "gp-interest",
        href: `${GP}?view=interest`,
        label: "آزمون رغبت",
        icon: "spark",
        accent: "purple",
        dock: true,
      },
      {
        id: "gp-profile",
        href: `${GP}?view=profile`,
        label: "پروفایل ۳۶۰",
        icon: "user",
        accent: "teal",
      },
    ],
  },
  {
    id: "gp-support",
    label: "همراهی",
    items: [
      {
        id: "gp-counselor",
        href: `${GP}?view=counselor`,
        label: "مشاور من",
        icon: "users",
        accent: "blue",
      },
      {
        id: "gp-sessions",
        href: `${GP}?view=sessions`,
        label: "جلسات",
        icon: "calendar",
        accent: "orange",
        dock: true,
      },
      {
        id: "gp-documents",
        href: `${GP}?view=documents`,
        label: "مدارک",
        icon: "book",
        accent: "teal",
      },
      {
        id: "gp-messages",
        href: `${GP}?view=messages`,
        label: "پیام‌ها",
        icon: "message",
        accent: "purple",
        dock: true,
      },
      {
        id: "gp-settings",
        href: `${GP}?view=settings`,
        label: "تنظیمات",
        icon: "panel",
        accent: "purple",
      },
    ],
  },
  {
    id: "gp-future",
    label: "به‌زودی",
    items: [
      {
        id: "gp-majors",
        href: `${GP}?view=majors`,
        label: "رشته‌های پیشنهادی",
        icon: "layers",
        accent: "gold",
      },
      {
        id: "gp-universities",
        href: `${GP}?view=universities`,
        label: "دانشگاه‌ها",
        icon: "grid",
        accent: "blue",
      },
      {
        id: "gp-selection",
        href: `${GP}?view=selection`,
        label: "انتخاب نهایی",
        icon: "medal",
        accent: "emerald",
      },
    ],
  },
];

export const GUIDANCE_PLATFORM_BRAND = {
  eyebrow: "سامانه جامع انتخاب رشته",
  productTitle: "انتخاب رشته",
  goalEyebrow: "ماموریت امروز",
  goalTitle: "یک قدم تا انتخاب مطمئن‌تر",
  ariaLabel: "ناوبری سامانه انتخاب رشته",
  dockAriaLabel: "میانبرهای انتخاب رشته",
  exitHref: "/portal/student",
  exitLabel: "بازگشت به پرتال دانش‌آموز",
} as const;
