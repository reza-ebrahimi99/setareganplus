import {
  BookingCheckInMethod,
  BookingStatus,
  DomainEventType,
} from "@/generated/prisma/enums";
import { enqueueBookingEvent } from "@/lib/booking/events";
import { hashOpaqueToken } from "@/lib/booking/tokens";
import { prisma } from "@/lib/prisma";

export type CheckInResult =
  | { ok: true; message: string; reservationId: string; trackingCode: string }
  | { ok: false; error: string };

/**
 * Admin check-in by opaque token (QR) or reservation id.
 * Marks checked-in once; org-scoped; replay-safe.
 */
export async function checkInReservation(params: {
  organizationId: string;
  actorUserId: string;
  token?: string;
  reservationId?: string;
  method?: BookingCheckInMethod;
}): Promise<CheckInResult> {
  const method = params.method ?? BookingCheckInMethod.QR;

  const reservation = params.token
    ? await prisma.bookingReservation.findFirst({
        where: {
          organizationId: params.organizationId,
          checkInTokenHash: hashOpaqueToken(params.token),
          deletedAt: null,
        },
        include: { slot: true },
      })
    : params.reservationId
      ? await prisma.bookingReservation.findFirst({
          where: {
            id: params.reservationId,
            organizationId: params.organizationId,
            deletedAt: null,
          },
          include: { slot: true },
        })
      : null;

  if (!reservation) {
    return { ok: false, error: "رزرو معتبر برای ورود یافت نشد." };
  }

  if (
    reservation.status === BookingStatus.CANCELLED ||
    reservation.status === BookingStatus.RESCHEDULED ||
    reservation.status === BookingStatus.NO_SHOW
  ) {
    return { ok: false, error: "این رزرو برای ورود معتبر نیست." };
  }

  if (reservation.checkedInAt) {
    return {
      ok: false,
      error: "ورود این رزرو قبلاً ثبت شده است.",
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.bookingCheckIn.findUnique({
        where: {
          organizationId_reservationId: {
            organizationId: params.organizationId,
            reservationId: reservation.id,
          },
        },
      });
      if (existing) {
        throw new Error("REPLAY");
      }

      await tx.bookingCheckIn.create({
        data: {
          organizationId: params.organizationId,
          reservationId: reservation.id,
          checkedInByUserId: params.actorUserId,
          method,
        },
      });

      await tx.bookingReservation.update({
        where: { id: reservation.id },
        data: {
          checkedInAt: new Date(),
          status:
            reservation.status === BookingStatus.WAITING_LIST
              ? reservation.status
              : BookingStatus.CONFIRMED,
        },
      });

      await enqueueBookingEvent({
        organizationId: params.organizationId,
        branchId: reservation.slot.branchId,
        eventType: DomainEventType.BOOKING_CHECKED_IN,
        reservationId: reservation.id,
        payload: { method },
        tx,
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "REPLAY") {
      return { ok: false, error: "ورود این رزرو قبلاً ثبت شده است." };
    }
    return { ok: false, error: "ثبت ورود ممکن نشد." };
  }

  return {
    ok: true,
    message: "ورود با موفقیت ثبت شد.",
    reservationId: reservation.id,
    trackingCode: reservation.trackingCode,
  };
}
