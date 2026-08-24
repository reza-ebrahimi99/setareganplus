/**
 * Single optimized query backing the premium reservation Excel export.
 * select-only (no include), organization + branch (RBAC) scoped, capped.
 * Row list also feeds the in-memory summary/breakdown computations — no
 * extra round trips.
 */

import { BookingStatus } from "@/generated/prisma/enums";
import { resolveBookingExportDateRange } from "@/lib/booking/reservation-export-filters";
import type { BookingReservationExportFilters } from "@/lib/booking/reservation-export-filters";
import { prisma } from "@/lib/prisma";

/** Hard cap — mirrors the existing commerce export's row cap. */
export const BOOKING_EXPORT_MAX_ROWS = 10_000;

export type BookingExportRow = {
  id: string;
  status: BookingStatus;
  studentName: string;
  mobile: string;
  serviceTitle: string;
  startsAt: Date;
  trackingCode: string;
  createdAt: Date;
  notes: string | null;
};

export async function loadBookingReservationsForExport(params: {
  organizationId: string;
  allowedBranchIds?: readonly string[] | null;
  filters: BookingReservationExportFilters;
  take?: number;
}): Promise<BookingExportRow[]> {
  const range = resolveBookingExportDateRange(params.filters);
  const mobile = params.filters.mobile.trim();
  const studentName = params.filters.studentName.trim();

  const rows = await prisma.bookingReservation.findMany({
    where: {
      organizationId: params.organizationId,
      deletedAt: null,
      ...(params.filters.status ? { status: params.filters.status } : {}),
      ...(mobile ? { normalizedMobile: { contains: mobile } } : {}),
      ...(studentName
        ? {
            OR: [
              { firstName: { contains: studentName, mode: "insensitive" } },
              { lastName: { contains: studentName, mode: "insensitive" } },
            ],
          }
        : {}),
      slot: {
        ...(params.allowedBranchIds != null
          ? { branchId: { in: [...params.allowedBranchIds] } }
          : {}),
        ...(params.filters.serviceId ? { serviceId: params.filters.serviceId } : {}),
        ...(range.from || range.to
          ? {
              startsAt: {
                ...(range.from ? { gte: range.from } : {}),
                ...(range.to ? { lte: range.to } : {}),
              },
            }
          : {}),
      },
    },
    orderBy: { slot: { startsAt: "asc" } },
    take: Math.min(Math.max(params.take ?? BOOKING_EXPORT_MAX_ROWS, 1), BOOKING_EXPORT_MAX_ROWS),
    select: {
      id: true,
      status: true,
      firstName: true,
      lastName: true,
      normalizedMobile: true,
      trackingCode: true,
      createdAt: true,
      notes: true,
      slot: {
        select: {
          startsAt: true,
          service: { select: { title: true } },
        },
      },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    studentName: `${row.firstName} ${row.lastName}`.trim(),
    mobile: row.normalizedMobile,
    serviceTitle: row.slot.service.title,
    startsAt: row.slot.startsAt,
    trackingCode: row.trackingCode,
    createdAt: row.createdAt,
    notes: row.notes,
  }));
}

/**
 * Resolves a single service's display title for the "current filters" line
 * printed on the export page and the Excel report. A single indexed by-id
 * lookup (not a list scan) — only runs when a serviceId filter is active, so
 * it never adds a round trip to the common (no service filter) case.
 */
export async function loadBookingServiceTitleForExport(params: {
  organizationId: string;
  serviceId: string;
}): Promise<string | null> {
  const service = await prisma.bookingService.findFirst({
    where: { id: params.serviceId, organizationId: params.organizationId },
    select: { title: true },
  });
  return service?.title ?? null;
}

/** Today's reservations only — for the quick "print day schedule" button. Independent of export filters. */
export async function loadTodayBookingReservations(params: {
  organizationId: string;
  allowedBranchIds?: readonly string[] | null;
  take?: number;
}): Promise<BookingExportRow[]> {
  return loadBookingReservationsForExport({
    organizationId: params.organizationId,
    allowedBranchIds: params.allowedBranchIds,
    filters: {
      datePreset: "today",
      dateFrom: "",
      dateTo: "",
      serviceId: "",
      status: "",
      mobile: "",
      studentName: "",
    },
    take: params.take ?? 300,
  });
}
