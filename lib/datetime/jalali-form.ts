/**
 * Form-oriented Jalali ↔ Tehran wall-time helpers.
 * Hidden inputs use Gregorian ASCII strings for server parsers.
 */

import {
  gregorianToJalali,
  jalaliMonthLength,
  jalaliTehranLocalToUtc,
  jalaliToGregorian,
  type JalaliDate,
  utcToJalaliInTehran,
} from "@/lib/datetime/jalali";
import { getTehranParts } from "@/lib/datetime/tehran-zone";
import { formatDateTimeLocalInTehran } from "@/lib/forms/tehran-datetime";

export type TehranJalaliParts = JalaliDate & {
  hour: number;
  minute: number;
};

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/** UTC instant → Jalali calendar date + Tehran wall clock. */
export function utcToTehranJalaliParts(date: Date): TehranJalaliParts {
  const tehran = getTehranParts(date);
  const jalali = gregorianToJalali(tehran.year, tehran.month, tehran.day);
  return {
    jy: jalali.jy,
    jm: jalali.jm,
    jd: jalali.jd,
    hour: tehran.hour,
    minute: tehran.minute,
  };
}

/** Jalali civil date + Tehran wall clock → UTC instant. */
export function tehranJalaliPartsToUtc(
  jy: number,
  jm: number,
  jd: number,
  hour: number,
  minute: number,
): Date {
  return jalaliTehranLocalToUtc(jy, jm, jd, hour, minute);
}

/**
 * Build `YYYY-MM-DDTHH:mm` Tehran wall time for parseTehranDateTimeLocal.
 */
export function tehranJalaliPartsToDateTimeLocal(
  jy: number,
  jm: number,
  jd: number,
  hour: number,
  minute: number,
): string {
  const { gy, gm, gd } = jalaliToGregorian(jy, jm, jd);
  return `${gy}-${pad2(gm)}-${pad2(gd)}T${pad2(hour)}:${pad2(minute)}`;
}

/** Parse Tehran `YYYY-MM-DDTHH:mm` or a Date into Jalali+time parts. */
export function resolveTehranJalaliParts(params: {
  defaultValueIso?: string | null;
  defaultDate?: Date | null;
}): TehranJalaliParts | null {
  const iso = params.defaultValueIso?.trim();
  if (iso) {
    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(iso);
    if (match) {
      const gy = Number(match[1]);
      const gm = Number(match[2]);
      const gd = Number(match[3]);
      const hour = Number(match[4]);
      const minute = Number(match[5]);
      const jalali = gregorianToJalali(gy, gm, gd);
      if (
        jalali.jd >= 1 &&
        jalali.jd <= jalaliMonthLength(jalali.jy, jalali.jm) &&
        hour >= 0 &&
        hour <= 23 &&
        minute >= 0 &&
        minute <= 59
      ) {
        return {
          jy: jalali.jy,
          jm: jalali.jm,
          jd: jalali.jd,
          hour,
          minute,
        };
      }
    }
    const asDate = new Date(iso);
    if (!Number.isNaN(asDate.getTime())) {
      return utcToTehranJalaliParts(asDate);
    }
  }

  if (params.defaultDate && !Number.isNaN(params.defaultDate.getTime())) {
    return utcToTehranJalaliParts(params.defaultDate);
  }

  return null;
}

/** Round-trip check helper used by tests / debugging. */
export function utcToTehranDateTimeLocal(date: Date): string {
  return formatDateTimeLocalInTehran(date);
}

/**
 * Parse Gregorian date-only `YYYY-MM-DD` (ASCII) → Jalali parts.
 * Uses the calendar date as civil Gregorian (no TZ shift).
 */
export function gregorianDateOnlyToJalaliParts(
  yyyyMmDd: string,
): JalaliDate | null {
  const trimmed = yyyyMmDd.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) {
    return null;
  }
  const gy = Number(match[1]);
  const gm = Number(match[2]);
  const gd = Number(match[3]);
  if (gm < 1 || gm > 12 || gd < 1 || gd > 31) {
    return null;
  }
  // Noon UTC avoids edge DST/timezone display issues when inspecting Date.
  const probe = new Date(Date.UTC(gy, gm - 1, gd, 12, 0, 0));
  if (Number.isNaN(probe.getTime())) {
    return null;
  }
  if (
    probe.getUTCFullYear() !== gy ||
    probe.getUTCMonth() + 1 !== gm ||
    probe.getUTCDate() !== gd
  ) {
    return null;
  }
  return gregorianToJalali(gy, gm, gd);
}

/** Jalali civil date → Gregorian date-only `YYYY-MM-DD` (ASCII). */
export function jalaliPartsToGregorianDateOnly(
  jy: number,
  jm: number,
  jd: number,
): string {
  const { gy, gm, gd } = jalaliToGregorian(jy, jm, jd);
  return `${gy}-${pad2(gm)}-${pad2(gd)}`;
}

/** Convenience: UTC instant → Jalali date only (Tehran calendar day). */
export function utcToJalaliDateParts(date: Date): JalaliDate {
  return utcToJalaliInTehran(date);
}
