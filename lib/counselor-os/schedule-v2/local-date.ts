import type { JalaliDate } from "@/lib/datetime/jalali";
import {
  gregorianDateOnlyToJalaliParts,
  jalaliPartsToGregorianDateOnly,
} from "@/lib/datetime/jalali-form";
import { PERSIAN_WEEKDAYS, todayJalaliInTehran } from "@/lib/datetime/jalali";
import { getPersianWeekdayIndex, tehranLocalToUtc } from "@/lib/datetime/tehran-zone";

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function utcDateToYmd(date: Date): string {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

export function ymdToUtcNoon(ymd: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

/** Gregorian YYYY-MM-DD (hidden field) → Date @db.Date storage. */
export function gregorianYmdToDbDate(ymd: string): Date | null {
  return ymdToUtcNoon(ymd.trim());
}

export function dbDateToGregorianYmd(date: Date): string {
  return utcDateToYmd(date);
}

export function dbDateToJalali(date: Date): JalaliDate | null {
  return gregorianDateOnlyToJalaliParts(dbDateToGregorianYmd(date));
}

export function jalaliToDbDate(jy: number, jm: number, jd: number): Date | null {
  const ymd = jalaliPartsToGregorianDateOnly(jy, jm, jd);
  return gregorianYmdToDbDate(ymd);
}

export function weekdayLabelForGregorianYmd(ymd: string): string {
  const db = gregorianYmdToDbDate(ymd);
  if (!db) return "";
  const [y, m, d] = ymd.split("-").map(Number);
  const noon = tehranLocalToUtc(y, m, d, 12, 0, 0);
  const idx = getPersianWeekdayIndex(noon);
  return PERSIAN_WEEKDAYS[idx] ?? "";
}

export function jalaliYmdString(j: JalaliDate): string {
  return `${j.jy}/${String(j.jm).padStart(2, "0")}/${String(j.jd).padStart(2, "0")}`;
}

export function isGregorianYmdBeforeTodayTehran(ymd: string): boolean {
  const j = gregorianDateOnlyToJalaliParts(ymd);
  if (!j) return true;
  const today = todayJalaliInTehran();
  if (j.jy !== today.jy) return j.jy < today.jy;
  if (j.jm !== today.jm) return j.jm < today.jm;
  return j.jd < today.jd;
}
