import { jalaaliMonthLength } from "jalaali-js";
import { fromJalali, toJalali } from "@/lib/jalali";

export const TEHRAN = "Asia/Tehran";
const WEEK_SHORT = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];

/** Tehran civil date `YYYY-MM-DD` (Gregorian). */
export function tehranDateKey(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TEHRAN, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** 0 = Saturday … 6 = Friday, as seen in Tehran. */
export function tehranWeekday(d: Date): number {
  const w = new Intl.DateTimeFormat("en-US", { timeZone: TEHRAN, weekday: "short" }).format(d);
  const i = WEEK_SHORT.indexOf(w);
  return i < 0 ? 0 : i;
}

export function tehranHm(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: TEHRAN, hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("hour")}:${get("minute")}`;
}

/** Noon in Tehran on a civil date, so weekday math never sits on a midnight boundary. */
export function tehranNoon(dateKey: string): Date {
  const [y, m, d] = dateKey.split("-").map((x) => Number.parseInt(x, 10));
  return new Date(Date.UTC(y, m - 1, d, 12, 0) - 3.5 * 3_600_000);
}

export function tehranDayStart(dateKey: string): Date {
  const [y, m, d] = dateKey.split("-").map((x) => Number.parseInt(x, 10));
  return new Date(Date.UTC(y, m - 1, d, 0, 0) - 3.5 * 3_600_000);
}

/** Minutes from Tehran midnight → absolute Date. */
export function tehranAt(dateKey: string, minutes: number): Date {
  return new Date(tehranDayStart(dateKey).getTime() + minutes * 60_000);
}

export function addTehranDays(dateKey: string, days: number): string {
  return tehranDateKey(new Date(tehranNoon(dateKey).getTime() + days * 86_400_000));
}

export function tehranDateKeys(from: Date, days: number): string[] {
  const start = tehranDateKey(from);
  const out: string[] = [];
  for (let i = 0; i < days; i++) out.push(addTehranDays(start, i));
  return out;
}

export function hmToMinutes(hm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

export function minutesToHm(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function monthLength(jy: number, jm: number): number {
  return jalaaliMonthLength(jy, jm);
}

export function jalaliToTehranKey(jy: number, jm: number, jd: number): string | null {
  if (!Number.isInteger(jy) || !Number.isInteger(jm) || !Number.isInteger(jd)) return null;
  if (jm < 1 || jm > 12 || jd < 1) return null;
  if (jd > monthLength(jy, jm)) return null;
  return tehranDateKey(fromJalali(jy, jm, jd, "12:00"));
}

export function tehranKeyToJalali(dateKey: string): { jy: number; jm: number; jd: number } {
  return toJalali(tehranNoon(dateKey));
}

export function clampSlotMinutes(n: number | null | undefined, fallback: number): number {
  const v = n == null ? fallback : n;
  if (!Number.isFinite(v)) return fallback;
  return Math.min(180, Math.max(10, Math.round(v)));
}

export function clampCapacity(n: number | null | undefined): number {
  if (n == null || !Number.isFinite(n)) return 1;
  return Math.min(20, Math.max(1, Math.round(n)));
}
