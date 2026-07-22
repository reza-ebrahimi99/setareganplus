/**
 * Kanoon (Qalamchi) external student counter / شناسه قلم‌چی.
 * Stored as digit string to preserve leading zeros.
 */

import { toLatinDigits } from "@/lib/forms/latin-digits";

export type NormalizeKanoonStudentIdResult =
  | { ok: true; value: string | null }
  | { ok: false; error: string };

const MAX_LENGTH = 32;

/**
 * Trim, convert Persian/Arabic digits, require digits-only when non-empty.
 * Empty → null. Leading zeros preserved.
 */
export function normalizeKanoonStudentId(
  rawInput: string,
): NormalizeKanoonStudentIdResult {
  const raw = rawInput.trim();
  if (!raw) return { ok: true, value: null };

  const cleaned = toLatinDigits(raw).replace(/[\s\u200c\u200f\-_.]/g, "");
  if (!cleaned) return { ok: true, value: null };

  if (!/^\d+$/.test(cleaned)) {
    return {
      ok: false,
      error: "شناسه قلم‌چی باید فقط شامل ارقام باشد.",
    };
  }

  if (cleaned.length > MAX_LENGTH) {
    return {
      ok: false,
      error: `شناسه قلم‌چی نباید بیشتر از ${MAX_LENGTH} رقم باشد.`,
    };
  }

  return { ok: true, value: cleaned };
}
