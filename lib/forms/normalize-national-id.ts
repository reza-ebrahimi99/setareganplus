import { toLatinDigits } from "@/lib/forms/latin-digits";

export type NormalizeNationalIdResult =
  | { ok: true; normalized: string }
  | { ok: false; error: string };

/**
 * Normalizes Iranian national ID input for storage/validation.
 * Does not prove identity — structure only.
 * TODO(auth): OTP / identity verification in a later increment.
 */
export function normalizeNationalId(rawInput: string): NormalizeNationalIdResult {
  const latin = toLatinDigits(rawInput);
  const digits = latin.replace(/[\s\-]/g, "").replace(/[^\d]/g, "");

  if (digits.length === 0) {
    return { ok: false, error: "کد ملی باید ۱۰ رقم باشد." };
  }

  if (digits.length !== 10) {
    return { ok: false, error: "کد ملی باید ۱۰ رقم باشد." };
  }

  return { ok: true, normalized: digits };
}
