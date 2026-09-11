/**
 * Counselor appointment listings.
 */

import { BookingStatus } from "@/generated/prisma/enums";
import type { CounselorContext } from "@/lib/counselor-os/auth";
import { labelBookingStatus, labelMeetingType, PERSIAN_WEEKDAYS } from "@/lib/counselor-os/labels";
import { labelAppointmentPurpose } from "@/lib/guidance/journey-v2/labels";
import { prisma } from "@/lib/prisma";
import { formatJalaliDateTimeShort, utcToJalaliInTehran } from "@/lib/datetime/jalali";
import { getPersianWeekdayIndex, tehranDayBoundsUtc } from "@/lib/datetime/tehran-zone";

export type CounselorAppointmentView = {
  id: string;
  studentId: string;
  studentName: string;
  whenLabel: string;
  dateKey: string;
  weekdayLabel: string;
  status: string;
  statusLabel: string;
  meetingType: string;
  meetingTypeLabel: string;
  purposeLabel: string;
  hasSessionRecord: boolean;
  sessionRecordId: string | null;
};

export async function listCounselorAppointments(
  ctx: CounselorContext,
  filter: "upcoming" | "past" | "today" | "all" = "upcoming",
): Promise<CounselorAppointmentView[]> {
  const now = new Date();
  const jalali = utcToJalaliInTehran(now);
  const { startUtc, endUtc } = tehranDayBoundsUtc(jalali.jy, jalali.jm, jalali.jd);
  const slotFilter =
    filter === "today"
      ? { startsAt: { gte: startUtc, lt: endUtc } }
      : filter === "upcoming"
        ? { startsAt: { gte: now } }
        : filter === "past"
          ? { startsAt: { lt: now } }
          : undefined;

  const rows = await prisma.counselorAppointment.findMany({
    where: {
      organizationId: ctx.organizationId,
      counselorUserId: ctx.userId,
      ...(filter === "upcoming" || filter === "today"
        ? {
            status: { in: ["BOOKED", "CONFIRMED"] },
            bookingReservation: {
              status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
              ...(slotFilter ? { slot: slotFilter } : {}),
            },
          }
        : {
            bookingReservation: slotFilter ? { slot: slotFilter } : undefined,
          }),
    },
    include: {
      student: { select: { fullName: true, id: true } },
      bookingReservation: {
        include: { slot: true },
      },
    },
    orderBy: {
      bookingReservation: {
        slot: { startsAt: filter === "past" ? "desc" : "asc" },
      },
    },
    take: 80,
  });

  const reservationIds = rows.map((r) => r.bookingReservationId);
  const sessions =
    reservationIds.length > 0
      ? await prisma.counselingSessionRecord.findMany({
          where: {
            organizationId: ctx.organizationId,
            bookingReservationId: { in: reservationIds },
          },
          select: { id: true, bookingReservationId: true },
        })
      : [];
  const sessionByReservation = new Map(
    sessions.map((s) => [s.bookingReservationId, s.id]),
  );

  return rows.map((r) => {
    const startsAt = r.bookingReservation.slot.startsAt;
    const j = utcToJalaliInTehran(startsAt);
    const sessionRecordId = sessionByReservation.get(r.bookingReservationId) ?? null;
    return {
      id: r.id,
      studentId: r.student.id,
      studentName: r.student.fullName,
      whenLabel: formatJalaliDateTimeShort(startsAt),
      dateKey: `${j.jy}-${j.jm}-${j.jd}`,
      weekdayLabel: PERSIAN_WEEKDAYS[getPersianWeekdayIndex(startsAt)] ?? "",
      status: r.status,
      statusLabel: labelBookingStatus(r.status),
      meetingType: r.bookingReservation.meetingType,
      meetingTypeLabel: labelMeetingType(r.bookingReservation.meetingType),
      purposeLabel: labelAppointmentPurpose(r.purpose),
      hasSessionRecord: Boolean(sessionRecordId),
      sessionRecordId,
    };
  });
}
