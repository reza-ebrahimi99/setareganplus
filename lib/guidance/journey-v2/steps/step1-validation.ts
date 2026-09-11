/**
 * Server-side Step 1 identity validation.
 * Synthetic placeholders such as «داوطلب جدید» never satisfy required fields.
 */

import { toLatinDigits } from "@/lib/forms/latin-digits";
import { validateIranianNationalId } from "@/lib/forms/validate-national-id";
import { parseJalaliDateInput } from "@/lib/datetime/jalali";
import {
  isGuidanceQuotaId,
  type GuidanceQuotaId,
} from "@/lib/guidance/journey/reference-data/quota";
import { IRAN_PROVINCES } from "@/lib/registration/iran-locations";

export const SYNTHETIC_FIRST_NAMES = ["داوطلب", "دانش آموز", "دانش‌آموز"] as const;
export const SYNTHETIC_LAST_NAMES = ["جدید", "جدید ثبت‌نام", "ثبت نشده"] as const;
export const SYNTHETIC_FULL_NAMES = ["داوطلب جدید", "داوطلب", "دانش آموز جدید"] as const;

export type GuidanceV2Step1Input = {
  firstName: string;
  lastName: string;
  nationalId: string;
  gender: string;
  birthDateJalali: string;
  nativeProvince: string;
  regionQuota: string;
  specialQuota: string;
  highSchoolAverage: string;
  alternateMobile?: string;
};

export type GuidanceV2Step1Validated = {
  firstName: string;
  lastName: string;
  nationalId: string;
  gender: "MALE" | "FEMALE";
  birthDateJalali: string;
  nativeProvince: string;
  regionQuota: "1" | "2" | "3";
  specialQuota: GuidanceQuotaId;
  highSchoolAverage: number;
  alternateMobile: string | null;
};

export type GuidanceV2Step1ValidationResult =
  | { ok: true; data: GuidanceV2Step1Validated }
  | {
      ok: false;
      error: string;
      fieldErrors: Record<string, string>;
    };

function collapse(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeCompare(value: string): string {
  return collapse(value).replace(/ي/g, "ی").replace(/ك/g, "ک");
}

export function isSyntheticPlaceholderName(value: string): boolean {
  const normalized = normalizeCompare(value);
  if (!normalized) return true;
  if ((SYNTHETIC_FULL_NAMES as readonly string[]).includes(normalized)) return true;
  if ((SYNTHETIC_FIRST_NAMES as readonly string[]).includes(normalized)) return true;
  if ((SYNTHETIC_LAST_NAMES as readonly string[]).includes(normalized)) return true;
  return false;
}

export function isUsableRequiredText(value: string, minLength = 2): boolean {
  const normalized = collapse(value);
  if (normalized.length < minLength) return false;
  return !isSyntheticPlaceholderName(normalized);
}

function parseAverage(raw: string): number | null {
  const normalized = toLatinDigits(raw.trim()).replace(",", ".");
  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;
  if (value < 0 || value > 20) return null;
  return Math.round(value * 100) / 100;
}

function parseOptionalMobile(raw: string): string | null | { error: string } {
  const value = toLatinDigits(raw.trim());
  if (!value) return null;
  if (!/^09\d{9}$/.test(value)) {
    return { error: "شماره تماس دوم باید ۱۱ رقم و با ۰۹ شروع شود." };
  }
  return value;
}

export function validateGuidanceV2Step1Input(
  input: GuidanceV2Step1Input,
): GuidanceV2Step1ValidationResult {
  const fieldErrors: Record<string, string> = {};

  const firstName = collapse(input.firstName).slice(0, 80);
  const lastName = collapse(input.lastName).slice(0, 80);

  if (!isUsableRequiredText(firstName)) {
    fieldErrors.firstName = isSyntheticPlaceholderName(firstName)
      ? "نام واقعی خود را وارد کنید. مقدار پیش‌فرض «داوطلب» پذیرفته نیست."
      : "نام الزامی است.";
  }

  if (!isUsableRequiredText(lastName)) {
    fieldErrors.lastName = isSyntheticPlaceholderName(lastName)
      ? "نام خانوادگی واقعی خود را وارد کنید. مقدار پیش‌فرض «جدید» پذیرفته نیست."
      : "نام خانوادگی الزامی است.";
  }

  if (
    isSyntheticPlaceholderName(`${firstName} ${lastName}`.trim()) &&
    !fieldErrors.firstName &&
    !fieldErrors.lastName
  ) {
    fieldErrors.firstName = "نام واقعی خود را وارد کنید.";
    fieldErrors.lastName = "نام خانوادگی واقعی خود را وارد کنید.";
  }

  const national = validateIranianNationalId(input.nationalId);
  if (!national.ok) {
    fieldErrors.nationalId = national.error;
  }

  const gender =
    input.gender === "MALE" || input.gender === "FEMALE" ? input.gender : null;
  if (!gender) {
    fieldErrors.gender = "جنسیت را انتخاب کنید.";
  }

  const jalali = parseJalaliDateInput(input.birthDateJalali);
  if (!jalali) {
    fieldErrors.birthDateJalali = "تاریخ تولد شمسی معتبر وارد کنید.";
  }

  const nativeProvince = collapse(input.nativeProvince);
  if (!(IRAN_PROVINCES as readonly string[]).includes(nativeProvince)) {
    fieldErrors.nativeProvince = "استان بومی را از فهرست انتخاب کنید.";
  }

  const regionQuota = toLatinDigits(input.regionQuota.trim());
  if (regionQuota !== "1" && regionQuota !== "2" && regionQuota !== "3") {
    fieldErrors.regionQuota = "سهمیه مناطق را انتخاب کنید.";
  }

  const specialQuota = collapse(input.specialQuota);
  if (!isGuidanceQuotaId(specialQuota)) {
    fieldErrors.specialQuota = "سهمیه خاص را انتخاب کنید.";
  }

  const highSchoolAverage = parseAverage(input.highSchoolAverage);
  if (highSchoolAverage === null) {
    fieldErrors.highSchoolAverage = "معدل باید عددی بین ۰ تا ۲۰ باشد.";
  }

  const mobile = parseOptionalMobile(input.alternateMobile ?? "");
  if (mobile && typeof mobile === "object" && "error" in mobile) {
    fieldErrors.alternateMobile = mobile.error;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      error: "لطفاً موارد مشخص‌شده را اصلاح کنید.",
      fieldErrors,
    };
  }

  return {
    ok: true,
    data: {
      firstName,
      lastName,
      nationalId: national.ok ? national.normalized : "",
      gender: gender!,
      birthDateJalali: collapse(input.birthDateJalali),
      nativeProvince,
      regionQuota: regionQuota as "1" | "2" | "3",
      specialQuota: specialQuota as GuidanceQuotaId,
      highSchoolAverage: highSchoolAverage!,
      alternateMobile: typeof mobile === "string" ? mobile : null,
    },
  };
}

export function stripSyntheticPrefill(prefill: Record<string, string>): Record<string, string> {
  const next = { ...prefill };
  if (isSyntheticPlaceholderName(next.firstName ?? "")) next.firstName = "";
  if (isSyntheticPlaceholderName(next.lastName ?? "")) next.lastName = "";
  return next;
}
