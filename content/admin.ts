import type { Permission } from "@/lib/auth/permissions";

export const adminNotice =
  "این بخش در حال اتصال به سامانه احراز هویت و پایگاه داده است." as const;

export type AdminNavIcon =
  | "overview"
  | "leads"
  | "forms"
  | "bookings"
  | "enrollments"
  | "students"
  | "courses"
  | "exams"
  | "finance"
  | "reports"
  | "settings";

type AdminNavItemEnabled = {
  href: string;
  label: string;
  icon: AdminNavIcon;
  enabled: true;
  permission?: Permission;
};

type AdminNavItemDisabled = {
  label: string;
  icon: AdminNavIcon;
  enabled: false;
};

export type AdminNavItem = AdminNavItemEnabled | AdminNavItemDisabled;

export const adminNavGroups: ReadonlyArray<{
  label: string;
  items: readonly AdminNavItem[];
}> = [
  {
    label: "مدیریت",
    items: [
      { href: "/admin", label: "نمای کلی", icon: "overview", enabled: true },
      {
        href: "/admin/workspace",
        label: "میز کار من",
        icon: "overview",
        enabled: true,
        permission: "crm.view_assigned",
      },
      {
        href: "/admin/leads",
        label: "متقاضیان و CRM",
        icon: "leads",
        enabled: true,
        permission: "crm.view_assigned",
      },
      {
        href: "/admin/crm",
        label: "تابلوی CRM",
        icon: "leads",
        enabled: true,
        permission: "crm.view_assigned",
      },
      {
        href: "/admin/forms",
        label: "فرم‌ساز",
        icon: "forms",
        enabled: true,
        permission: "forms.manage",
      },
      {
        href: "/admin/bookings",
        label: "رزرو نوبت",
        icon: "bookings",
        enabled: true,
        permission: "booking.view_all",
      },
      {
        href: "/admin/registrations",
        label: "ثبت‌نام‌ها",
        icon: "enrollments",
        enabled: true,
        permission: "registrations.view",
      },
    ],
  },
  {
    label: "آموزش",
    items: [
      { label: "دانش‌آموزان", icon: "students", enabled: false },
      { label: "کلاس‌ها و دوره‌ها", icon: "courses", enabled: false },
      { label: "آزمون‌ها", icon: "exams", enabled: false },
    ],
  },
  {
    label: "مالی و گزارش‌ها",
    items: [
      { label: "امور مالی", icon: "finance", enabled: false },
      {
        href: "/admin/reports/staff-performance",
        label: "عملکرد همکاران",
        icon: "reports",
        enabled: true,
        permission: "reports.view",
      },
    ],
  },
  {
    label: "وب‌سایت",
    items: [
      {
        href: "/admin/website/team",
        label: "اعضای تیم",
        icon: "settings",
        enabled: true,
        permission: "website.manage",
      },
      {
        href: "/admin/website/students",
        label: "دانش‌آموزان",
        icon: "settings",
        enabled: true,
        permission: "website.manage",
      },
      {
        href: "/admin/website/guardians",
        label: "اولیا و سرپرستان",
        icon: "settings",
        enabled: true,
        permission: "students.portal.manage",
      },
      {
        href: "/admin/website/portal-access",
        label: "دسترسی پرتال",
        icon: "settings",
        enabled: true,
        permission: "students.portal.manage",
      },
      {
        href: "/admin/website/achievements",
        label: "افتخارات",
        icon: "settings",
        enabled: true,
        permission: "website.manage",
      },
      {
        href: "/admin/website/media",
        label: "کتابخانه رسانه",
        icon: "settings",
        enabled: true,
        permission: "website.manage",
      },
      {
        href: "/admin/website/gallery",
        label: "گالری",
        icon: "settings",
        enabled: true,
        permission: "website.manage",
      },
      {
        href: "/admin/website/marketing-cards",
        label: "کارت‌های نمایندگی",
        icon: "settings",
        enabled: true,
        permission: "website.manage",
      },
      {
        href: "/admin/website/pages",
        label: "صفحات",
        icon: "settings",
        enabled: true,
        permission: "website.manage",
      },
      {
        href: "/admin/website/assessments",
        label: "آزمون‌ها",
        icon: "settings",
        enabled: true,
        permission: "website.manage",
      },
    ],
  },
  {
    label: "سامانه",
    items: [
      {
        href: "/admin/settings/site-placements",
        label: "جایگاه‌های سایت",
        icon: "settings",
        enabled: true,
        permission: "settings.manage",
      },
      {
        href: "/admin/settings/communication",
        label: "ارتباطات و پیامک",
        icon: "settings",
        enabled: true,
        permission: "communication.manage",
      },
      {
        href: "/admin/settings/automations",
        label: "اتوماسیون CRM",
        icon: "settings",
        enabled: true,
        permission: "automations.manage",
      },
      {
        href: "/admin/settings/staff",
        label: "همکاران و دسترسی‌ها",
        icon: "settings",
        enabled: true,
        permission: "staff.manage",
      },
    ],
  },
];

export type AdminBreadcrumbItem = {
  label: string;
  href?: string;
};

export const adminBreadcrumbs = {
  dashboard: [
    { label: "مدیریت", href: "/admin" },
    { label: "نمای کلی" },
  ],
  leads: [
    { label: "مدیریت", href: "/admin" },
    { label: "متقاضیان و CRM" },
  ],
  leadDetail: [
    { label: "مدیریت", href: "/admin" },
    { label: "متقاضیان و CRM", href: "/admin/leads" },
    { label: "پرونده متقاضی" },
  ],
  forms: [
    { label: "مدیریت", href: "/admin" },
    { label: "فرم‌ساز" },
  ],
  formsNew: [
    { label: "مدیریت", href: "/admin" },
    { label: "فرم‌ساز", href: "/admin/forms" },
    { label: "ساخت فرم جدید" },
  ],
  bookings: [
    { label: "مدیریت", href: "/admin" },
    { label: "رزرو نوبت" },
  ],
  registrations: [
    { label: "مدیریت", href: "/admin" },
    { label: "ثبت‌نام‌ها" },
  ],
  registrationDetail: [
    { label: "مدیریت", href: "/admin" },
    { label: "ثبت‌نام‌ها", href: "/admin/registrations" },
    { label: "پرونده ثبت‌نام" },
  ],
  registrationAbandoned: [
    { label: "مدیریت", href: "/admin" },
    { label: "ثبت‌نام‌ها", href: "/admin/registrations" },
    { label: "ثبت‌نام‌های ناقص" },
  ],
  bookingServices: [
    { label: "مدیریت", href: "/admin" },
    { label: "رزرو نوبت", href: "/admin/bookings" },
    { label: "خدمت‌ها" },
  ],
  bookingServicesNew: [
    { label: "مدیریت", href: "/admin" },
    { label: "رزرو نوبت", href: "/admin/bookings" },
    { label: "خدمت‌ها", href: "/admin/bookings/services" },
    { label: "تعریف خدمت" },
  ],
  bookingServiceDetail: [
    { label: "مدیریت", href: "/admin" },
    { label: "رزرو نوبت", href: "/admin/bookings" },
    { label: "خدمت‌ها", href: "/admin/bookings/services" },
    { label: "تنظیمات خدمت" },
  ],
  bookingCalendar: [
    { label: "مدیریت", href: "/admin" },
    { label: "رزرو نوبت", href: "/admin/bookings" },
    { label: "تقویم نوبت‌ها" },
  ],
  bookingReservation: [
    { label: "مدیریت", href: "/admin" },
    { label: "رزرو نوبت", href: "/admin/bookings" },
    { label: "جزئیات رزرو" },
  ],
  sitePlacements: [
    { label: "مدیریت", href: "/admin" },
    { label: "جایگاه‌های سایت" },
  ],
  communication: [
    { label: "مدیریت", href: "/admin" },
    { label: "ارتباطات و پیامک" },
  ],
  crm: [
    { label: "مدیریت", href: "/admin" },
    { label: "تابلوی CRM" },
  ],
  automations: [
    { label: "مدیریت", href: "/admin" },
    { label: "اتوماسیون CRM" },
  ],
} as const satisfies Record<string, readonly AdminBreadcrumbItem[]>;

export type AdminStatIcon = "users" | "clock" | "message" | "clipboard";

export const dashboardStats: ReadonlyArray<{
  label: string;
  icon: AdminStatIcon;
}> = [
  { label: "متقاضیان جدید", icon: "users" },
  { label: "در انتظار پیگیری", icon: "clock" },
  { label: "جلسات مشاوره", icon: "message" },
  { label: "ثبت‌نام‌های تکمیل‌شده", icon: "clipboard" },
];

export type AdminQuickActionItem =
  | { label: string; description: string; href: string; enabled: true }
  | { label: string; description: string; enabled: false };

export const dashboardQuickActions: readonly AdminQuickActionItem[] = [
  {
    label: "مشاهده متقاضیان و CRM",
    description: "فهرست متقاضیان و پرونده‌های پیگیری",
    href: "/admin/leads",
    enabled: true,
  },
  {
    label: "مشاهده صفحه پیش‌ثبت‌نام",
    description: "فرم عمومی پیش‌ثبت‌نام وب‌سایت",
    href: "/pre-registration",
    enabled: true,
  },
  {
    label: "ثبت متقاضی از پنل",
    description: "پس از اتصال CRM و احراز هویت فعال می‌شود",
    enabled: false,
  },
  {
    label: "برنامه پیگیری مشاوره",
    description: "در نقشه توسعه — پس از فعال‌سازی گردش‌کار CRM",
    enabled: false,
  },
  {
    label: "مدیریت ثبت‌نام‌ها",
    description: "مرکز مدیریت ثبت‌نام‌های آنلاین",
    href: "/admin/registrations",
    enabled: true,
  },
];

export type ReadinessTone = "ready" | "pending" | "planned";

export const platformReadiness: ReadonlyArray<{
  label: string;
  status: string;
  tone: ReadinessTone;
}> = [
  {
    label: "زیرساخت چندمجموعه‌ای",
    status: "آماده",
    tone: "ready",
  },
  {
    label: "مدل نقش‌ها و دسترسی‌ها",
    status: "آماده",
    tone: "ready",
  },
  {
    label: "رابط مدیریت",
    status: "آماده برای اتصال",
    tone: "ready",
  },
  {
    label: "PostgreSQL",
    status: "در انتظار تکمیل اتصال سرور",
    tone: "pending",
  },
  {
    label: "احراز هویت",
    status: "در نقشه توسعه",
    tone: "planned",
  },
  {
    label: "فرم پیش‌ثبت‌نام واقعی",
    status: "در نقشه توسعه",
    tone: "planned",
  },
  {
    label: "CRM داده‌محور",
    status: "در نقشه توسعه",
    tone: "planned",
  },
];

export const recentActivityEmpty = {
  title: "آخرین فعالیت‌ها",
  message: "هنوز فعالیت عملیاتی ثبت نشده است.",
  description:
    "پس از فعال شدن ورود مدیر و اتصال CRM، تغییر وضعیت‌ها و پیگیری‌ها در این بخش ثبت خواهند شد.",
} as const;

export const todayTasksEmpty = {
  title: "پیگیری‌های امروز",
  message: "موردی برای پیگیری امروز وجود ندارد.",
  description:
    "پس از فعال‌سازی گردش‌کار CRM، وظایف روزانه بر اساس وضعیت متقاضیان و جلسات مشاوره در این بخش نمایش داده می‌شوند.",
} as const;

export const systemEnvironment = {
  title: "وضعیت سامانه",
  items: [
    { label: "محیط فعلی", value: "پیش‌نمایش توسعه" },
    { label: "رابط عمومی", value: "آماده" },
    { label: "رابط مدیریت", value: "آماده برای اتصال" },
    { label: "پایگاه داده عملیاتی", value: "متصل نیست" },
    { label: "نسخه", value: "نسخه توسعه" },
  ],
} as const;

export const crmSummaryStats = [
  { label: "جدید" },
  { label: "بدون پاسخ" },
  { label: "جلسه مشاوره" },
  { label: "در انتظار تصمیم" },
] as const;

export const leadTableColumns = [
  "نام متقاضی",
  "موبایل",
  "پایه",
  "خدمت موردنظر",
  "وضعیت",
  "شعبه",
  "تاریخ ثبت",
  "عملیات",
] as const;

export const leadStatusFilterPreview = [
  "جدید",
  "تماس گرفته‌شده",
  "بدون پاسخ",
  "جلسه مشاوره",
  "در انتظار تصمیم",
  "در انتظار پرداخت",
  "ثبت‌نام‌شده",
  "از دست رفته",
] as const;

export const leadsEmptyState = {
  title: "هنوز متقاضی‌ای در سامانه ثبت نشده است.",
  description:
    "پس از فعال شدن فرم پیش‌ثبت‌نام، درخواست‌های جدید در این جدول نمایش داده می‌شوند.",
  ctaLabel: "صفحه پیش‌ثبت‌نام عمومی",
  ctaHref: "/pre-registration",
  secondaryCtaLabel: "تماس با مرکز",
  secondaryCtaHref: "/contact",
} as const;

export const leadDetailUnavailable = {
  title: "پرونده متقاضی در دسترس نیست",
  description:
    "اطلاعات پرونده پس از اتصال سامانه بارگذاری می‌شوند. نمایش جزئیات متقاضی به تکمیل زیرساخت‌های زیر وابسته است.",
  backLabel: "بازگشت به فهرست متقاضیان",
  backHref: "/admin/leads",
  preRegistrationLabel: "مشاهده صفحه پیش‌ثبت‌نام",
  preRegistrationHref: "/pre-registration",
  dependencies: [
    "راه‌اندازی PostgreSQL",
    "اجرای مهاجرت پایگاه داده",
    "فعال‌سازی فرم عمومی پیش‌ثبت‌نام",
    "پیاده‌سازی احراز هویت",
    "تعریف سطح دسترسی مدیران",
  ],
} as const;

export const adminHeaderCopy = {
  panelLabel: "پنل مدیریت",
  previewLabel: "پیش‌نمایش توسعه",
  systemStatus:
    "اتصال عملیاتی پس از راه‌اندازی PostgreSQL و احراز هویت",
  searchLabel: "جستجوی سامانه",
  searchPlaceholder: "جستجو در سامانه — پیش‌نمایش (غیرفعال)",
  userPlaceholder: "کاربر مدیر پس از ورود نمایش داده می‌شود",
} as const;

export function getAdminPageContext(pathname: string): {
  title: string;
  breadcrumbs: readonly AdminBreadcrumbItem[];
} {
  if (pathname.startsWith("/admin/leads/") && pathname !== "/admin/leads") {
    return {
      title: "پرونده متقاضی",
      breadcrumbs: adminBreadcrumbs.leadDetail,
    };
  }

  if (pathname === "/admin/leads") {
    return {
      title: "متقاضیان و CRM",
      breadcrumbs: adminBreadcrumbs.leads,
    };
  }

  return {
    title: "نمای کلی",
    breadcrumbs: adminBreadcrumbs.dashboard,
  };
}
