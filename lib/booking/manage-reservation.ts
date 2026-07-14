import {
  BookingStatus,
  DomainEventType,
} from "@/generated/prisma/enums";
import { enqueueBookingEvent } from "@/lib/booking/events";
import {
  CAPACITY_CONSUMING_BOOKING_STATUSES,
  claimSlotSeat,
  releaseSlotSeat,
  releaseWaitingListSeat,
  SLOT_FULL_MESSAGE,
} from "@/lib/booking/slot-capacity";
import { prisma } from "@/lib/prisma";

const CONSUMING = new Set<string>(CAPACITY_CONSUMING_BOOKING_STATUSES);

export async function cancelReservation(params: {
  organizationId: string;
  reservationId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await prisma.$transaction(async (tx) => {
      const reservation = await tx.bookingReservation.findFirst({
        where: {
          id: params.reservationId,
          organizationId: params.organizationId,
          deletedAt: null,
        },
        include: { slot: true },
      });
      if (!reservation) {
        throw new Error("NOT_FOUND");
      }
      if (
        reservation.status === BookingStatus.CANCELLED ||
        reservation.status === BookingStatus.RESCHEDULED
      ) {
        return;
      }

      await tx.bookingReservation.update({
        where: { id: reservation.id },
        data: { status: BookingStatus.CANCELLED },
      });

      if (CONSUMING.has(reservation.status)) {
        await releaseSlotSeat(tx, reservation.slotId);
      } else if (reservation.status === BookingStatus.WAITING_LIST) {
        await releaseWaitingListSeat(tx, reservation.slotId);
      }

      await enqueueBookingEvent({
        organizationId: params.organizationId,
        branchId: reservation.slot.branchId,
        eventType: DomainEventType.BOOKING_CANCELLED,
        reservationId: reservation.id,
        payload: { previousStatus: reservation.status },
        tx,
      });
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return { ok: false, error: "رزرو یافت نشد." };
    }
    return { ok: false, error: "لغو رزرو ممکن نشد." };
  }
}

export async function updateReservationStatus(params: {
  organizationId: string;
  reservationId: string;
  status: Extract<
    BookingStatus,
    "CONFIRMED" | "COMPLETED" | "NO_SHOW"
  >;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const reservation = await prisma.bookingReservation.findFirst({
    where: {
      id: params.reservationId,
      organizationId: params.organizationId,
      deletedAt: null,
    },
    include: { slot: true },
  });
  if (!reservation) {
    return { ok: false, error: "رزرو یافت نشد." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.bookingReservation.update({
      where: { id: reservation.id },
      data: { status: params.status },
    });

    const eventType =
      params.status === BookingStatus.CONFIRMED
        ? DomainEventType.BOOKING_CONFIRMED
        : params.status === BookingStatus.COMPLETED
          ? DomainEventType.BOOKING_COMPLETED
          : DomainEventType.BOOKING_NO_SHOW;

    await enqueueBookingEvent({
      organizationId: params.organizationId,
      branchId: reservation.slot.branchId,
      eventType,
      reservationId: reservation.id,
      tx,
    });
  });

  return { ok: true };
}

/**
 * Reschedule: claim new slot first, then release old, mark old RESCHEDULED.
 */
export async function rescheduleReservation(params: {
  organizationId: string;
  reservationId: string;
  newSlotId: string;
}): Promise<
  | { ok: true; newReservationId: string; trackingCode: string }
  | { ok: false; error: string }
> {
  try {
    return await prisma.$transaction(async (tx) => {
      const current = await tx.bookingReservation.findFirst({
        where: {
          id: params.reservationId,
          organizationId: params.organizationId,
          deletedAt: null,
        },
        include: { slot: true },
      });
      if (!current) {
        return { ok: false as const, error: "رزرو یافت نشد." };
      }
      if (
        current.status === BookingStatus.CANCELLED ||
        current.status === BookingStatus.RESCHEDULED ||
        current.status === BookingStatus.COMPLETED
      ) {
        return {
          ok: false as const,
          error: "این رزرو قابل جابه‌جایی نیست.",
        };
      }

      const claimed = await claimSlotSeat(tx, params.newSlotId);
      if (!claimed) {
        return { ok: false as const, error: SLOT_FULL_MESSAGE };
      }

      if (CONSUMING.has(current.status)) {
        await releaseSlotSeat(tx, current.slotId);
      } else if (current.status === BookingStatus.WAITING_LIST) {
        await releaseWaitingListSeat(tx, current.slotId);
      }

      await tx.bookingReservation.update({
        where: { id: current.id },
        data: { status: BookingStatus.RESCHEDULED },
      });

      const created = await tx.bookingReservation.create({
        data: {
          organizationId: params.organizationId,
          slotId: params.newSlotId,
          formSubmissionId: current.formSubmissionId,
          status: BookingStatus.CONFIRMED,
          meetingType: current.meetingType,
          firstName: current.firstName,
          lastName: current.lastName,
          normalizedMobile: current.normalizedMobile,
          normalizedEmail: current.normalizedEmail,
          normalizedNationalId: current.normalizedNationalId,
          trackingCode: current.trackingCode,
          cancelTokenHash: current.cancelTokenHash,
          checkInTokenHash: current.checkInTokenHash,
          rescheduledFromId: current.id,
          notes: current.notes,
        },
      });

      const newSlot = await tx.bookingSlot.findFirst({
        where: { id: params.newSlotId, organizationId: params.organizationId },
        select: { branchId: true },
      });

      await enqueueBookingEvent({
        organizationId: params.organizationId,
        branchId: newSlot?.branchId ?? current.slot.branchId,
        eventType: DomainEventType.BOOKING_RESCHEDULED,
        reservationId: created.id,
        payload: { fromReservationId: current.id },
        tx,
      });

      return {
        ok: true as const,
        newReservationId: created.id,
        trackingCode: created.trackingCode,
      };
    });
  } catch {
    return { ok: false, error: "جابه‌جایی نوبت ممکن نشد." };
  }
}

/**
 * Promote waiting-list reservation into a capacity-consuming seat on the same slot.
 */
export async function promoteFromWaitingList(params: {
  organizationId: string;
  reservationId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    return await prisma.$transaction(async (tx) => {
      const reservation = await tx.bookingReservation.findFirst({
        where: {
          id: params.reservationId,
          organizationId: params.organizationId,
          deletedAt: null,
          status: BookingStatus.WAITING_LIST,
        },
      });
      if (!reservation) {
        return { ok: false as const, error: "رزرو لیست انتظار یافت نشد." };
      }

      const claimed = await claimSlotSeat(tx, reservation.slotId);
      if (!claimed) {
        return { ok: false as const, error: SLOT_FULL_MESSAGE };
      }

      await releaseWaitingListSeat(tx, reservation.slotId);
      await tx.bookingReservation.update({
        where: { id: reservation.id },
        data: { status: BookingStatus.CONFIRMED },
      });

      await enqueueBookingEvent({
        organizationId: params.organizationId,
        eventType: DomainEventType.BOOKING_CONFIRMED,
        reservationId: reservation.id,
        payload: { promotedFromWaitingList: true },
        tx,
      });

      return { ok: true as const };
    });
  } catch {
    return { ok: false, error: "انتقال از لیست انتظار ممکن نشد." };
  }
}
