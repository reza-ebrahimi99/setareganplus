/**
 * Asia/Tehran timezone helpers using Intl (respects Iran TZ rules; no fixed offset).
 * Store UTC in DB; convert at application boundaries only.
 */

export const TEHRAN_TIMEZONE = "Asia/Tehran" as const;

export type TehranDateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function readPart(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
): number {
  const value = parts.find((part) => part.type === type)?.value;
  return Number(value);
}

export function getTehranParts(date: Date): TehranDateTimeParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TEHRAN_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  let hour = readPart(parts, "hour");
  // Some engines emit 24:00 for midnight — normalize.
  if (hour === 24) {
    hour = 0;
  }

  return {
    year: readPart(parts, "year"),
    month: readPart(parts, "month"),
    day: readPart(parts, "day"),
    hour,
    minute: readPart(parts, "minute"),
    second: readPart(parts, "second"),
  };
}

/**
 * Convert a civil wall-clock in Asia/Tehran to a UTC Date.
 */
export function tehranLocalToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second = 0,
): Date {
  const desiredAsUtcMs = Date.UTC(year, month - 1, day, hour, minute, second);
  let guess = desiredAsUtcMs;

  for (let i = 0; i < 4; i += 1) {
    const parts = getTehranParts(new Date(guess));
    const actualAsUtcMs = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    );
    guess += desiredAsUtcMs - actualAsUtcMs;
  }

  return new Date(guess);
}

export function formatTehranTime24(date: Date): string {
  const { hour, minute } = getTehranParts(date);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/**
 * Gregorian weekday in Tehran (0=Sun … 6=Sat), then map to Persian Saturday-first
 * (0=شنبه … 6=جمعه).
 */
export function getPersianWeekdayIndex(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TEHRAN_TIMEZONE,
    weekday: "short",
  }).formatToParts(date);
  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "Sat";
  const map: Record<string, number> = {
    Sat: 0,
    Sun: 1,
    Mon: 2,
    Tue: 3,
    Wed: 4,
    Thu: 5,
    Fri: 6,
  };
  return map[weekday] ?? 0;
}

export function parseLocalTimeHm(value: string): { hour: number; minute: number } | null {
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  if (!match) {
    return null;
  }
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

export function tehranDayBoundsUtc(year: number, month: number, day: number): {
  startUtc: Date;
  endUtc: Date;
} {
  const startUtc = tehranLocalToUtc(year, month, day, 0, 0, 0);
  const endUtc = tehranLocalToUtc(year, month, day, 23, 59, 59);
  return { startUtc, endUtc };
}
