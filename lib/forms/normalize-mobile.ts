/**
 * Conservative Iranian mobile normalizer for FormSubmission.normalizedMobile.
 */

const PERSIAN_ARABIC_DIGITS: Record<string, string> = {
  "۰": "0",
  "۱": "1",
  "۲": "2",
  "۳": "3",
  "۴": "4",
  "۵": "5",
  "۶": "6",
  "۷": "7",
  "۸": "8",
  "۹": "9",
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
};

export type NormalizeMobileResult =
  | { ok: true; normalized: string; raw: string }
  | { ok: false; error: string };

export function normalizeIranianMobile(rawInput: string): NormalizeMobileResult {
  const raw = rawInput.trim();
  if (!raw) {
    return { ok: false, error: "شماره موبایل الزامی است." };
  }

  let digits = raw
    .split("")
    .map((char) => PERSIAN_ARABIC_DIGITS[char] ?? char)
    .join("")
    .replace(/[^\d+]/g, "");

  if (digits.startsWith("+98")) {
    digits = `0${digits.slice(3)}`;
  } else if (digits.startsWith("0098")) {
    digits = `0${digits.slice(4)}`;
  } else if (digits.startsWith("98") && digits.length === 12) {
    digits = `0${digits.slice(2)}`;
  }

  if (!/^09\d{9}$/.test(digits)) {
    return {
      ok: false,
      error: "شماره موبایل معتبر نیست (مثال: ۰۹۱۲۱۲۳۴۵۶۷).",
    };
  }

  return { ok: true, normalized: digits, raw };
}
