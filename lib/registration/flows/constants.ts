import {
  RegistrationDocumentType,
  RegistrationFlowPaymentMode,
  RegistrationFlowStepKey,
  RegistrationProductType,
  type RegistrationDocumentType as RegistrationDocumentTypeValue,
  type RegistrationFlowPaymentMode as RegistrationFlowPaymentModeValue,
  type RegistrationFlowStepKey as RegistrationFlowStepKeyValue,
  type RegistrationProductType as RegistrationProductTypeValue,
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
  {
    stepKey: RegistrationFlowStepKey.CONFIRMATION,
    label: "تأیید نهایی",
    enabled: true,
    sortOrder: 6,
  },
];

export const FLOW_STEP_LABELS: Record<RegistrationFlowStepKeyValue, string> = {
  [RegistrationFlowStepKey.APPLICANT]: "اطلاعات متقاضی",
  [RegistrationFlowStepKey.STUDENT]: "اطلاعات دانش‌آموز",
  [RegistrationFlowStepKey.FORM]: "فرم تکمیلی",
  [RegistrationFlowStepKey.DOCUMENTS]: "مدارک",
  [RegistrationFlowStepKey.PAYMENT]: "پرداخت",
  [RegistrationFlowStepKey.REVIEW]: "بازبینی و تأیید",
  [RegistrationFlowStepKey.CONFIRMATION]: "تأیید نهایی",
};

export const FLOW_LIFECYCLE_LABELS = {
  DRAFT: "پیش‌نویس",
  ACTIVE: "فعال",
  ARCHIVED: "بایگانی",
} as const;

/** Preferred payment modes for new Product & Service Flows. */
export const PRIMARY_FLOW_PAYMENT_MODES: readonly RegistrationFlowPaymentModeValue[] =
  [
    RegistrationFlowPaymentMode.FREE,
    RegistrationFlowPaymentMode.FIXED_PRICE,
    RegistrationFlowPaymentMode.OPTIONAL,
    RegistrationFlowPaymentMode.DEPOSIT,
    RegistrationFlowPaymentMode.VARIABLE_PRICE,
    RegistrationFlowPaymentMode.INSTALLMENT,
  ];

export const FLOW_PAYMENT_MODE_LABELS: Record<
  RegistrationFlowPaymentModeValue,
  string
> = {
  [RegistrationFlowPaymentMode.FREE]: "رایگان",
  [RegistrationFlowPaymentMode.FIXED_PRICE]: "قیمت ثابت",
  [RegistrationFlowPaymentMode.OPTIONAL]: "پرداخت اختیاری",
  [RegistrationFlowPaymentMode.DEPOSIT]: "بیعانه",
  [RegistrationFlowPaymentMode.VARIABLE_PRICE]: "قیمت متغیر",
  [RegistrationFlowPaymentMode.INSTALLMENT]: "اقساطی",
  // Legacy aliases (existing rows)
  [RegistrationFlowPaymentMode.FIXED_AMOUNT]: "مبلغ ثابت (قدیمی)",
  [RegistrationFlowPaymentMode.OPTIONAL_PAYMENT]: "پرداخت اختیاری (قدیمی)",
};

export function flowRequiresCheckout(
  mode: RegistrationFlowPaymentModeValue,
  opts?: { skipOptionalPayment?: boolean },
): boolean {
  if (mode === RegistrationFlowPaymentMode.FREE) return false;
  if (
    (mode === RegistrationFlowPaymentMode.OPTIONAL ||
      mode === RegistrationFlowPaymentMode.OPTIONAL_PAYMENT) &&
    opts?.skipOptionalPayment
  ) {
    return false;
  }
  return true;
}

export function isFixedPricePaymentMode(
  mode: RegistrationFlowPaymentModeValue,
): boolean {
  return (
    mode === RegistrationFlowPaymentMode.FIXED_PRICE ||
    mode === RegistrationFlowPaymentMode.FIXED_AMOUNT ||
    mode === RegistrationFlowPaymentMode.DEPOSIT ||
    mode === RegistrationFlowPaymentMode.INSTALLMENT
  );
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
  "image/jpeg,image/png,image/webp,application/pdf,application/zip";
export const DEFAULT_MAX_FILE_BYTES = 5 * 1024 * 1024;

export const PRODUCT_TYPE_LABELS: Record<RegistrationProductTypeValue, string> =
  {
    [RegistrationProductType.SCHOOL_REGISTRATION]: "ثبت‌نام مدرسه",
    [RegistrationProductType.BOOK]: "کتاب",
    [RegistrationProductType.WORKBOOK]: "دفترچه / کتاب کار",
    [RegistrationProductType.SCHOOL_UNIFORM]: "لباس فرم",
    [RegistrationProductType.SCHOOL_SUPPLIES]: "لوازم‌التحریر",
    [RegistrationProductType.TRANSPORT]: "سرویس ایاب‌وذهاب",
    [RegistrationProductType.MEAL_PLAN]: "طرح تغذیه",
    [RegistrationProductType.SUMMER_CAMP]: "اردوی تابستانی",
    [RegistrationProductType.COURSE]: "دوره آموزشی",
    [RegistrationProductType.EXAM]: "آزمون",
    [RegistrationProductType.EVENT]: "رویداد",
    [RegistrationProductType.TUITION_PAYMENT]: "پرداخت شهریه",
    [RegistrationProductType.CERTIFICATE]: "گواهی / مدرک",
    [RegistrationProductType.CONSULTATION]: "مشاوره",
    [RegistrationProductType.DIGITAL_PRODUCT]: "محصول دیجیتال",
    [RegistrationProductType.CLASS]: "کلاس",
    [RegistrationProductType.CAMP]: "اردو",
    [RegistrationProductType.WORKSHOP]: "کارگاه",
    [RegistrationProductType.SCHOOL_ADMISSION]: "پذیرش مدرسه",
    [RegistrationProductType.OTHER]: "سایر",
  };

/** Product types highlighted for common school commerce flows. */
export const PRIMARY_PRODUCT_TYPES: readonly RegistrationProductTypeValue[] = [
  RegistrationProductType.SCHOOL_REGISTRATION,
  RegistrationProductType.SCHOOL_UNIFORM,
  RegistrationProductType.BOOK,
  RegistrationProductType.SUMMER_CAMP,
  RegistrationProductType.EXAM,
  RegistrationProductType.COURSE,
  RegistrationProductType.EVENT,
  RegistrationProductType.TRANSPORT,
  RegistrationProductType.MEAL_PLAN,
  RegistrationProductType.OTHER,
];
