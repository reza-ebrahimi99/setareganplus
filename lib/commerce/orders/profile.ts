/**
 * Parse and validate booklet order student/academic/pickup profile.
 * Shared by shop checkout and admin create/edit.
 */

import {
  commerceGradeRequiresMajor,
  isCommerceAcquisitionSource,
  isCommerceBookletPaymentMethod,
  isCommerceStudentGrade,
  isCommerceStudentMajor,
  resolveCommerceStudentMajor,
  type CommerceAcquisitionSourceValue,
  type CommerceBookletPaymentMethodValue,
  type CommerceStudentGradeValue,
  type CommerceStudentMajorValue,
} from "@/lib/commerce/student-fields";
import { tehranLocalToUtc } from "@/lib/datetime/tehran-zone";
import { normalizeIranianMobile } from "@/lib/forms/normalize-mobile";
import { validateIranianNationalId } from "@/lib/forms/validate-national-id";

export type BookletOrderProfile = {
  buyerFirstName: string;
  buyerLastName: string;
  buyerName: string;
  parentName: string | null;
  buyerMobile: string;
  buyerNationalCode: string | null;
  studentGrade: CommerceStudentGradeValue;
  studentMajor: CommerceStudentMajorValue | null;
  pickupBranchId: string;
  notes: string | null;
  specialNotes: string | null;
  urgentDelivery: boolean;
  preferredPickupAt: Date | null;
  acquisitionSource: CommerceAcquisitionSourceValue | null;
  referredBy: string | null;
  discountCode: string | null;
  bookletPaymentMethod: CommerceBookletPaymentMethodValue | null;
};

export type ParseBookletOrderProfileInput = {
  buyerFirstName?: string | null;
  buyerLastName?: string | null;
  parentName?: string | null;
  buyerMobile?: string | null;
  buyerNationalCode?: string | null;
  studentGrade?: string | null;
  studentMajor?: string | null;
  pickupBranchId?: string | null;
  /** Legacy checkout field — treated as pickup when pickupBranchId is empty. */
  branchId?: string | null;
  notes?: string | null;
  specialNotes?: string | null;
  urgentDelivery?: boolean | string | null;
  preferredPickupAt?: string | Date | null;
  acquisitionSource?: string | null;
  referredBy?: string | null;
  discountCode?: string | null;
  bookletPaymentMethod?: string | null;
};

function text(value: string | null | undefined, max = 120): string {
  return String(value ?? "").trim().slice(0, max);
}

function optionalText(value: string | null | undefined, max = 160): string | null {
  const next = text(value, max);
  return next || null;
}

function parsePreferredPickupAt(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const raw = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [year, month, day] = raw.split("-").map(Number);
    if (!year || !month || !day) return null;
    return tehranLocalToUtc(year, month, day, 12, 0, 0);
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function parseBookletOrderProfile(
  input: ParseBookletOrderProfileInput,
): { ok: true; profile: BookletOrderProfile } | { ok: false; error: string } {
  const buyerFirstName = text(input.buyerFirstName, 80);
  const buyerLastName = text(input.buyerLastName, 80);
  if (!buyerFirstName || !buyerLastName) {
    return { ok: false, error: "نام و نام خانوادگی دانش‌آموز الزامی است." };
  }

  const mobile = normalizeIranianMobile(String(input.buyerMobile ?? ""));
  if (!mobile.ok) return { ok: false, error: mobile.error };

  const nationalRaw = text(input.buyerNationalCode, 12);
  let buyerNationalCode: string | null = null;
  if (nationalRaw) {
    const national = validateIranianNationalId(nationalRaw);
    if (!national.ok) return { ok: false, error: national.error };
    buyerNationalCode = national.normalized;
  }

  if (!isCommerceStudentGrade(input.studentGrade)) {
    return { ok: false, error: "انتخاب پایه تحصیلی الزامی است." };
  }
  const major = resolveCommerceStudentMajor({
    grade: input.studentGrade,
    major: input.studentMajor,
  });
  if (!major.ok) return major;

  const pickupBranchId =
    text(input.pickupBranchId, 64) || text(input.branchId, 64);
  if (!pickupBranchId) {
    return { ok: false, error: "محل دریافت جزوه الزامی است." };
  }

  const acquisition = optionalText(input.acquisitionSource, 32);
  if (acquisition && !isCommerceAcquisitionSource(acquisition)) {
    return { ok: false, error: "نحوه آشنایی معتبر نیست." };
  }

  const paymentMethod = optionalText(input.bookletPaymentMethod, 32);
  if (paymentMethod && !isCommerceBookletPaymentMethod(paymentMethod)) {
    return { ok: false, error: "روش پرداخت معتبر نیست." };
  }

  const urgentRaw = input.urgentDelivery;
  const urgentDelivery =
    urgentRaw === true ||
    urgentRaw === "1" ||
    urgentRaw === "true" ||
    urgentRaw === "on";

  return {
    ok: true,
    profile: {
      buyerFirstName,
      buyerLastName,
      buyerName: `${buyerFirstName} ${buyerLastName}`.trim(),
      parentName: optionalText(input.parentName, 80),
      buyerMobile: mobile.normalized,
      buyerNationalCode,
      studentGrade: input.studentGrade,
      studentMajor: major.major,
      pickupBranchId,
      notes: optionalText(input.notes, 2000),
      specialNotes: optionalText(input.specialNotes, 2000),
      urgentDelivery,
      preferredPickupAt: parsePreferredPickupAt(input.preferredPickupAt),
      acquisitionSource: acquisition
        ? (acquisition as CommerceAcquisitionSourceValue)
        : null,
      referredBy: optionalText(input.referredBy, 120),
      discountCode: optionalText(input.discountCode, 40),
      bookletPaymentMethod: paymentMethod
        ? (paymentMethod as CommerceBookletPaymentMethodValue)
        : null,
    },
  };
}

export function gradeRequiresMajor(grade: string | null | undefined): boolean {
  return commerceGradeRequiresMajor(grade);
}

export function isCommerceStudentMajorValue(
  value: string | null | undefined,
): value is CommerceStudentMajorValue {
  return isCommerceStudentMajor(value);
}
