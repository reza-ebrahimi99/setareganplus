/**
 * Student office rail — rooms of the department.
 * Slice 2: only Home is live. Other items are visible, not fake destinations.
 */

export const MAJOR_OFFICE_HOME = "/ms";

export type OfficeRailItem = {
  id: string;
  label: string;
  href: string | null;
  live: boolean;
};

export type OfficeRailSection = {
  id: string;
  label: string;
  items: readonly OfficeRailItem[];
};

export const OFFICE_RAIL_SECTIONS: readonly OfficeRailSection[] = [
  {
    id: "office",
    label: "دفتر",
    items: [
      { id: "home", label: "خانه", href: MAJOR_OFFICE_HOME, live: true },
      { id: "journey", label: "نقشه مسیر", href: null, live: false },
      { id: "timeline", label: "خط زمان", href: null, live: false },
    ],
  },
  {
    id: "file",
    label: "پرونده",
    items: [
      { id: "profile", label: "شناسنامه", href: null, live: false },
      { id: "grades", label: "کارنامه نهایی", href: null, live: false },
      { id: "konkur", label: "نتایج کنکور", href: null, live: false },
      { id: "documents", label: "مدارک", href: null, live: false },
    ],
  },
  {
    id: "discover",
    label: "کشف",
    items: [
      { id: "interest", label: "آزمون رغبت", href: null, live: false },
      { id: "universities", label: "دانشنامه دانشگاه", href: null, live: false },
      { id: "majors", label: "دانشنامه رشته", href: null, live: false },
      { id: "systems", label: "نظام‌های آموزشی", href: null, live: false },
    ],
  },
  {
    id: "list",
    label: "فهرست ۱۵۰",
    items: [
      { id: "draft", label: "پیش‌نویس مشاور", href: null, live: false },
      { id: "reports", label: "گزارش‌ها", href: null, live: false },
    ],
  },
];
