/**
 * Counselor appointment confirmation lifecycle.
 * BOOKED = منتظر تأیید مشاور · CONFIRMED = قفل برای دانش‌آموز
 */

import {
  BookingStatus,
  CounselorAppointmentStatus,
} from "@/generated/prisma/enums";
import { cancelReservation, updateReservationStatus } from "@/lib/booking/manage-reservation";
import {
  assertCounselorCanAccessStudent,
  type CounselorContext,
} from "@/lib/counselor-os/auth";
import { assertSlotBookableForCounselorSession } from "@/lib/counselor-os/schedule-v2/student-slot-access";
import { sessionKindFromPurpose } from "@/lib/counselor-os/schedule-v2/session-kind";
import type { AppointmentPurpose } from "@/lib/guidance/journey-v2/constants";
import { prisma } from "@/lib/prisma";

export const STUDENT_LOCKED_MESSAGE =
  "زمان جلسه توسط مشاور تأیید شده و قابل تغییر نیست. برای تغییر با آموزشگاه تماس بگیرید.";

export function needsCounselorConfirmation(
  appointmentStatus: string,
): boolean {
  return appointmentStatus === CounselorAppointmentStatus.BOOKED;
}

export function canStudentChangeAppointment(appointmentStatus: string): boolean {
  return appointmentStatus === CounselorAppointmentStatus.BOOKED;
}

export function labelCounselorAppointmentStatus(
  appointmentStatus: string,
  reservationStatus?: string | null,
): string {
  if (appointmentStatus === CounselorAppointmentStatus.BOOKED) {
    if (reservationStatus === BookingStatus.PENDING) {
      return "منتظر تأیید مشاور";
    }
    return "منتظر تأیید مشاور";
  }
  const map: Record<string, string> = {
    CONFIRMED: "تأیید شده",
    COMPLETED: "انجام شده",
    CANCELLED_BY_STUDENT: "لغو توسط دانش‌آموز",
    CANCELLED_BY_COUNSELOR: "رد / لغو توسط مشاور",
    NO_SHOW: "غیبت",
  };
  return map[appointmentStatus] ?? "نامشخص";
}

export async function countPendingCounselorConfirmations(params: {
  organizationId: string;
  counselorUserId: string;
  canReview?: boolean;
  isSupervisor?: boolean;
}): Promise<number> {
  return prisma.counselorAppointment.count({
    where: {
      organizationId: params.organizationId,
      ...(params.canReview || params.isSupervisor
        ? {}
        : { counselorUserId: params.counselorUserId }),
      status: CounselorAppointmentStatus.BOOKED,
      bookingReservation: {
        status: BookingStatus.PENDING,
        slot: { startsAt: { gte: new Date() } },
      },
    },
  });
}

async function loadAppointmentForCounselorAction(params: {
  ctx: CounselorContext;
  appointmentId: string;
}) {
  const row = await prisma.counselorAppointment.findFirst({
    where: {
      id: params.appointmentId,
      organizationId: params.ctx.organizationId,
    },
    include: {
      bookingReservation: { include: { slot: { include: { advisor: true } } } },
      student: { select: { id: true } },
    },
  });
  if (!row) {
    throw new Error("درخواست جلسه یافت نشد.");
  }

  if (
    row.counselorUserId !== params.ctx.userId &&
    !params.ctx.canReview
  ) {
    throw new Error("فقط مشاور مسئول یا مدیر می‌تواند این عملیات را انجام دهد.");
  }

  await assertCounselorCanAccessStudent({
    organizationId: params.ctx.organizationId,
    counselorUserId: params.ctx.userId,
    studentId: row.studentId,
    canReview: params.ctx.canReview,
    isSupervisor: params.ctx.isSupervisor,
  });

  return row;
}

export async function confirmCounselorAppointment(params: {
  ctx: CounselorContext;
  appointmentId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const appt = await loadAppointmentForCounselorAction(params);

    if (appt.status === CounselorAppointmentStatus.CONFIRMED) {
      return { ok: true };
    }
    if (appt.status !== CounselorAppointmentStatus.BOOKED) {
      return { ok: false, error: "این درخواست دیگر قابل تأیید نیست." };
    }
    if (appt.bookingReservation.status !== BookingStatus.PENDING) {
      return { ok: false, error: "وضعیت رزرو برای تأیید معتبر نیست." };
    }

    const slot = appt.bookingReservation.slot;
    if (appt.purpose) {
      const access = await assertSlotBookableForCounselorSession({
        organizationId: params.ctx.organizationId,
        slotId: slot.id,
        advisorId: slot.advisorId,
        sessionKind: sessionKindFromPurpose(appt.purpose as AppointmentPurpose),
      });
      if (!access.ok) {
        return { ok: false, error: access.error };
      }
    }

    const conflict = await prisma.counselorAppointment.findFirst({
      where: {
        organizationId: params.ctx.organizationId,
        id: { not: appt.id },
        counselorUserId: appt.counselorUserId,
        status: {
          in: [
            CounselorAppointmentStatus.BOOKED,
            CounselorAppointmentStatus.CONFIRMED,
          ],
        },
        bookingReservation: {
          status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
          slot: {
            startsAt: { lt: slot.endsAt },
            endsAt: { gt: slot.startsAt },
          },
        },
      },
      select: { id: true },
    });
    if (conflict) {
      return {
        ok: false,
        error: "یک جلسه دیگر در همین بازه برای مشاور ثبت شده است.",
      };
    }

    const reservationId = appt.bookingReservationId;
    const updated = await updateReservationStatus({
      organizationId: params.ctx.organizationId,
      reservationId,
      status: BookingStatus.CONFIRMED,
    });
    if (!updated.ok) return updated;

    await prisma.counselorAppointment.update({
      where: { id: appt.id },
      data: { status: CounselorAppointmentStatus.CONFIRMED },
    });

    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "تأیید انجام نشد.",
    };
  }
}

export async function rejectCounselorAppointment(params: {
  ctx: CounselorContext;
  appointmentId: string;
  reason?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const appt = await loadAppointmentForCounselorAction(params);

    if (
      appt.status === CounselorAppointmentStatus.CANCELLED_BY_COUNSELOR ||
      appt.status === CounselorAppointmentStatus.CANCELLED_BY_STUDENT
    ) {
      return { ok: true };
    }
    if (appt.status !== CounselorAppointmentStatus.BOOKED) {
      return { ok: false, error: "فقط درخواست‌های منتظر تأیید قابل رد هستند." };
    }

    const reason = params.reason?.trim();
    if (reason) {
      const prev = appt.bookingReservation.notes?.trim();
      const note = prev
        ? `${prev}\n[رد مشاور] ${reason}`
        : `[رد مشاور] ${reason}`;
      await prisma.bookingReservation.update({
        where: { id: appt.bookingReservationId },
        data: { notes: note },
      });
    }

    const cancelled = await cancelReservation({
      organizationId: params.ctx.organizationId,
      reservationId: appt.bookingReservationId,
    });
    if (!cancelled.ok) return cancelled;

    await prisma.counselorAppointment.update({
      where: { id: appt.id },
      data: { status: CounselorAppointmentStatus.CANCELLED_BY_COUNSELOR },
    });

    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "رد درخواست انجام نشد.",
    };
  }
}

export async function assertStudentMayChangeAppointment(params: {
  organizationId: string;
  studentId: string;
  appointmentId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const appt = await prisma.counselorAppointment.findFirst({
    where: {
      id: params.appointmentId,
      organizationId: params.organizationId,
      studentId: params.studentId,
    },
    select: { status: true },
  });
  if (!appt) {
    return { ok: false, error: "نوبت یافت نشد." };
  }
  if (!canStudentChangeAppointment(appt.status)) {
    return { ok: false, error: STUDENT_LOCKED_MESSAGE };
  }
  return { ok: true };
}
