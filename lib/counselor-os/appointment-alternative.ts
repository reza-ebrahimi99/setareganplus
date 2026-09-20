/**
 * Counselor-proposed alternative slot — student accept/reject with hold + expiry.
 */

import { BookingStatus, CounselorAppointmentStatus } from "@/generated/prisma/enums";
import { cancelReservation } from "@/lib/booking/manage-reservation";
import { createReservation } from "@/lib/booking/reserve";
import type { CounselorContext } from "@/lib/counselor-os/auth";
import { writeAppointmentAudit } from "@/lib/counselor-os/appointment-audit";
import { notifyStudentPortal } from "@/lib/counselor-os/appointment-notify";
import { assertSlotBookableForCounselorSession } from "@/lib/counselor-os/schedule-v2/student-slot-access";
import { sessionKindFromPurpose } from "@/lib/counselor-os/schedule-v2/session-kind";
import type { AppointmentPurpose } from "@/lib/guidance/journey-v2/constants";
import { prisma } from "@/lib/prisma";

const PROPOSAL_TTL_HOURS = 48;
const ACTIVE = "PENDING_STUDENT";

export async function expireStaleAltProposals(organizationId: string) {
  const now = new Date();
  const stale = await prisma.counselorAppointmentAltProposal.findMany({
    where: {
      organizationId,
      status: ACTIVE,
      expiresAt: { lt: now },
    },
    select: { id: true, holdReservationId: true },
  });
  for (const row of stale) {
    if (row.holdReservationId) {
      await cancelReservation({
        organizationId,
        reservationId: row.holdReservationId,
      }).catch(() => undefined);
    }
    await prisma.counselorAppointmentAltProposal.update({
      where: { id: row.id },
      data: { status: "EXPIRED", respondedAt: now },
    });
  }
}

export async function proposeAlternativeSlot(params: {
  ctx: CounselorContext;
  appointmentId: string;
  newSlotId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  await expireStaleAltProposals(params.ctx.organizationId);

  const appt = await prisma.counselorAppointment.findFirst({
    where: {
      id: params.appointmentId,
      organizationId: params.ctx.organizationId,
      status: CounselorAppointmentStatus.BOOKED,
    },
    include: {
      bookingReservation: true,
      student: { select: { fullName: true } },
    },
  });
  if (!appt) return { ok: false, error: "فقط درخواست منتظر تأیید قابل پیشنهاد جایگزین است." };

  if (appt.purpose) {
    const access = await assertSlotBookableForCounselorSession({
      organizationId: params.ctx.organizationId,
      slotId: params.newSlotId,
      advisorId: (
        await prisma.bookingSlot.findFirst({
          where: { id: params.newSlotId },
          select: { advisorId: true },
        })
      )?.advisorId ?? "",
      sessionKind: sessionKindFromPurpose(appt.purpose as AppointmentPurpose),
    });
    if (!access.ok) return access;
  }

  const existing = await prisma.counselorAppointmentAltProposal.findFirst({
    where: {
      organizationId: params.ctx.organizationId,
      appointmentId: appt.id,
      status: ACTIVE,
    },
  });
  if (existing?.holdReservationId) {
    await cancelReservation({
      organizationId: params.ctx.organizationId,
      reservationId: existing.holdReservationId,
    }).catch(() => undefined);
  }

  const res = appt.bookingReservation;
  const hold = await createReservation({
    organizationId: params.ctx.organizationId,
    slotId: params.newSlotId,
    firstName: res.firstName,
    lastName: res.lastName,
    mobile: res.normalizedMobile,
    meetingType: res.meetingType,
    forcePendingConfirmation: true,
    notes: `[HOLD-ALT:${appt.id}]`,
  });
  if (!hold.ok) return { ok: false, error: hold.error };

  const expiresAt = new Date(Date.now() + PROPOSAL_TTL_HOURS * 60 * 60 * 1000);

  await prisma.$transaction(async (tx) => {
    if (existing) {
      await tx.counselorAppointmentAltProposal.update({
        where: { id: existing.id },
        data: {
          proposedSlotId: params.newSlotId,
          holdReservationId: hold.reservationId,
          expiresAt,
          status: ACTIVE,
          createdByUserId: params.ctx.userId,
        },
      });
    } else {
      await tx.counselorAppointmentAltProposal.create({
        data: {
          organizationId: params.ctx.organizationId,
          appointmentId: appt.id,
          proposedSlotId: params.newSlotId,
          holdReservationId: hold.reservationId,
          expiresAt,
          createdByUserId: params.ctx.userId,
          status: ACTIVE,
        },
      });
    }
    await writeAppointmentAudit({
      organizationId: params.ctx.organizationId,
      appointmentId: appt.id,
      actorUserId: params.ctx.userId,
      action: "ALT_PROPOSED",
      after: { slotId: params.newSlotId, holdReservationId: hold.reservationId, expiresAt },
      tx,
    });
  });

  await notifyStudentPortal({
    organizationId: params.ctx.organizationId,
    studentId: appt.studentId,
    title: "پیشنهاد زمان جایگزین برای جلسه مشاوره",
    body: "مشاور زمان دیگری پیشنهاد داده است. لطفاً در پرونده انتخاب رشته بپذیرید یا رد کنید.",
    entityId: appt.id,
    dedupeKey: `alt-proposal:${appt.id}:${params.newSlotId}`,
  });

  return { ok: true };
}

export async function acceptAlternativeProposal(params: {
  organizationId: string;
  studentId: string;
  appointmentId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  await expireStaleAltProposals(params.organizationId);

  const proposal = await prisma.counselorAppointmentAltProposal.findFirst({
    where: {
      organizationId: params.organizationId,
      appointmentId: params.appointmentId,
      status: ACTIVE,
      appointment: { studentId: params.studentId },
    },
  });
  if (!proposal?.holdReservationId) {
    return { ok: false, error: "پیشنهاد فعالی یافت نشد." };
  }

  const appt = await prisma.counselorAppointment.findFirst({
    where: { id: params.appointmentId, organizationId: params.organizationId, studentId: params.studentId },
    include: { bookingReservation: true },
  });
  if (!appt) return { ok: false, error: "نوبت یافت نشد." };

  const oldReservationId = appt.bookingReservationId;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.counselorAppointment.update({
        where: { id: appt.id },
        data: {
          bookingReservationId: proposal.holdReservationId!,
          status: CounselorAppointmentStatus.CONFIRMED,
        },
      });
      await tx.bookingReservation.update({
        where: { id: proposal.holdReservationId! },
        data: { status: BookingStatus.CONFIRMED, notes: null },
      });
      await tx.counselorAppointmentAltProposal.update({
        where: { id: proposal.id },
        data: { status: "ACCEPTED", respondedAt: new Date() },
      });
      await writeAppointmentAudit({
        organizationId: params.organizationId,
        appointmentId: appt.id,
        actorUserId: appt.counselorUserId,
        action: "ALT_ACCEPTED_BY_STUDENT",
        before: { reservationId: oldReservationId },
        after: { reservationId: proposal.holdReservationId },
        tx,
      });
    });

    await cancelReservation({
      organizationId: params.organizationId,
      reservationId: oldReservationId,
    });

    return { ok: true };
  } catch {
    return { ok: false, error: "پذیرش پیشنهاد انجام نشد." };
  }
}

export async function rejectAlternativeProposal(params: {
  organizationId: string;
  studentId: string;
  appointmentId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const proposal = await prisma.counselorAppointmentAltProposal.findFirst({
    where: {
      organizationId: params.organizationId,
      appointmentId: params.appointmentId,
      status: ACTIVE,
      appointment: { studentId: params.studentId },
    },
  });
  if (!proposal) return { ok: false, error: "پیشنهاد فعالی یافت نشد." };

  if (proposal.holdReservationId) {
    await cancelReservation({
      organizationId: params.organizationId,
      reservationId: proposal.holdReservationId,
    });
  }
  await prisma.counselorAppointmentAltProposal.update({
    where: { id: proposal.id },
    data: { status: "REJECTED", respondedAt: new Date() },
  });
  return { ok: true };
}

export async function loadActiveAltProposalForStudent(params: {
  organizationId: string;
  studentId: string;
  appointmentId: string;
}) {
  await expireStaleAltProposals(params.organizationId);
  return prisma.counselorAppointmentAltProposal.findFirst({
    where: {
      organizationId: params.organizationId,
      appointmentId: params.appointmentId,
      status: ACTIVE,
      appointment: { studentId: params.studentId },
    },
    include: {
      appointment: {
        include: {
          bookingReservation: { include: { slot: true } },
        },
      },
    },
  });
}
