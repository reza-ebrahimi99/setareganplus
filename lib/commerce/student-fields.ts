/**
 * Booklet order academic + acquisition fields.
 * Single source of truth for shop checkout and admin ops.
 */

export const COMMERCE_STUDENT_GRADES = [
  "GRADE_1",
  "GRADE_2",
  "GRADE_3",
  "GRADE_4",
  "GRADE_5",
  "GRADE_6",
  "GRADE_7",
  "GRADE_8",
  "GRADE_9",
  "GRADE_10",
  "GRADE_11",
  "GRADE_12",
] as const;

export type CommerceStudentGradeValue = (typeof COMMERCE_STUDENT_GRADES)[number];

export const COMMERCE_STUDENT_GRADE_LABELS: Record<
  CommerceStudentGradeValue,
  string
> = {
  GRADE_1: "اول",
  GRADE_2: "دوم",
  GRADE_3: "سوم",
  GRADE_4: "چهارم",
  GRADE_5: "پنجم",
  GRADE_6: "ششم",
  GRADE_7: "هفتم",
  GRADE_8: "هشتم",
  GRADE_9: "نهم",
  GRADE_10: "دهم",
  GRADE_11: "یازدهم",
  GRADE_12: "دوازدهم",
};

export const COMMERCE_GRADES_WITH_MAJOR = [
  "GRADE_10",
  "GRADE_11",
  "GRADE_12",
] as const;

export function commerceGradeRequiresMajor(
  grade: string | null | undefined,
): boolean {
  return (
    typeof grade === "string" &&
    (COMMERCE_GRADES_WITH_MAJOR as readonly string[]).includes(grade)
  );
}

export function isCommerceStudentGrade(
  value: string | null | undefined,
): value is CommerceStudentGradeValue {
  return (
    typeof value === "string" &&
    (COMMERCE_STUDENT_GRADES as readonly string[]).includes(value)
  );
}

export const COMMERCE_STUDENT_MAJORS = [
  "MATH",
  "EMPIRICAL",
  "HUMANITIES",
  "TECHNICAL",
  "KAR_DANESH",
] as const;

export type CommerceStudentMajorValue = (typeof COMMERCE_STUDENT_MAJORS)[number];

export const COMMERCE_STUDENT_MAJOR_LABELS: Record<
  CommerceStudentMajorValue,
  string
> = {
  MATH: "ریاضی",
  EMPIRICAL: "تجربی",
  HUMANITIES: "انسانی",
  TECHNICAL: "فنی حرفه‌ای",
  KAR_DANESH: "کاردانش",
};

export function isCommerceStudentMajor(
  value: string | null | undefined,
): value is CommerceStudentMajorValue {
  return (
    typeof value === "string" &&
    (COMMERCE_STUDENT_MAJORS as readonly string[]).includes(value)
  );
}

export const COMMERCE_ACQUISITION_SOURCES = [
  "INSTAGRAM",
  "TELEGRAM",
  "FRIEND",
  "TEACHER",
  "PARENT",
  "OTHER",
] as const;

export type CommerceAcquisitionSourceValue =
  (typeof COMMERCE_ACQUISITION_SOURCES)[number];

export const COMMERCE_ACQUISITION_SOURCE_LABELS: Record<
  CommerceAcquisitionSourceValue,
  string
> = {
  INSTAGRAM: "اینستاگرام",
  TELEGRAM: "تلگرام",
  FRIEND: "دوست",
  TEACHER: "معلم",
  PARENT: "والد",
  OTHER: "سایر",
};

export function isCommerceAcquisitionSource(
  value: string | null | undefined,
): value is CommerceAcquisitionSourceValue {
  return (
    typeof value === "string" &&
    (COMMERCE_ACQUISITION_SOURCES as readonly string[]).includes(value)
  );
}

export const COMMERCE_BOOKLET_PAYMENT_METHODS = [
  "ONLINE",
  "CASH",
  "CARD",
  "TRANSFER",
  "OTHER",
] as const;

export type CommerceBookletPaymentMethodValue =
  (typeof COMMERCE_BOOKLET_PAYMENT_METHODS)[number];

export const COMMERCE_BOOKLET_PAYMENT_METHOD_LABELS: Record<
  CommerceBookletPaymentMethodValue,
  string
> = {
  ONLINE: "پرداخت آنلاین",
  CASH: "نقدی",
  CARD: "کارتخوان",
  TRANSFER: "انتقال بانکی",
  OTHER: "سایر",
};

export function isCommerceBookletPaymentMethod(
  value: string | null | undefined,
): value is CommerceBookletPaymentMethodValue {
  return (
    typeof value === "string" &&
    (COMMERCE_BOOKLET_PAYMENT_METHODS as readonly string[]).includes(value)
  );
}

export function resolveCommerceStudentMajor(params: {
  grade: string | null | undefined;
  major: string | null | undefined;
}):
  | { ok: true; major: CommerceStudentMajorValue | null }
  | { ok: false; error: string } {
  if (!commerceGradeRequiresMajor(params.grade)) {
    return { ok: true, major: null };
  }
  if (!isCommerceStudentMajor(params.major)) {
    return { ok: false, error: "انتخاب رشته تحصیلی برای این پایه الزامی است." };
  }
  return { ok: true, major: params.major };
}
