/**
 * Pure in-memory statistics for the reservation export — computed once from
 * the single query result in reservation-export-query.ts. No extra queries.
 *
 * Status labels here intentionally mirror (but do not import from) the
 * inline maps already in calendar/page.tsx and reservations/[id]/page.tsx —
 * those two pages are explicitly out of scope for this change.
 */

import { BookingStatus } from "@/generated/prisma/enums";
import type { BookingExportRow } from "@/lib/booking/reservation-export-query";
import { formatJalaliDateShort } from "@/lib/datetime/jalali";
import { formatTehranTime24 } from "@/lib/datetime/tehran-zone";
import { toPersianDigits } from "@/lib/persian";

export const BOOKING_EXPORT_STATUS_LABELS: Record<BookingStatus, string> = {
  PENDING: "در انتظار",
  CONFIRMED: "تایید شده",
  WAITING_LIST: "لیست انتظار",
  CANCELLED: "لغو شده",
  RESCHEDULED: "جابجا شده",
  COMPLETED: "تکمیل شده",
  NO_SHOW: "عدم حضور",
};

export type BookingExportCountRow = { label: string; count: number };

export type BookingExportSummary = {
  total: number;
  confirmed: number;
  pending: number;
  cancelled: number;
  completed: number;
  noShow: number;
  byDay: BookingExportCountRow[];
  byHour: BookingExportCountRow[];
  byService: BookingExportCountRow[];
  byStatus: BookingExportCountRow[];
};

function countBy<T>(rows: readonly T[], keyOf: (row: T) => string): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    const key = keyOf(row);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

function toSortedCountRows(
  map: Map<string, number>,
  sort: "label" | "count" = "label",
): BookingExportCountRow[] {
  const rows = [...map.entries()].map(([label, count]) => ({ label, count }));
  if (sort === "count") {
    return rows.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }
  return rows.sort((a, b) => a.label.localeCompare(b.label));
}

export function buildBookingExportSummary(
  rows: readonly BookingExportRow[],
): BookingExportSummary {
  const byDayMap = countBy(rows, (row) => formatJalaliDateShort(row.startsAt));
  // Keyed by zero-padded numeric hour ("08") so sorting stays numeric —
  // Persian digits are only applied to the final display label.
  const byHourMap = countBy(rows, (row) => formatTehranTime24(row.startsAt).slice(0, 2));
  const byServiceMap = countBy(rows, (row) => row.serviceTitle);
  const byStatusMap = countBy(
    rows,
    (row) => BOOKING_EXPORT_STATUS_LABELS[row.status] ?? row.status,
  );

  const countStatus = (status: BookingStatus) =>
    rows.filter((row) => row.status === status).length;

  return {
    total: rows.length,
    confirmed: countStatus(BookingStatus.CONFIRMED),
    pending: countStatus(BookingStatus.PENDING),
    cancelled: countStatus(BookingStatus.CANCELLED),
    completed: countStatus(BookingStatus.COMPLETED),
    noShow: countStatus(BookingStatus.NO_SHOW),
    byDay: toSortedCountRows(byDayMap, "label"),
    byHour: [...byHourMap.entries()]
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([hour, count]) => ({ label: `${toPersianDigits(hour)}:۰۰`, count })),
    byService: toSortedCountRows(byServiceMap, "count"),
    byStatus: toSortedCountRows(byStatusMap, "count"),
  };
}
