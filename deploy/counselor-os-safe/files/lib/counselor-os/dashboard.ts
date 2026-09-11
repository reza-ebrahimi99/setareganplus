/**
 * Counselor OS — dashboard aggregates from real data.
 */

import {
  BookingStatus,
  CounselorFollowUpStatus,
} from "@/generated/prisma/enums";
import type { CounselorContext } from "@/lib/counselor-os/auth";
import { resolveAccessibleStudentFilter } from "@/lib/counselor-os/auth";
import { listCounselorStudents } from "@/lib/counselor-os/students";
import { prisma } from "@/lib/prisma";
import { formatJalaliDateTimeShort, utcToJalaliInTehran } from "@/lib/datetime/jalali";
import { tehranDayBoundsUtc } from "@/lib/datetime/tehran-zone";

export type CounselorDashboardModel = {
  greetingName: string;
  stats: {
    assignedStudents: number;
    todaySessions: number;
    upcomingBookings: number;
    overdueFollowUps: number;
    incompleteJourneys: number;
  };
  nextSession: {
    studentName: string;
    studentId: string;
    whenLabel: string;
    sessionType: string;
    appointmentId: string;
  } | null;
  todayTimeline: Array<{
    id: string;
    studentName: string;
    studentId: string;
    whenLabel: string;
    status: string;
  }>;
  dueFollowUps: Array<{
    id: string;
    title: string;
    studentName: string;
    studentId: string;
    dueLabel: string;
    priority: string;
  }>;
  activeStudents: Array<{
    studentId: string;
    studentName: string;
    currentStepTitle: string | null;
    completionPercentage: number | null;
  }>;
};

function firstName(full: string): string {
  const part = full.trim().split(/\s+/)[0];
  return part || full;
}

export async function loadCounselorDashboard(
  ctx: CounselorContext,
): Promise<CounselorDashboardModel> {
  const jalali = utcToJalaliInTehran(new Date());
  const { startUtc, endUtc } = tehranDayBoundsUtc(jalali.jy, jalali.jm, jalali.jd);
  const start = startUtc;
  const end = endUtc;
  const filter = await resolveAccessibleStudentFilter({
    organizationId: ctx.organizationId,
    counselorUserId: ctx.userId,
    canReview: ctx.canReview,
  });

  const studentFilter =
    filter === "all-guidance"
      ? {}
      : { studentId: { in: filter.studentId?.in ?? [] } };

  const [students, todayAppts, upcomingCount, overdueFollowUps, incompletePlans] =
    await Promise.all([
      listCounselorStudents(ctx),
      prisma.counselorAppointment.findMany({
        where: {
          organizationId: ctx.organizationId,
          counselorUserId: ctx.userId,
          ...studentFilter,
          bookingReservation: {
            slot: { startsAt: { gte: start, lt: end } },
            status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
          },
        },
        include: {
          student: { select: { fullName: true, id: true } },
          bookingReservation: {
            include: { slot: true },
          },
        },
        orderBy: { bookingReservation: { slot: { startsAt: "asc" } } },
      }),
      prisma.counselorAppointment.count({
        where: {
          organizationId: ctx.organizationId,
          counselorUserId: ctx.userId,
          status: { in: ["BOOKED", "CONFIRMED"] },
          bookingReservation: {
            slot: { startsAt: { gte: new Date() } },
            status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
          },
          ...studentFilter,
        },
      }),
      prisma.counselorFollowUp.count({
        where: {
          organizationId: ctx.organizationId,
          counselorUserId: ctx.userId,
          status: CounselorFollowUpStatus.PENDING,
          dueAt: { lt: new Date() },
          ...studentFilter,
        },
      }),
      filter === "all-guidance"
        ? prisma.guidancePlan.count({
            where: {
              organizationId: ctx.organizationId,
              deletedAt: null,
              completionPercentage: { lt: 100 },
            },
          })
        : prisma.guidancePlan.count({
            where: {
              organizationId: ctx.organizationId,
              deletedAt: null,
              completionPercentage: { lt: 100 },
              studentId: { in: filter.studentId?.in ?? [] },
            },
          }),
    ]);

  const nextAppt = await prisma.counselorAppointment.findFirst({
    where: {
      organizationId: ctx.organizationId,
      counselorUserId: ctx.userId,
      status: { in: ["BOOKED", "CONFIRMED"] },
      bookingReservation: {
        slot: { startsAt: { gte: new Date() } },
        status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
      },
      ...studentFilter,
    },
    include: {
      student: { select: { fullName: true, id: true } },
      bookingReservation: { include: { slot: true } },
    },
    orderBy: { bookingReservation: { slot: { startsAt: "asc" } } },
  });

  const dueFollowUps = await prisma.counselorFollowUp.findMany({
    where: {
      organizationId: ctx.organizationId,
      counselorUserId: ctx.userId,
      status: CounselorFollowUpStatus.PENDING,
      dueAt: { lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
      ...studentFilter,
    },
    include: { student: { select: { fullName: true, id: true } } },
    orderBy: { dueAt: "asc" },
    take: 8,
  });

  return {
    greetingName: firstName(ctx.displayName),
    stats: {
      assignedStudents: students.length,
      todaySessions: todayAppts.length,
      upcomingBookings: upcomingCount,
      overdueFollowUps,
      incompleteJourneys: incompletePlans,
    },
    nextSession: nextAppt
      ? {
          studentName: nextAppt.student.fullName,
          studentId: nextAppt.student.id,
          whenLabel: formatJalaliDateTimeShort(
            nextAppt.bookingReservation.slot.startsAt,
          ),
          sessionType: nextAppt.bookingReservation.meetingType,
          appointmentId: nextAppt.id,
        }
      : null,
    todayTimeline: todayAppts.map((a) => ({
      id: a.id,
      studentName: a.student.fullName,
      studentId: a.student.id,
      whenLabel: formatJalaliDateTimeShort(a.bookingReservation.slot.startsAt),
      status: a.status,
    })),
    dueFollowUps: dueFollowUps.map((f) => ({
      id: f.id,
      title: f.title,
      studentName: f.student.fullName,
      studentId: f.student.id,
      dueLabel: formatJalaliDateTimeShort(f.dueAt),
      priority: f.priority,
    })),
    activeStudents: students.slice(0, 6).map((s) => ({
      studentId: s.studentId,
      studentName: s.studentName,
      currentStepTitle: s.currentStepTitle,
      completionPercentage: s.completionPercentage,
    })),
  };
}
