const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"] as const;

/**
 * Converts Western digits (0-9) to Persian (۰-۹).
 * Idempotent: existing Persian digits and non-numeric text are unchanged.
 */
export function toPersianDigits(value: string | number): string {
  return String(value).replace(/\d/g, (digit) => PERSIAN_DIGITS[Number(digit)]);
}

/** Western digits for parsing user-facing Persian numerals in forms. */
export function fromPersianDigits(value: string): string {
  return value.replace(/[۰-۹]/g, (ch) => {
    const index = "۰۱۲۳۴۵۶۷۸۹".indexOf(ch);
    return index >= 0 ? String(index) : ch;
  });
}
