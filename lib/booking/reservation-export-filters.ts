/**
 * Filters for the premium booking reservation Excel export.
 * Pure, I/O-free — parses GET params and resolves Tehran-timezone date
 * bounds. Built directly on the existing Tehran/Jalali primitives
 * (lib/datetime/tehran-zone.ts, lib/datetime/jalali.ts) — no new date math,
 * no coupling to the commerce-scoped date-range helper.
 */

import { BookingStatus } from "@/generated/prisma/enums";
import { jalaliTehranLocalToUtc, parseJalaliDateInput } from "@/lib/datetime/jalali";
import {
  getPersianWeekdayIndex,
  getTehranParts,
  tehranDayBoundsUtc,
  tehranLocalToUtc,
} from "@/lib/datetime/tehran-zone";

export const BOOKING_EXPORT_DATE_PRESETS = [
  "today",
  "tomorrow",
  "thisWeek",
  "thisMonth",
] as const;

export type BookingExportDatePreset = (typeof BOOKING_EXPORT_DATE_PRESETS)[number];

export function isBookingExportDatePreset(
  value: string | null | undefined,
): value is BookingExportDatePreset {
  return (BOOKING_EXPORT_DATE_PRESETS as readonly string[]).includes(
    value ?? "",
  );
}

export type BookingReservationExportFilters = {
  datePreset: BookingExportDatePreset | "";
  /** Raw Jalali YYYY/MM/DD input strings — used only when datePreset is empty. */
  dateFrom: string;
  dateTo: string;
  serviceId: string;
  status: BookingStatus | "";
  mobile: string;
  studentName: string;
};

function isBookingStatus(value: string): value is BookingStatus {
  return (Object.values(BookingStatus) as string[]).includes(value);
}

function first(value: string | string[] | null | undefined): string {
  if (Array.isArray(value)) return String(value[0] ?? "").trim();
  return String(value ?? "").trim();
}

export type BookingExportSearchParams = Record<
  string,
  string | string[] | undefined
>;

export function parseBookingReservationExportFilters(
  params: BookingExportSearchParams | URLSearchParams,
): BookingReservationExportFilters {
  const get = (key: string) =>
    params instanceof URLSearchParams
      ? first(params.get(key))
      : first(params[key]);

  const datePresetRaw = get("datePreset");
  const statusRaw = get("status");

  return {
    datePreset: isBookingExportDatePreset(datePresetRaw) ? datePresetRaw : "",
    dateFrom: get("dateFrom"),
    dateTo: get("dateTo"),
    serviceId: get("serviceId"),
    status: isBookingStatus(statusRaw) ? statusRaw : "",
    mobile: get("mobile"),
    studentName: get("studentName"),
  };
}

/** Tomorrow's Gregorian calendar day, computed from Tehran's current civil day. */
function tehranTomorrowParts(now: Date): { year: number; month: number; day: number } {
  const today = getTehranParts(now);
  // Pure calendar arithmetic (UTC-constructed Date normalizes month/year
  // rollovers correctly) — never re-interpreted through a timezone.
  const tomorrow = new Date(Date.UTC(today.year, today.month - 1, today.day + 1));
  return {
    year: tomorrow.getUTCFullYear(),
    month: tomorrow.getUTCMonth() + 1,
    day: tomorrow.getUTCDate(),
  };
}

/**
 * Resolves a filter set to a UTC date range, or `null` bounds when no date
 * filter is set (all-time). "This week" and "this month" are the FULL
 * calendar period (Saturday–Friday / day 1–last day) — bookings are
 * forward-looking appointments, unlike historical order exports.
 */
export function resolveBookingExportDateRange(
  filters: Pick<BookingReservationExportFilters, "datePreset" | "dateFrom" | "dateTo">,
  now: Date = new Date(),
): { from: Date | null; to: Date | null } {
  if (filters.datePreset === "today") {
    const today = getTehranParts(now);
    const { startUtc, endUtc } = tehranDayBoundsUtc(today.year, today.month, today.day);
    return { from: startUtc, to: endUtc };
  }

  if (filters.datePreset === "tomorrow") {
    const tomorrow = tehranTomorrowParts(now);
    const { startUtc, endUtc } = tehranDayBoundsUtc(
      tomorrow.year,
      tomorrow.month,
      tomorrow.day,
    );
    return { from: startUtc, to: endUtc };
  }

  if (filters.datePreset === "thisWeek") {
    const weekday = getPersianWeekdayIndex(now); // 0 = Saturday
    const today = getTehranParts(now);
    const weekStart = new Date(
      Date.UTC(today.year, today.month - 1, today.day - weekday),
    );
    const weekEnd = new Date(
      Date.UTC(today.year, today.month - 1, today.day - weekday + 6),
    );
    const start = tehranDayBoundsUtc(
      weekStart.getUTCFullYear(),
      weekStart.getUTCMonth() + 1,
      weekStart.getUTCDate(),
    );
    const end = tehranDayBoundsUtc(
      weekEnd.getUTCFullYear(),
      weekEnd.getUTCMonth() + 1,
      weekEnd.getUTCDate(),
    );
    return { from: start.startUtc, to: end.endUtc };
  }

  if (filters.datePreset === "thisMonth") {
    const today = getTehranParts(now);
    const lastDay = new Date(
      Date.UTC(today.year, today.month, 0),
    ).getUTCDate();
    return {
      from: tehranLocalToUtc(today.year, today.month, 1, 0, 0, 0),
      to: tehranLocalToUtc(today.year, today.month, lastDay, 23, 59, 59),
    };
  }

  // Custom range (Jalali inputs), either bound optional.
  const fromJalali = filters.dateFrom ? parseJalaliDateInput(filters.dateFrom) : null;
  const toJalali = filters.dateTo ? parseJalaliDateInput(filters.dateTo) : null;
  const from = fromJalali
    ? jalaliTehranLocalToUtc(fromJalali.jy, fromJalali.jm, fromJalali.jd, 0, 0, 0)
    : null;
  const to = toJalali
    ? jalaliTehranLocalToUtc(toJalali.jy, toJalali.jm, toJalali.jd, 23, 59, 59)
    : null;
  return { from, to };
}

const DATE_PRESET_LABELS: Record<BookingExportDatePreset, string> = {
  today: "امروز",
  tomorrow: "فردا",
  thisWeek: "این هفته",
  thisMonth: "این ماه",
};

const NO_FILTERS_LABEL = "بدون فیلتر (تمام رزروها)";

/**
 * Human-readable one-line summary of the active filter set — shown both on
 * the export page and printed on the Excel report so the report is
 * self-describing. Pure formatting only; `serviceTitle`/`statusLabel` are
 * resolved by the caller (already-loaded service list + the existing
 * BOOKING_EXPORT_STATUS_LABELS map in reservation-export-summary.ts) so this
 * module stays I/O-free and free of a circular import.
 */
export function describeBookingReservationExportFilters(
  filters: BookingReservationExportFilters,
  context?: { serviceTitle?: string | null; statusLabel?: string | null },
): string {
  const parts: string[] = [];

  if (filters.datePreset) {
    parts.push(`بازه: ${DATE_PRESET_LABELS[filters.datePreset]}`);
  } else if (filters.dateFrom || filters.dateTo) {
    if (filters.dateFrom && filters.dateTo) {
      parts.push(`بازه: از ${filters.dateFrom} تا ${filters.dateTo}`);
    } else if (filters.dateFrom) {
      parts.push(`بازه: از ${filters.dateFrom}`);
    } else {
      parts.push(`بازه: تا ${filters.dateTo}`);
    }
  }

  if (context?.serviceTitle) parts.push(`خدمت: ${context.serviceTitle}`);
  if (context?.statusLabel) parts.push(`وضعیت: ${context.statusLabel}`);
  if (filters.mobile) parts.push(`موبایل: ${filters.mobile}`);
  if (filters.studentName) parts.push(`نام: ${filters.studentName}`);

  return parts.length > 0 ? parts.join(" · ") : NO_FILTERS_LABEL;
}

export function bookingReservationExportQueryString(
  filters: BookingReservationExportFilters,
): string {
  const params = new URLSearchParams();
  if (filters.datePreset) params.set("datePreset", filters.datePreset);
  if (!filters.datePreset && filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (!filters.datePreset && filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.serviceId) params.set("serviceId", filters.serviceId);
  if (filters.status) params.set("status", filters.status);
  if (filters.mobile) params.set("mobile", filters.mobile);
  if (filters.studentName) params.set("studentName", filters.studentName);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}
