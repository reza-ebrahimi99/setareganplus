import { normalizeNationalId } from "@/lib/forms/normalize-national-id";

export type ValidateNationalIdResult =
  | { ok: true; normalized: string }
  | { ok: false; error: string };

function isRepeatedDigits(digits: string): boolean {
  return /^(\d)\1{9}$/.test(digits);
}

/**
 * Official Iranian national ID check-digit algorithm (structural only).
 * Sum d[i]*(10-i) for i=0..8; rem = sum % 11;
 * if rem < 2 → check == rem; else check == 11 - rem.
 */
export function hasValidIranianNationalIdChecksum(digits: string): boolean {
  if (!/^\d{10}$/.test(digits) || isRepeatedDigits(digits)) {
    return false;
  }

  let sum = 0;
  for (let i = 0; i < 9; i += 1) {
    sum += Number(digits[i]) * (10 - i);
  }
  const rem = sum % 11;
  const check = Number(digits[9]);
  return rem < 2 ? check === rem : check === 11 - rem;
}

export function validateIranianNationalId(
  rawInput: string,
): ValidateNationalIdResult {
  const normalized = normalizeNationalId(rawInput);
  if (!normalized.ok) {
    return normalized;
  }

  if (!hasValidIranianNationalIdChecksum(normalized.normalized)) {
    return { ok: false, error: "کد ملی واردشده معتبر نیست." };
  }

  return { ok: true, normalized: normalized.normalized };
}
