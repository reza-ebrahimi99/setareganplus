/**
 * Counselor appointment listings and detail.
 */

import { BookingStatus, CounselorAppointmentStatus } from "@/generated/prisma/enums";
import type { CounselorContext } from "@/lib/counselor-os/auth";
import { labelCounselorAppointmentStatus } from "@/lib/counselor-os/appointment-lifecycle";
import { labelMeetingType, PERSIAN_WEEKDAYS } from "@/lib/counselor-os/labels";
import { labelAppointmentPurpose } from "@/lib/guidance/journey-v2/labels";
import { prisma } from "@/lib/prisma";
import { formatJalaliDateTimeShort, utcToJalaliInTehran } from "@/lib/datetime/jalali";
import { formatTehranTime24, getPersianWeekdayIndex, tehranDayBoundsUtc } from "@/lib/datetime/tehran-zone";
import { toPersianDigits } from "@/lib/persian";

export type CounselorAppointmentView = {
  id: string;
  studentId: string;
  studentName: string;
  studentPhotoUrl: string | null;
  gradeLevel: string | null;
  examGroup: string | null;
  studentMobile: string | null;
  whenLabel: string;
  timeRangeLabel: string;
  dateKey: string;
  weekdayLabel: string;
  status: string;
  statusLabel: string;
  meetingType: string;
  meetingTypeLabel: string;
  purposeLabel: string;
  counselorName: string;
  counselorUserId: string;
  requestedAtLabel: string;
  reservationNotes: string | null;
  trackingCode: string;
  hasSessionRecord: boolean;
  sessionRecordId: string | null;
  needsConfirmation: boolean;
  startsAtIso: string;
};

function counselorScope(ctx: CounselorContext) {
  return ctx.canReview || ctx.isSupervisor
    ? {}
    : { counselorUserId: ctx.userId };
}

const appointmentInclude = {
  student: {
    select: {
      id: true,
      fullName: true,
      gradeLevel: true,
      mobile: true,
      user: { select: { mobile: true } },
      guidancePlans: {
        where: { deletedAt: null, journeyVersion: 2 },
        orderBy: { updatedAt: "desc" as const },
        take: 1,
        select: { examGroup: true },
      },
    },
  },
  counselor: { select: { firstName: true, lastName: true } },
  bookingReservation: {
    include: { slot: { include: { advisor: true } } },
  },
} as const;

type AppointmentRow = {
  id: string;
  counselorUserId: string;
  bookingReservationId: string;
  status: string;
  purpose: string | null;
  createdAt: Date;
  student: {
    id: string;
    fullName: string;
    gradeLevel: string | null;
    mobile: string | null;
    user: { mobile: string | null } | null;
    guidancePlans: { examGroup: string }[];
  };
  counselor: { firstName: string; lastName: string };
  bookingReservation: {
    status: string;
    meetingType: string;
    notes: string | null;
    trackingCode: string;
    slot: { startsAt: Date; endsAt: Date; advisor: { displayName: string } };
  };
};

function mapRow(
  r: AppointmentRow,
  sessionByReservation: Map<string, string>,
): CounselorAppointmentView {
  const startsAt = r.bookingReservation.slot.startsAt;
  const endsAt = r.bookingReservation.slot.endsAt;
  const j = utcToJalaliInTehran(startsAt);
  const sessionRecordId = sessionByReservation.get(r.bookingReservationId) ?? null;
  const counselorName =
    `${r.counselor.firstName} ${r.counselor.lastName}`.trim();
  return {
    id: r.id,
    studentId: r.student.id,
    studentName: r.student.fullName,
    studentPhotoUrl: null,
    gradeLevel: r.student.gradeLevel,
    examGroup: r.student.guidancePlans[0]?.examGroup ?? null,
    studentMobile: r.student.mobile ?? r.student.user?.mobile ?? null,
    whenLabel: formatJalaliDateTimeShort(startsAt),
    timeRangeLabel: `${toPersianDigits(formatTehranTime24(startsAt))}–${toPersianDigits(formatTehranTime24(endsAt))}`,
    dateKey: `${j.jy}-${j.jm}-${j.jd}`,
    weekdayLabel: PERSIAN_WEEKDAYS[getPersianWeekdayIndex(startsAt)] ?? "",
    status: r.status,
    statusLabel: labelCounselorAppointmentStatus(
      r.status,
      r.bookingReservation.status,
    ),
    meetingType: r.bookingReservation.meetingType,
    meetingTypeLabel: labelMeetingType(r.bookingReservation.meetingType),
    purposeLabel: labelAppointmentPurpose(r.purpose),
    counselorName,
    counselorUserId: r.counselorUserId,
    requestedAtLabel: formatJalaliDateTimeShort(r.createdAt),
    reservationNotes: r.bookingReservation.notes,
    trackingCode: r.bookingReservation.trackingCode,
    hasSessionRecord: Boolean(sessionRecordId),
    sessionRecordId,
    needsConfirmation:
      r.status === CounselorAppointmentStatus.BOOKED &&
      r.bookingReservation.status === BookingStatus.PENDING,
    startsAtIso: startsAt.toISOString(),
  };
}

async function attachSessions(
  organizationId: string,
  rows: { bookingReservationId: string }[],
) {
  const reservationIds = rows.map((r) => r.bookingReservationId);
  const sessions =
    reservationIds.length > 0
      ? await prisma.counselingSessionRecord.findMany({
          where: {
            organizationId,
            bookingReservationId: { in: reservationIds },
          },
          select: { id: true, bookingReservationId: true },
        })
      : [];
  const map = new Map<string, string>();
  for (const s of sessions) {
    if (s.bookingReservationId) {
      map.set(s.bookingReservationId, s.id);
    }
  }
  return map;
}

export async function listCounselorAppointments(
  ctx: CounselorContext,
  filter: "upcoming" | "past" | "today" | "all" | "pending" = "upcoming",
): Promise<CounselorAppointmentView[]> {
  const now = new Date();
  const jalali = utcToJalaliInTehran(now);
  const { startUtc, endUtc } = tehranDayBoundsUtc(jalali.jy, jalali.jm, jalali.jd);

  if (filter === "pending") {
    const rows = await prisma.counselorAppointment.findMany({
      where: {
        organizationId: ctx.organizationId,
        ...counselorScope(ctx),
        status: CounselorAppointmentStatus.BOOKED,
        bookingReservation: {
          status: BookingStatus.PENDING,
          slot: { startsAt: { gte: now } },
        },
      },
      include: appointmentInclude,
      orderBy: { createdAt: "asc" },
      take: 50,
    });
    const sessionByReservation = await attachSessions(ctx.organizationId, rows);
    return rows.map((r) => mapRow(r, sessionByReservation));
  }

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
      ...counselorScope(ctx),
      ...(filter === "upcoming" || filter === "today"
        ? {
            status: {
              in: [
                CounselorAppointmentStatus.BOOKED,
                CounselorAppointmentStatus.CONFIRMED,
              ],
            },
            bookingReservation: {
              status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
              ...(slotFilter ? { slot: slotFilter } : {}),
            },
          }
        : {
            bookingReservation: slotFilter ? { slot: slotFilter } : undefined,
          }),
    },
    include: appointmentInclude,
    orderBy: {
      bookingReservation: {
        slot: { startsAt: filter === "past" ? "desc" : "asc" },
      },
    },
    take: 80,
  });

  const sessionByReservation = await attachSessions(ctx.organizationId, rows);
  return rows.map((r) => mapRow(r, sessionByReservation));
}

export type CounselorAppointmentDetail = CounselorAppointmentView & {
  endsAtIso: string;
  purpose: string | null;
};

export async function loadCounselorAppointmentDetail(
  ctx: CounselorContext,
  appointmentId: string,
): Promise<CounselorAppointmentDetail | null> {
  const row = await prisma.counselorAppointment.findFirst({
    where: {
      id: appointmentId,
      organizationId: ctx.organizationId,
      ...counselorScope(ctx),
    },
    include: appointmentInclude,
  });
  if (!row) return null;

  const sessionByReservation = await attachSessions(ctx.organizationId, [row]);
  const base = mapRow(row, sessionByReservation);
  return {
    ...base,
    endsAtIso: row.bookingReservation.slot.endsAt.toISOString(),
    purpose: row.purpose,
  };
}
