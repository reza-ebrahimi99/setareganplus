import type {
  RegistrationDocumentType,
  RegistrationPaymentStatus,
  RegistrationStatus,
} from "@/generated/prisma/enums";

export const REGISTRATION_STATUS_LABELS: Record<RegistrationStatus, string> = {
  NEW: "جدید",
  INCOMPLETE: "ناقص",
  NEEDS_CALL: "نیاز به پیگیری",
  WAITING_PAYMENT: "در انتظار پرداخت",
  WAITING_DOCUMENTS: "در انتظار مدارک",
  UNDER_REVIEW: "در حال بررسی",
  APPROVED: "تأیید شده",
  REJECTED: "رد شده",
  CANCELLED: "لغو شده",
};

export const REGISTRATION_PAYMENT_LABELS: Record<
  RegistrationPaymentStatus,
  string
> = {
  UNPAID: "پرداخت‌نشده",
  AWAITING: "در انتظار پرداخت",
  PAID: "پرداخت‌شده",
  FAILED: "ناموفق",
  WAIVED: "معاف",
};

export const REGISTRATION_DOCUMENT_TYPE_LABELS: Record<
  RegistrationDocumentType,
  string
> = {
  STUDENT_PHOTO: "عکس دانش‌آموز",
  NATIONAL_CARD: "کارت ملی",
  BIRTH_CERTIFICATE: "شناسنامه",
  PARENT_CONSENT: "رضایت‌نامه ولی",
  OTHER: "سایر",
};

export const WIZARD_TOTAL_STEPS = 6;

export const WIZARD_STEP_LABELS: Record<number, string> = {
  1: "اطلاعات دانش‌آموز",
  2: "اطلاعات ولی",
  3: "جزئیات ثبت‌نام",
  4: "مدارک",
  5: "بازبینی",
  6: "پرداخت",
};
