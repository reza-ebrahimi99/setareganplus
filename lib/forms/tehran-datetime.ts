/**
 * Asia/Tehran wall-clock helpers for admin datetime-local inputs.
 * Iran uses a fixed UTC+03:30 offset (DST abolished).
 */

const TEHRAN_OFFSET_MS = (3 * 60 + 30) * 60 * 1000;

export function formatDateTimeLocalInTehran(date: Date): string {
  const shifted = new Date(date.getTime() + TEHRAN_OFFSET_MS);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const day = String(shifted.getUTCDate()).padStart(2, "0");
  const hour = String(shifted.getUTCHours()).padStart(2, "0");
  const minute = String(shifted.getUTCMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}`;
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

  const utcMs =
    Date.UTC(year, month - 1, day, hour, minute, 0, 0) - TEHRAN_OFFSET_MS;
  const date = new Date(utcMs);

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
