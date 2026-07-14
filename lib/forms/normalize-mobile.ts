/**
 * Conservative Iranian mobile normalizer for FormSubmission.normalizedMobile.
 */

import { toLatinDigits } from "@/lib/forms/latin-digits";

export type NormalizeMobileResult =
  | { ok: true; normalized: string; raw: string }
  | { ok: false; error: string };

const MOBILE_PATTERN = /^09\d{9}$/;

/**
 * Normalize → validate Iranian mobile.
 * Accepts Persian/Arabic digits, spaces, hyphens, parentheses, +98 / 0098 / 98 / 9xxxxxxxx.
 * Does not hard-code operator prefixes (future numbers stay valid).
 */
export function normalizeIranianMobile(rawInput: string): NormalizeMobileResult {
  const raw = rawInput.trim();
  if (!raw) {
    return { ok: false, error: "شماره موبایل واردشده معتبر نیست." };
  }

  let cleaned = toLatinDigits(raw)
    .replace(/[\s\-()]/g, "")
    .replace(/[^\d+]/g, "");

  if (cleaned.startsWith("+")) {
    cleaned = cleaned.slice(1);
  }

  if (cleaned.startsWith("0098")) {
    cleaned = `0${cleaned.slice(4)}`;
  } else if (cleaned.startsWith("98") && cleaned.length >= 12) {
    cleaned = `0${cleaned.slice(2)}`;
  } else if (cleaned.startsWith("9") && cleaned.length === 10) {
    cleaned = `0${cleaned}`;
  }

  if (!/^\d+$/.test(cleaned)) {
    return { ok: false, error: "شماره موبایل واردشده معتبر نیست." };
  }

  if (cleaned.length !== 11) {
    return { ok: false, error: "شماره موبایل باید ۱۱ رقم باشد." };
  }

  if (!cleaned.startsWith("09")) {
    return { ok: false, error: "شماره موبایل باید با ۰۹ شروع شود." };
  }

  if (!MOBILE_PATTERN.test(cleaned)) {
    return { ok: false, error: "شماره موبایل واردشده معتبر نیست." };
  }

  return { ok: true, normalized: cleaned, raw };
}
