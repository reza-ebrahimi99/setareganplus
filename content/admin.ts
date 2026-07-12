export const adminNotice =
  "این بخش در حال اتصال به سامانه احراز هویت و پایگاه داده است." as const;

export const adminNavItems = [
  { href: "/admin", label: "نمای کلی", enabled: true },
  { href: "/admin/leads", label: "متقاضیان و CRM", enabled: true },
  { label: "ثبت‌نام‌ها", enabled: false },
  { label: "دانش‌آموزان", enabled: false },
  { label: "کلاس‌ها و دوره‌ها", enabled: false },
  { label: "آزمون‌ها", enabled: false },
  { label: "امور مالی", enabled: false },
  { label: "گزارش‌ها", enabled: false },
  { label: "تنظیمات", enabled: false },
] as const;

export const dashboardStats = [
  { label: "متقاضیان جدید" },
  { label: "در انتظار پیگیری" },
  { label: "جلسات مشاوره" },
  { label: "ثبت‌نام‌های تکمیل‌شده" },
] as const;

export const platformReadiness = [
  { label: "زیرساخت چندمجموعه‌ای", status: "آماده", tone: "ready" as const },
  { label: "مدل نقش‌ها و دسترسی‌ها", status: "آماده", tone: "ready" as const },
  {
    label: "اتصال PostgreSQL",
    status: "در انتظار راه‌اندازی سرور",
    tone: "pending" as const,
  },
  {
    label: "احراز هویت مدیر",
    status: "در نقشه توسعه",
    tone: "planned" as const,
  },
  {
    label: "فرم پیش‌ثبت‌نام",
    status: "در نقشه توسعه",
    tone: "planned" as const,
  },
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
    "پس از راه‌اندازی پایگاه داده، مهاجرت، احراز هویت و اتصال فرم عمومی پیش‌ثبت‌نام، فهرست متقاضیان در این بخش نمایش داده می‌شود.",
  ctaLabel: "صفحه پیش‌ثبت‌نام عمومی",
  ctaHref: "/pre-registration",
} as const;

export const leadDetailUnavailable = {
  title: "پرونده متقاضی در دسترس نیست",
  description:
    "نمایش جزئیات متقاضی پس از راه‌اندازی PostgreSQL، اجرای مهاجرت، فعال‌سازی فرم عمومی پیش‌ثبت‌نام و احراز هویت مدیران امکان‌پذیر خواهد شد.",
  backLabel: "بازگشت به فهرست متقاضیان",
  backHref: "/admin/leads",
} as const;
