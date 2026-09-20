/**
 * Legacy inconsistency: Appointment BOOKED + Reservation CONFIRMED
 */

import {
  BookingStatus,
  CounselorAppointmentStatus,
} from "@/generated/prisma/enums";
import { cancelReservation } from "@/lib/booking/manage-reservation";
import type { CounselorContext } from "@/lib/counselor-os/auth";
import { writeAppointmentAudit } from "@/lib/counselor-os/appointment-audit";
import { prisma } from "@/lib/prisma";
import type { CounselorAppointmentView } from "@/lib/counselor-os/appointments";
import { listCounselorAppointments } from "@/lib/counselor-os/appointments";

export function isLegacyInconsistent(params: {
  appointmentStatus: string;
  reservationStatus: string;
  inconsistencyResolvedAt: Date | null;
}): boolean {
  return (
    !params.inconsistencyResolvedAt &&
    params.appointmentStatus === CounselorAppointmentStatus.BOOKED &&
    params.reservationStatus === BookingStatus.CONFIRMED
  );
}

export async function listLegacyInconsistentAppointments(
  ctx: CounselorContext,
): Promise<CounselorAppointmentView[]> {
  const rows = await prisma.counselorAppointment.findMany({
    where: {
      organizationId: ctx.organizationId,
      inconsistencyResolvedAt: null,
      status: CounselorAppointmentStatus.BOOKED,
      bookingReservation: { status: BookingStatus.CONFIRMED },
      ...(ctx.canReview || ctx.isSupervisor
        ? {}
        : { counselorUserId: ctx.userId }),
    },
    select: { id: true },
  });
  if (rows.length === 0) return [];
  const all = await listCounselorAppointments(ctx, "all");
  const ids = new Set(rows.map((r) => r.id));
  return all.filter((a) => ids.has(a.id));
}

async function loadLegacy(ctx: CounselorContext, appointmentId: string) {
  const row = await prisma.counselorAppointment.findFirst({
    where: {
      id: appointmentId,
      organizationId: ctx.organizationId,
      ...(ctx.canReview || ctx.isSupervisor
        ? {}
        : { counselorUserId: ctx.userId }),
    },
    include: { bookingReservation: true },
  });
  if (!row) throw new Error("جلسه یافت نشد.");
  if (
    !isLegacyInconsistent({
      appointmentStatus: row.status,
      reservationStatus: row.bookingReservation.status,
      inconsistencyResolvedAt: row.inconsistencyResolvedAt,
    })
  ) {
    throw new Error("این مورد دیگر در فهرست ناسازگاری نیست.");
  }
  return row;
}

export async function legacyConfirmAsDefinitive(params: {
  ctx: CounselorContext;
  appointmentId: string;
  reason?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const row = await loadLegacy(params.ctx, params.appointmentId);
    await prisma.$transaction(async (tx) => {
      await tx.counselorAppointment.update({
        where: { id: row.id },
        data: {
          status: CounselorAppointmentStatus.CONFIRMED,
          inconsistencyResolvedAt: new Date(),
        },
      });
      await writeAppointmentAudit({
        organizationId: params.ctx.organizationId,
        appointmentId: row.id,
        actorUserId: params.ctx.userId,
        action: "LEGACY_CONFIRM_DEFINITIVE",
        reason: params.reason,
        before: { status: row.status, reservationStatus: row.bookingReservation.status },
        after: { status: "CONFIRMED", reservationStatus: "CONFIRMED" },
        tx,
      });
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "عملیات انجام نشد." };
  }
}

export async function legacyRevertToPendingConfirmation(params: {
  ctx: CounselorContext;
  appointmentId: string;
  reason?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const row = await loadLegacy(params.ctx, params.appointmentId);
    await prisma.$transaction(async (tx) => {
      await tx.bookingReservation.update({
        where: { id: row.bookingReservationId },
        data: { status: BookingStatus.PENDING },
      });
      await tx.counselorAppointment.update({
        where: { id: row.id },
        data: {
          status: CounselorAppointmentStatus.BOOKED,
          inconsistencyResolvedAt: new Date(),
        },
      });
      await writeAppointmentAudit({
        organizationId: params.ctx.organizationId,
        appointmentId: row.id,
        actorUserId: params.ctx.userId,
        action: "LEGACY_REVERT_PENDING",
        reason: params.reason,
        before: { reservationStatus: BookingStatus.CONFIRMED },
        after: { reservationStatus: BookingStatus.PENDING },
        tx,
      });
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "عملیات انجام نشد." };
  }
}

export async function legacyCancelWithReason(params: {
  ctx: CounselorContext;
  appointmentId: string;
  reason?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const row = await loadLegacy(params.ctx, params.appointmentId);
    const cancelled = await cancelReservation({
      organizationId: params.ctx.organizationId,
      reservationId: row.bookingReservationId,
    });
    if (!cancelled.ok) return cancelled;
    await prisma.$transaction(async (tx) => {
      await tx.counselorAppointment.update({
        where: { id: row.id },
        data: {
          status: CounselorAppointmentStatus.CANCELLED_BY_COUNSELOR,
          inconsistencyResolvedAt: new Date(),
        },
      });
      await writeAppointmentAudit({
        organizationId: params.ctx.organizationId,
        appointmentId: row.id,
        actorUserId: params.ctx.userId,
        action: "LEGACY_CANCEL",
        reason: params.reason,
        tx,
      });
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "عملیات انجام نشد." };
  }
}
