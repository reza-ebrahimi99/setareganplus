/**
 * Counselor/admin appointment operations: reschedule, cancel, no-show, complete.
 */

import {
  BookingStatus,
  CounselorAppointmentStatus,
  CounselingSessionRecordStatus,
} from "@/generated/prisma/enums";
import { cancelReservation, rescheduleReservation, updateReservationStatus } from "@/lib/booking/manage-reservation";
import {
  assertCounselorCanAccessStudent,
  type CounselorContext,
} from "@/lib/counselor-os/auth";
import { writeAppointmentAudit } from "@/lib/counselor-os/appointment-audit";
import { notifyStudentPortal } from "@/lib/counselor-os/appointment-notify";
import { assertSlotBookableForCounselorSession } from "@/lib/counselor-os/schedule-v2/student-slot-access";
import { sessionKindFromPurpose } from "@/lib/counselor-os/schedule-v2/session-kind";
import type { AppointmentPurpose } from "@/lib/guidance/journey-v2/constants";
import { prisma } from "@/lib/prisma";

async function loadAppt(ctx: CounselorContext, appointmentId: string) {
  const row = await prisma.counselorAppointment.findFirst({
    where: {
      id: appointmentId,
      organizationId: ctx.organizationId,
      ...(ctx.canReview ? {} : { counselorUserId: ctx.userId }),
    },
    include: { bookingReservation: { include: { slot: true } } },
  });
  if (!row) throw new Error("جلسه یافت نشد.");
  await assertCounselorCanAccessStudent({
    organizationId: ctx.organizationId,
    counselorUserId: ctx.userId,
    studentId: row.studentId,
    canReview: ctx.canReview,
    isSupervisor: ctx.isSupervisor,
  });
  return row;
}

export async function adminRescheduleAppointment(params: {
  ctx: CounselorContext;
  appointmentId: string;
  newSlotId: string;
  reason: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const reason = params.reason.trim();
  if (reason.length < 3) {
    return { ok: false, error: "علت تغییر زمان الزامی است." };
  }
  try {
    const appt = await loadAppt(params.ctx, params.appointmentId);
    if (
      appt.status !== CounselorAppointmentStatus.BOOKED &&
      appt.status !== CounselorAppointmentStatus.CONFIRMED
    ) {
      return { ok: false, error: "این جلسه قابل جابه‌جایی نیست." };
    }
    if (appt.purpose) {
      const slot = await prisma.bookingSlot.findFirst({
        where: { id: params.newSlotId },
        select: { advisorId: true },
      });
      if (!slot) return { ok: false, error: "زمان جدید معتبر نیست." };
      const access = await assertSlotBookableForCounselorSession({
        organizationId: params.ctx.organizationId,
        slotId: params.newSlotId,
        advisorId: slot.advisorId,
        sessionKind: sessionKindFromPurpose(appt.purpose as AppointmentPurpose),
      });
      if (!access.ok) return access;
    }

    const oldSlot = appt.bookingReservation.slot;
    const result = await rescheduleReservation({
      organizationId: params.ctx.organizationId,
      reservationId: appt.bookingReservationId,
      newSlotId: params.newSlotId,
    });
    if (!result.ok) return result;

    const keepConfirmed =
      appt.status === CounselorAppointmentStatus.CONFIRMED;

    await prisma.$transaction(async (tx) => {
      if (keepConfirmed) {
        await tx.bookingReservation.update({
          where: { id: result.newReservationId },
          data: { status: BookingStatus.CONFIRMED },
        });
      } else {
        await tx.bookingReservation.update({
          where: { id: result.newReservationId },
          data: { status: BookingStatus.PENDING },
        });
      }
      await tx.counselorAppointment.update({
        where: { id: appt.id },
        data: {
          bookingReservationId: result.newReservationId,
          status: keepConfirmed
            ? CounselorAppointmentStatus.CONFIRMED
            : CounselorAppointmentStatus.BOOKED,
        },
      });
      await writeAppointmentAudit({
        organizationId: params.ctx.organizationId,
        appointmentId: appt.id,
        actorUserId: params.ctx.userId,
        action: "ADMIN_RESCHEDULE",
        reason,
        before: {
          slotId: oldSlot.id,
          startsAt: oldSlot.startsAt.toISOString(),
        },
        after: { newSlotId: params.newSlotId, reservationId: result.newReservationId },
        tx,
      });
    });

    await notifyStudentPortal({
      organizationId: params.ctx.organizationId,
      studentId: appt.studentId,
      title: "تغییر زمان جلسه مشاوره",
      body: `زمان جلسه توسط آموزشگاه تغییر کرد. علت: ${reason}`,
      entityId: appt.id,
      dedupeKey: `reschedule:${appt.id}:${result.newReservationId}`,
    });

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "جابه‌جایی انجام نشد." };
  }
}

export async function markAppointmentNoShow(params: {
  ctx: CounselorContext;
  appointmentId: string;
  reason?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const appt = await loadAppt(params.ctx, params.appointmentId);
    await prisma.$transaction(async (tx) => {
      await tx.counselorAppointment.update({
        where: { id: appt.id },
        data: { status: CounselorAppointmentStatus.NO_SHOW },
      });
      await writeAppointmentAudit({
        organizationId: params.ctx.organizationId,
        appointmentId: appt.id,
        actorUserId: params.ctx.userId,
        action: "NO_SHOW",
        reason: params.reason,
        tx,
      });
    });
    await updateReservationStatus({
      organizationId: params.ctx.organizationId,
      reservationId: appt.bookingReservationId,
      status: BookingStatus.NO_SHOW,
    }).catch(() => undefined);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ثبت غیبت انجام نشد." };
  }
}

export async function adminCancelAppointment(params: {
  ctx: CounselorContext;
  appointmentId: string;
  reason: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const reason = params.reason.trim();
  if (reason.length < 3) return { ok: false, error: "علت لغو الزامی است." };
  try {
    const appt = await loadAppt(params.ctx, params.appointmentId);
    const cancelled = await cancelReservation({
      organizationId: params.ctx.organizationId,
      reservationId: appt.bookingReservationId,
    });
    if (!cancelled.ok) return cancelled;
    await prisma.$transaction(async (tx) => {
      await tx.counselorAppointment.update({
        where: { id: appt.id },
        data: { status: CounselorAppointmentStatus.CANCELLED_BY_COUNSELOR },
      });
      await writeAppointmentAudit({
        organizationId: params.ctx.organizationId,
        appointmentId: appt.id,
        actorUserId: params.ctx.userId,
        action: "ADMIN_CANCEL",
        reason,
        tx,
      });
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "لغو انجام نشد." };
  }
}

export async function completeAppointmentWithReport(params: {
  ctx: CounselorContext;
  appointmentId: string;
  sessionId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await prisma.counselingSessionRecord.findFirst({
    where: {
      id: params.sessionId,
      organizationId: params.ctx.organizationId,
    },
  });
  if (!session) return { ok: false, error: "گزارش جلسه یافت نشد." };
  const summary = (session.summary ?? "").trim();
  if (summary.length < 10) {
    return { ok: false, error: "خلاصه جلسه حداقل ۱۰ کاراکتر لازم است." };
  }
  try {
    const appt = await loadAppt(params.ctx, params.appointmentId);
    await prisma.$transaction(async (tx) => {
      await tx.counselorAppointment.update({
        where: { id: appt.id },
        data: { status: CounselorAppointmentStatus.COMPLETED },
      });
      await tx.counselingSessionRecord.update({
        where: { id: session.id },
        data: {
          status: CounselingSessionRecordStatus.COMPLETED,
          isDraft: false,
          reportLockedAt: new Date(),
          endedAt: session.endedAt ?? new Date(),
        },
      });
      await writeAppointmentAudit({
        organizationId: params.ctx.organizationId,
        appointmentId: appt.id,
        actorUserId: params.ctx.userId,
        action: "COMPLETED",
        tx,
      });
    });
    await updateReservationStatus({
      organizationId: params.ctx.organizationId,
      reservationId: appt.bookingReservationId,
      status: BookingStatus.COMPLETED,
    }).catch(() => undefined);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "تکمیل انجام نشد." };
  }
}

export async function bookOpenSlotForStudentByStaff(params: {
  ctx: CounselorContext;
  slotId: string;
  studentId: string;
  purpose?: string | null;
}): Promise<{ ok: true; appointmentId: string } | { ok: false; error: string }> {
  const student = await prisma.student.findFirst({
    where: {
      id: params.studentId,
      organizationId: params.ctx.organizationId,
      deletedAt: null,
    },
    include: {
      portalAccountLinks: {
        take: 1,
        include: { user: { select: { mobile: true, firstName: true, lastName: true } } },
      },
    },
  });
  if (!student) return { ok: false, error: "دانش‌آموز یافت نشد." };

  const { bookCounselorSlotForStudent } = await import("@/lib/counselor-os/booking");
  const names = student.fullName.trim().split(/\s+/);
  const linkUser = student.portalAccountLinks[0]?.user;
  const firstName = linkUser?.firstName || names[0] || student.fullName;
  const lastName = linkUser?.lastName || names.slice(1).join(" ") || "—";
  const mobile = linkUser?.mobile ?? "";
  if (!mobile) return { ok: false, error: "شماره تماس دانش‌آموز ثبت نشده است." };

  const booked = await bookCounselorSlotForStudent({
    organizationId: params.ctx.organizationId,
    studentId: params.studentId,
    userId: params.ctx.userId,
    slotId: params.slotId,
    firstName,
    lastName,
    mobile,
    purpose: params.purpose ?? null,
  });
  if (!booked.ok) return booked;

  const appt = await prisma.counselorAppointment.findFirst({
    where: {
      organizationId: params.ctx.organizationId,
      studentId: params.studentId,
      bookingReservation: { trackingCode: booked.trackingCode },
    },
    select: { id: true },
  });
  if (!appt) return { ok: false, error: "appointment یافت نشد." };
  return { ok: true, appointmentId: appt.id };
}
