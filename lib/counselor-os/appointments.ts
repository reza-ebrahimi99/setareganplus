/**
 * Counselor appointment listings.
 */

import { BookingStatus } from "@/generated/prisma/enums";
import type { CounselorContext } from "@/lib/counselor-os/auth";
import { prisma } from "@/lib/prisma";
import { formatJalaliDateTimeShort } from "@/lib/datetime/jalali";

export type CounselorAppointmentView = {
  id: string;
  studentId: string;
  studentName: string;
  whenLabel: string;
  status: string;
  meetingType: string;
  hasSessionRecord: boolean;
  sessionRecordId: string | null;
};

export async function listCounselorAppointments(
  ctx: CounselorContext,
  filter: "upcoming" | "past" | "all" = "upcoming",
): Promise<CounselorAppointmentView[]> {
  const now = new Date();
  const slotFilter =
    filter === "upcoming"
      ? { startsAt: { gte: now } }
      : filter === "past"
        ? { startsAt: { lt: now } }
        : undefined;

  const rows = await prisma.counselorAppointment.findMany({
    where: {
      organizationId: ctx.organizationId,
      counselorUserId: ctx.userId,
      ...(filter === "upcoming"
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
    take: 50,
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
    const sessionRecordId = sessionByReservation.get(r.bookingReservationId) ?? null;
    return {
      id: r.id,
      studentId: r.student.id,
      studentName: r.student.fullName,
      whenLabel: formatJalaliDateTimeShort(r.bookingReservation.slot.startsAt),
      status: r.status,
      meetingType: r.bookingReservation.meetingType,
      hasSessionRecord: Boolean(sessionRecordId),
      sessionRecordId,
    };
  });
}
