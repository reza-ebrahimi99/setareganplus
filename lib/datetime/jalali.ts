/**
 * Jalali (Persian) calendar helpers for display/input only.
 * Authoritative timestamps remain UTC Gregorian instants.
 */

import * as jalaali from "jalaali-js";
import { toPersianDigits } from "@/lib/persian";
import {
  formatTehranTime24,
  getPersianWeekdayIndex,
  getTehranParts,
  tehranLocalToUtc,
} from "@/lib/datetime/tehran-zone";

export const PERSIAN_WEEKDAYS = [
  "شنبه",
  "یکشنبه",
  "دوشنبه",
  "سه‌شنبه",
  "چهارشنبه",
  "پنجشنبه",
  "جمعه",
] as const;

export const PERSIAN_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
] as const;

export type JalaliDate = {
  jy: number;
  jm: number;
  jd: number;
};

export function gregorianToJalali(gy: number, gm: number, gd: number): JalaliDate {
  return jalaali.toJalaali(gy, gm, gd);
}

export function jalaliToGregorian(jy: number, jm: number, jd: number): {
  gy: number;
  gm: number;
  gd: number;
} {
  return jalaali.toGregorian(jy, jm, jd);
}

export function isLeapJalaliYear(jy: number): boolean {
  return jalaali.isLeapJalaaliYear(jy);
}

export function jalaliMonthLength(jy: number, jm: number): number {
  return jalaali.jalaaliMonthLength(jy, jm);
}

export function utcToJalaliInTehran(date: Date): JalaliDate {
  const parts = getTehranParts(date);
  return gregorianToJalali(parts.year, parts.month, parts.day);
}

export function jalaliTehranLocalToUtc(
  jy: number,
  jm: number,
  jd: number,
  hour: number,
  minute: number,
  second = 0,
): Date {
  const { gy, gm, gd } = jalaliToGregorian(jy, jm, jd);
  return tehranLocalToUtc(gy, gm, gd, hour, minute, second);
}

export function formatJalaliDate(jy: number, jm: number, jd: number): string {
  const raw = `${String(jy).padStart(4, "0")}/${String(jm).padStart(2, "0")}/${String(jd).padStart(2, "0")}`;
  return toPersianDigits(raw);
}

export function formatJalaliDateLong(date: Date): string {
  const j = utcToJalaliInTehran(date);
  const weekday = PERSIAN_WEEKDAYS[getPersianWeekdayIndex(date)];
  const month = PERSIAN_MONTHS[j.jm - 1];
  return toPersianDigits(`${weekday} ${j.jd} ${month} ${j.jy}`);
}

export function formatJalaliDateShort(date: Date): string {
  const j = utcToJalaliInTehran(date);
  return formatJalaliDate(j.jy, j.jm, j.jd);
}

export function formatPersianTimeRange(startsAt: Date, endsAt: Date): string {
  const start = toPersianDigits(formatTehranTime24(startsAt));
  const end = toPersianDigits(formatTehranTime24(endsAt));
  return `ساعت ${start} تا ${end}`;
}

export function formatJalaliDateTimeLabel(startsAt: Date, endsAt: Date): string {
  return `${formatJalaliDateLong(startsAt)} · ${formatPersianTimeRange(startsAt, endsAt)}`;
}

/**
 * Parse user-facing Jalali `YYYY/MM/DD` (Latin or Persian digits) → Jalali parts.
 */
export function parseJalaliDateInput(raw: string): JalaliDate | null {
  const latin = raw
    .trim()
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
  const match = /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/.exec(latin);
  if (!match) {
    return null;
  }
  const jy = Number(match[1]);
  const jm = Number(match[2]);
  const jd = Number(match[3]);
  if (jm < 1 || jm > 12 || jd < 1 || jd > jalaliMonthLength(jy, jm)) {
    return null;
  }
  if (
    typeof jalaali.isValidJalaaliDate === "function" &&
    !jalaali.isValidJalaaliDate(jy, jm, jd)
  ) {
    return null;
  }
  return { jy, jm, jd };
}

export function todayJalaliInTehran(now = new Date()): JalaliDate {
  return utcToJalaliInTehran(now);
}
