import {
  RegistrationDocumentType,
  RegistrationFlowPaymentMode,
  RegistrationFlowStepKey,
  type RegistrationDocumentType as RegistrationDocumentTypeValue,
  type RegistrationFlowPaymentMode as RegistrationFlowPaymentModeValue,
  type RegistrationFlowStepKey as RegistrationFlowStepKeyValue,
} from "@/generated/prisma/enums";

export const DEFAULT_FLOW_STEPS: ReadonlyArray<{
  stepKey: RegistrationFlowStepKeyValue;
  label: string;
  enabled: boolean;
  sortOrder: number;
}> = [
  {
    stepKey: RegistrationFlowStepKey.APPLICANT,
    label: "اطلاعات متقاضی",
    enabled: true,
    sortOrder: 0,
  },
  {
    stepKey: RegistrationFlowStepKey.STUDENT,
    label: "اطلاعات دانش‌آموز",
    enabled: true,
    sortOrder: 1,
  },
  {
    stepKey: RegistrationFlowStepKey.FORM,
    label: "فرم تکمیلی",
    enabled: true,
    sortOrder: 2,
  },
  {
    stepKey: RegistrationFlowStepKey.DOCUMENTS,
    label: "مدارک",
    enabled: true,
    sortOrder: 3,
  },
  {
    stepKey: RegistrationFlowStepKey.PAYMENT,
    label: "پرداخت",
    enabled: true,
    sortOrder: 4,
  },
  {
    stepKey: RegistrationFlowStepKey.REVIEW,
    label: "بازبینی و تأیید",
    enabled: true,
    sortOrder: 5,
  },
];

export const FLOW_STEP_LABELS: Record<RegistrationFlowStepKeyValue, string> = {
  [RegistrationFlowStepKey.APPLICANT]: "اطلاعات متقاضی",
  [RegistrationFlowStepKey.STUDENT]: "اطلاعات دانش‌آموز",
  [RegistrationFlowStepKey.FORM]: "فرم تکمیلی",
  [RegistrationFlowStepKey.DOCUMENTS]: "مدارک",
  [RegistrationFlowStepKey.PAYMENT]: "پرداخت",
  [RegistrationFlowStepKey.REVIEW]: "بازبینی و تأیید",
};

export const FLOW_LIFECYCLE_LABELS = {
  DRAFT: "پیش‌نویس",
  ACTIVE: "فعال",
  ARCHIVED: "بایگانی",
} as const;

export const FLOW_PAYMENT_MODE_LABELS: Record<
  RegistrationFlowPaymentModeValue,
  string
> = {
  [RegistrationFlowPaymentMode.FREE]: "رایگان",
  [RegistrationFlowPaymentMode.FIXED_AMOUNT]: "مبلغ ثابت",
  [RegistrationFlowPaymentMode.OPTIONAL_PAYMENT]: "پرداخت اختیاری",
  [RegistrationFlowPaymentMode.DEPOSIT]: "بیعانه",
};

export function flowRequiresCheckout(
  mode: RegistrationFlowPaymentModeValue,
  opts?: { skipOptionalPayment?: boolean },
): boolean {
  if (mode === RegistrationFlowPaymentMode.FREE) return false;
  if (
    mode === RegistrationFlowPaymentMode.OPTIONAL_PAYMENT &&
    opts?.skipOptionalPayment
  ) {
    return false;
  }
  return true;
}

export const DOCUMENT_TYPE_LABELS: Record<
  RegistrationDocumentTypeValue,
  string
> = {
  [RegistrationDocumentType.STUDENT_PHOTO]: "عکس دانش‌آموز",
  [RegistrationDocumentType.NATIONAL_CARD]: "کارت ملی",
  [RegistrationDocumentType.BIRTH_CERTIFICATE]: "شناسنامه",
  [RegistrationDocumentType.PARENT_CONSENT]: "رضایت‌نامه ولی",
  [RegistrationDocumentType.OTHER]: "سایر",
};

export const DEFAULT_ACCEPTED_MIME =
  "image/jpeg,image/png,image/webp,application/pdf";
export const DEFAULT_MAX_FILE_BYTES = 5 * 1024 * 1024;

export const PRODUCT_TYPE_LABELS: Record<
  import("@/generated/prisma/enums").RegistrationProductType,
  string
> = {
  EXAM: "آزمون",
  CLASS: "کلاس",
  CAMP: "اردو",
  WORKSHOP: "کارگاه",
  EVENT: "رویداد",
  SCHOOL_ADMISSION: "پذیرش مدرسه",
};
