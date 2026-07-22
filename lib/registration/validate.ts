/**
 * Step + submit validation for Registration Engine.
 */

import {
  Gender,
  RegistrationParentRelationship,
} from "@/generated/prisma/enums";
import { jalaliToGregorian, type JalaliDate } from "@/lib/datetime/jalali";
import { normalizeEmail } from "@/lib/forms/normalize-email";
import { normalizeIranianMobile } from "@/lib/forms/normalize-mobile";
import { validateIranianNationalId } from "@/lib/forms/validate-national-id";
import { getRegistrationCatalog } from "@/lib/registration/catalog-registry";
import { IRAN_PROVINCES } from "@/lib/registration/iran-locations";
import type {
  CreateRegistrationInput,
  DetailsStepInput,
  ParentStepInput,
  StudentStepInput,
} from "@/lib/registration/types";
import { registrationGradeRequiresMajor } from "@/lib/registration/options";

export type FieldErrors = Record<string, string>;

function trim(value: string): string {
  return value.trim();
}

export function validateStudentStep(
  input: StudentStepInput,
): { ok: true } | { ok: false; errors: FieldErrors } {
  const errors: FieldErrors = {};

  if (!trim(input.firstName)) errors.firstName = "نام الزامی است.";
  if (!trim(input.lastName)) errors.lastName = "نام خانوادگی الزامی است.";

  const national = validateIranianNationalId(input.nationalCode);
  if (!national.ok) errors.nationalCode = national.error;

  if (!input.birthDate) {
    errors.birthDate = "تاریخ تولد الزامی است.";
  } else {
    const { gy, gm, gd } = jalaliToGregorian(
      input.birthDate.jy,
      input.birthDate.jm,
      input.birthDate.jd,
    );
    const birth = new Date(Date.UTC(gy, gm - 1, gd));
    if (Number.isNaN(birth.getTime()) || birth > new Date()) {
      errors.birthDate = "تاریخ تولد معتبر نیست.";
    }
  }

  if (
    input.gender !== Gender.MALE &&
    input.gender !== Gender.FEMALE &&
    input.gender !== Gender.UNSPECIFIED
  ) {
    errors.gender = "جنسیت را انتخاب کنید.";
  }

  if (!trim(input.gradeSlug) || !trim(input.gradeLabel)) {
    errors.gradeSlug = "پایه تحصیلی الزامی است.";
  } else if (
    registrationGradeRequiresMajor(input.gradeSlug) &&
    !trim(input.majorSlug)
  ) {
    errors.majorSlug = "برای این پایه، انتخاب رشته الزامی است.";
  }

  if (!trim(input.schoolName)) errors.schoolName = "نام مدرسه الزامی است.";

  if (
    !trim(input.province) ||
    !(IRAN_PROVINCES as readonly string[]).includes(input.province)
  ) {
    errors.province = "استان را از فهرست انتخاب کنید.";
  }

  if (!trim(input.city)) errors.city = "شهر الزامی است.";

  return Object.keys(errors).length === 0
    ? { ok: true }
    : { ok: false, errors };
}

export function validateParentStep(
  input: ParentStepInput,
): { ok: true } | { ok: false; errors: FieldErrors } {
  const errors: FieldErrors = {};

  if (!trim(input.parentName)) errors.parentName = "نام ولی الزامی است.";

  if (
    input.relationship !== RegistrationParentRelationship.FATHER &&
    input.relationship !== RegistrationParentRelationship.MOTHER &&
    input.relationship !== RegistrationParentRelationship.GUARDIAN &&
    input.relationship !== RegistrationParentRelationship.OTHER
  ) {
    errors.relationship = "نسبت را انتخاب کنید.";
  }

  const mobile = normalizeIranianMobile(input.mobile);
  if (!mobile.ok) errors.mobile = mobile.error;

  if (trim(input.secondaryMobile)) {
    const secondary = normalizeIranianMobile(input.secondaryMobile);
    if (!secondary.ok) errors.secondaryMobile = secondary.error;
  }

  if (trim(input.email)) {
    const email = normalizeEmail(input.email);
    if (!email.ok) errors.email = email.error;
  } else {
    errors.email = "ایمیل الزامی است.";
  }

  return Object.keys(errors).length === 0
    ? { ok: true }
    : { ok: false, errors };
}

export function validateDetailsStep(
  flowKey: string,
  input: DetailsStepInput,
): { ok: true } | { ok: false; errors: FieldErrors } {
  const errors: FieldErrors = {};
  const catalog = getRegistrationCatalog(flowKey);
  if (!catalog) {
    return { ok: false, errors: { productKey: "جریان ثبت‌نام یافت نشد." } };
  }

  if (!catalog.products.some((item) => item.key === input.productKey)) {
    errors.productKey = "آزمون را انتخاب کنید.";
  }
  if (!catalog.sessions.some((item) => item.key === input.sessionKey)) {
    errors.sessionKey = "نوبت را انتخاب کنید.";
  }
  if (!catalog.packages.some((item) => item.key === input.packageKey)) {
    errors.packageKey = "بسته را انتخاب کنید.";
  }
  if (
    !catalog.venueBranches.some((item) => item.key === input.venueBranchKey)
  ) {
    errors.venueBranchKey = "شعبه را انتخاب کنید.";
  }

  if (trim(input.discountCode)) {
    const code = trim(input.discountCode).toUpperCase();
    if (!(code in catalog.discountCodes)) {
      errors.discountCode = "کد تخفیف معتبر نیست.";
    }
  }

  return Object.keys(errors).length === 0
    ? { ok: true }
    : { ok: false, errors };
}

export function resolvePricing(
  flowKey: string,
  details: DetailsStepInput,
):
  | {
      ok: true;
      amountRials: number;
      discountRials: number;
      finalAmountRials: number;
      productTitle: string;
      sessionTitle: string;
      packageTitle: string;
      venueBranchTitle: string;
      discountCode: string | null;
    }
  | { ok: false; error: string } {
  const catalog = getRegistrationCatalog(flowKey);
  if (!catalog) return { ok: false, error: "جریان ثبت‌نام یافت نشد." };

  const product = catalog.products.find((item) => item.key === details.productKey);
  const session = catalog.sessions.find((item) => item.key === details.sessionKey);
  const pkg = catalog.packages.find((item) => item.key === details.packageKey);
  const venue = catalog.venueBranches.find(
    (item) => item.key === details.venueBranchKey,
  );

  if (!product || !session || !pkg || !venue) {
    return { ok: false, error: "جزئیات ثبت‌نام ناقص است." };
  }

  const amountRials = pkg.amountRials;
  const code = trim(details.discountCode).toUpperCase();
  const discountRials =
    code && code in catalog.discountCodes
      ? Math.min(catalog.discountCodes[code]!, amountRials)
      : 0;

  return {
    ok: true,
    amountRials,
    discountRials,
    finalAmountRials: Math.max(0, amountRials - discountRials),
    productTitle: product.title,
    sessionTitle: session.title,
    packageTitle: pkg.title,
    venueBranchTitle: venue.title,
    discountCode: discountRials > 0 ? code : null,
  };
}

export function birthDateToUtcDate(birthDate: JalaliDate): Date {
  const { gy, gm, gd } = jalaliToGregorian(
    birthDate.jy,
    birthDate.jm,
    birthDate.jd,
  );
  return new Date(Date.UTC(gy, gm - 1, gd));
}

export function validateCreateRegistrationInput(
  input: CreateRegistrationInput,
):
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: FieldErrors } {
  if (input.honeypot?.trim()) {
    return { ok: false, error: "درخواست نامعتبر است." };
  }

  const studentErrors: FieldErrors = {};
  if (!trim(input.student.firstName)) {
    studentErrors.firstName = "نام الزامی است.";
  }
  if (!trim(input.student.lastName)) {
    studentErrors.lastName = "نام خانوادگی الزامی است.";
  }
  const national = validateIranianNationalId(input.student.nationalCode);
  if (!national.ok) studentErrors.nationalCode = national.error;
  if (!input.student.birthDate) {
    studentErrors.birthDate = "تاریخ تولد الزامی است.";
  }
  if (
    input.student.gender !== Gender.MALE &&
    input.student.gender !== Gender.FEMALE &&
    input.student.gender !== Gender.UNSPECIFIED
  ) {
    studentErrors.gender = "جنسیت را انتخاب کنید.";
  }
  if (!trim(input.student.gradeLabel)) {
    studentErrors.gradeSlug = "پایه تحصیلی الزامی است.";
  }
  if (!trim(input.student.schoolName)) {
    studentErrors.schoolName = "نام مدرسه الزامی است.";
  }
  if (
    !trim(input.student.province) ||
    !(IRAN_PROVINCES as readonly string[]).includes(input.student.province)
  ) {
    studentErrors.province = "استان را از فهرست انتخاب کنید.";
  }
  if (!trim(input.student.city)) studentErrors.city = "شهر الزامی است.";

  const parentCheck = validateParentStep({
    parentName: input.parent.parentName,
    relationship: input.parent.relationship,
    mobile: input.parent.mobile,
    secondaryMobile: input.parent.secondaryMobile ?? "",
    email: input.parent.email ?? "",
    address: input.parent.address ?? "",
  });

  const detailsCheck = validateDetailsStep(input.flowKey, {
    productKey: input.details.productKey,
    sessionKey: input.details.sessionKey,
    packageKey: input.details.packageKey,
    venueBranchKey: input.details.venueBranchKey,
    discountCode: input.details.discountCode ?? "",
  });

  const fieldErrors: FieldErrors = {
    ...studentErrors,
    ...(parentCheck.ok ? {} : parentCheck.errors),
    ...(detailsCheck.ok ? {} : detailsCheck.errors),
  };

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      error: "لطفاً خطاهای فرم را برطرف کنید.",
      fieldErrors,
    };
  }

  return { ok: true };
}
