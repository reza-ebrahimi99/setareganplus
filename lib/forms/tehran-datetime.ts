/**
 * Asia/Tehran wall-clock helpers for admin datetime-local form values.
 * Uses Intl Asia/Tehran via tehran-zone (no fixed UTC+03:30 arithmetic).
 * Store UTC in DB; convert only at input/output boundaries.
 */

import {
  getTehranParts,
  tehranLocalToUtc,
} from "@/lib/datetime/tehran-zone";

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/** Format a UTC instant as `YYYY-MM-DDTHH:mm` in Asia/Tehran wall time. */
export function formatDateTimeLocalInTehran(date: Date): string {
  const parts = getTehranParts(date);
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}T${pad2(parts.hour)}:${pad2(parts.minute)}`;
}

/**
 * Parses `YYYY-MM-DDTHH:mm` as Asia/Tehran wall time → UTC Date.
 */
export function parseTehranDateTimeLocal(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(trimmed);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour > 23 ||
    minute > 59
  ) {
    return null;
  }

  const date = tehranLocalToUtc(year, month, day, hour, minute, 0);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  // Round-trip check to reject impossible calendar days (e.g. Feb 31).
  const roundTrip = formatDateTimeLocalInTehran(date);
  if (roundTrip !== trimmed) {
    return null;
  }

  return date;
}
