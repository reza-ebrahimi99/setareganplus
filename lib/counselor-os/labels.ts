/**
 * Counselor OS — Persian display labels. Never show raw domain enums to staff.
 */

const EXAM_GROUPS: Record<string, string> = {
  MATHEMATICS: "ریاضی و فیزیک",
  EXPERIMENTAL_SCIENCES: "علوم تجربی",
  HUMANITIES: "علوم انسانی",
  ARTS: "هنر",
  LANGUAGES: "زبان‌های خارجی",
};

const GENDERS: Record<string, string> = {
  MALE: "پسر",
  FEMALE: "دختر",
};

const PACKAGE_TITLES: Record<string, string> = {
  START: "شروع مسیر",
  SMART: "هوشمند",
  SPECIALIZED: "تخصصی",
  PREMIUM: "ممتاز",
};

const PRIORITY_FACTORS: Record<string, string> = {
  MAJOR: "رشته",
  CITY: "شهر",
  EDUCATION_TYPE: "نوع دانشگاه / دوره",
};

const PAYMENT_STATUSES: Record<string, string> = {
  PAID: "پرداخت‌شده",
  PENDING: "در انتظار پرداخت",
  FAILED: "ناموفق",
  CANCELLED: "لغو شده",
  EXPIRED: "منقضی",
  REFUNDED: "بازگشت وجه",
};

const BOOKING_STATUSES: Record<string, string> = {
  PENDING: "در انتظار",
  CONFIRMED: "تأیید شده",
  CANCELLED: "لغو شده",
  COMPLETED: "انجام شده",
  NO_SHOW: "غیبت",
  BOOKED: "رزرو شده",
  CANCELLED_BY_STUDENT: "لغو توسط دانش‌آموز",
  CANCELLED_BY_COUNSELOR: "لغو توسط مشاور",
};

const MEETING_TYPES: Record<string, string> = {
  IN_PERSON: "حضوری",
  PHONE: "تلفنی",
  ONLINE: "آنلاین",
};

const FOLLOW_UP_PRIORITIES: Record<string, string> = {
  LOW: "کم",
  NORMAL: "عادی",
  HIGH: "بالا",
};

const FOLLOW_UP_STATUSES: Record<string, string> = {
  PENDING: "باز",
  COMPLETED: "انجام شد",
  CANCELLED: "لغو شده",
};

const SESSION_STATUSES: Record<string, string> = {
  SCHEDULED: "برنامه‌ریزی‌شده",
  COMPLETED: "انجام شده",
  CANCELLED: "لغو شده",
  NO_SHOW: "غیبت",
};

const JOURNEY_STATUSES: Record<string, string> = {
  completed: "انجام شده",
  current: "مرحله جاری",
  untouched: "شروع نشده",
  active: "مرحله جاری",
  locked: "قفل",
};

const ROLES: Record<string, string> = {
  PLATFORM_ADMIN: "مدیر سامانه",
  ORGANIZATION_OWNER: "مالک مجموعه",
  ORGANIZATION_ADMIN: "مدیر مجموعه",
  BRANCH_MANAGER: "مدیر شعبه",
  ADVISOR: "مشاور",
  ADMISSIONS_MANAGER: "مدیر پذیرش",
  ADMISSIONS_AGENT: "کارشناس پذیرش",
  CALL_OPERATOR: "اپراتور تماس",
  REPORT_VIEWER: "گزارش‌گیر",
  TEACHER: "دبیر",
  FINANCE: "مالی",
  REGISTRATION_STAFF: "ثبت‌نام",
  SUPPORT: "پشتیبانی",
  CONTENT_MANAGER: "محتوا",
};

export function labelExamGroup(code: string | null | undefined): string {
  if (!code) return "—";
  return EXAM_GROUPS[code] ?? code;
}

export function labelGender(code: string | null | undefined): string {
  if (!code) return "—";
  return GENDERS[code] ?? code;
}

export function labelPackage(code: string | null | undefined): string {
  if (!code) return "بدون بسته";
  return PACKAGE_TITLES[code] ?? code;
}

export function labelPriorityFactor(code: string): string {
  return PRIORITY_FACTORS[code] ?? code;
}

export function labelPaymentStatus(code: string | null | undefined): string {
  if (!code) return "—";
  return PAYMENT_STATUSES[code] ?? code;
}

export function labelBookingStatus(code: string | null | undefined): string {
  if (!code) return "—";
  return BOOKING_STATUSES[code] ?? code;
}

export function labelMeetingType(code: string | null | undefined): string {
  if (!code) return "—";
  return MEETING_TYPES[code] ?? code;
}

export function labelFollowUpPriority(code: string | null | undefined): string {
  if (!code) return "عادی";
  return FOLLOW_UP_PRIORITIES[code] ?? code;
}

export function labelFollowUpStatus(code: string | null | undefined): string {
  if (!code) return "—";
  return FOLLOW_UP_STATUSES[code] ?? code;
}

export function labelSessionStatus(code: string | null | undefined): string {
  if (!code) return "—";
  return SESSION_STATUSES[code] ?? code;
}

export function labelJourneyStatus(code: string | null | undefined): string {
  if (!code) return "—";
  return JOURNEY_STATUSES[code] ?? code;
}

export function labelStaffRole(code: string | null | undefined): string {
  if (!code) return "همکار";
  return ROLES[code] ?? code;
}

export function formatTomanFromRials(rials: number | null | undefined): string {
  if (rials == null || !Number.isFinite(rials)) return "—";
  const toman = Math.round(rials / 10);
  return `${toman.toLocaleString("fa-IR")} تومان`;
}

export type PackagePresentation =
  | "none"
  | "selected_unpaid"
  | "paid"
  | "active"
  | "needs_review";

export function packagePresentation(input: {
  code: string | null;
  paid: boolean;
  activated: boolean;
}): { state: PackagePresentation; label: string } {
  if (!input.code) return { state: "none", label: "بدون بسته" };
  if (input.activated && input.paid) {
    return { state: "active", label: "فعال" };
  }
  if (input.paid && !input.activated) {
    return { state: "needs_review", label: "پرداخت‌شده — نیازمند بررسی" };
  }
  if (!input.paid) {
    return { state: "selected_unpaid", label: "انتخاب‌شده، پرداخت نشده" };
  }
  return { state: "paid", label: "پرداخت‌شده" };
}

export const PERSIAN_WEEKDAYS = [
  "شنبه",
  "یکشنبه",
  "دوشنبه",
  "سه‌شنبه",
  "چهارشنبه",
  "پنجشنبه",
  "جمعه",
] as const;

export function labelWeekday(index: number): string {
  return PERSIAN_WEEKDAYS[index] ?? `روز ${index}`;
}

export const COUNSELOR_EDITABLE_PERSONAL_FIELDS: Record<string, string> = {
  firstName: "نام",
  lastName: "نام خانوادگی",
  nationalId: "کد ملی",
  nativeProvince: "استان بومی",
  regionQuota: "سهمیه منطقه",
  highSchoolAverage: "معدل کتبی",
  alternateMobile: "موبایل دوم",
};
