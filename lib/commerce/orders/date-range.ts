/**
 * Tehran calendar range helpers for booklet ops filters and KPIs.
 */

import {
  getPersianWeekdayIndex,
  getTehranParts,
  tehranLocalToUtc,
} from "@/lib/datetime/tehran-zone";

export type CommerceDatePreset = "today" | "yesterday" | "thisWeek" | "thisMonth";

export function tehranCivilDayBounds(date = new Date()): { from: Date; to: Date } {
  const parts = getTehranParts(date);
  return {
    from: tehranLocalToUtc(parts.year, parts.month, parts.day, 0, 0, 0),
    to: tehranLocalToUtc(parts.year, parts.month, parts.day, 23, 59, 59),
  };
}

export function tehranPresetBounds(
  preset: CommerceDatePreset,
  now = new Date(),
): { from: Date; to: Date } {
  const today = tehranCivilDayBounds(now);

  if (preset === "today") return today;

  if (preset === "yesterday") {
    const yesterday = new Date(today.from.getTime() - 12 * 60 * 60 * 1000);
    return tehranCivilDayBounds(yesterday);
  }

  const parts = getTehranParts(now);

  if (preset === "thisWeek") {
    const weekday = getPersianWeekdayIndex(now);
    const weekStart = new Date(today.from.getTime() - weekday * 24 * 60 * 60 * 1000);
    const startParts = getTehranParts(weekStart);
    return {
      from: tehranLocalToUtc(startParts.year, startParts.month, startParts.day, 0, 0, 0),
      to: today.to,
    };
  }

  const lastDay = new Date(Date.UTC(parts.year, parts.month, 0)).getUTCDate();
  return {
    from: tehranLocalToUtc(parts.year, parts.month, 1, 0, 0, 0),
    to: tehranLocalToUtc(parts.year, parts.month, lastDay, 23, 59, 59),
  };
}

export function isCommerceDatePreset(
  value: string | null | undefined,
): value is CommerceDatePreset {
  return (
    value === "today" ||
    value === "yesterday" ||
    value === "thisWeek" ||
    value === "thisMonth"
  );
}
