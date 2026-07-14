/**
 * Server-side form ↔ booking gate.
 * Client reservation IDs are never trusted — only opaque proof tokens.
 */

import { BookingStatus } from "@/generated/prisma/enums";
import {
  parseFormBookingSettings,
  type FormBookingSettings,
} from "@/lib/booking/form-booking-settings";
import { hashOpaqueToken } from "@/lib/booking/tokens";
import { prisma } from "@/lib/prisma";

const ACTIVE = new Set<BookingStatus>([
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
  BookingStatus.WAITING_LIST,
]);

export type ValidatedBookingProof = {
  reservationId: string;
  trackingCode: string;
  serviceId: string;
  status: BookingStatus;
};

/**
 * Resolve FormVersion.settings.booking for a published version payload.
 */
export function readFormBookingSettings(settings: unknown): FormBookingSettings {
  return parseFormBookingSettings(settings);
}

/**
 * Validate opaque booking proof (cancel token) against org + expected service.
 */
export async function validateBookingProof(params: {
  organizationId: string;
  serviceId: string;
  proofToken: string;
}): Promise<
  | { ok: true; reservation: ValidatedBookingProof }
  | { ok: false; error: string }
> {
  const token = params.proofToken.trim();
  if (!token) {
    return {
      ok: false,
      error: "برای ارسال این فرم ابتدا باید نوبت رزرو کنید.",
    };
  }

  const reservation = await prisma.bookingReservation.findFirst({
    where: {
      organizationId: params.organizationId,
      cancelTokenHash: hashOpaqueToken(token),
      deletedAt: null,
      slot: { serviceId: params.serviceId },
    },
    select: {
      id: true,
      trackingCode: true,
      status: true,
      formSubmissionId: true,
      slot: { select: { serviceId: true } },
    },
  });

  if (!reservation || !ACTIVE.has(reservation.status)) {
    return {
      ok: false,
      error: "رزرو مرتبط معتبر نیست یا لغو شده است. لطفاً دوباره رزرو کنید.",
    };
  }

  if (reservation.slot.serviceId !== params.serviceId) {
    return {
      ok: false,
      error: "رزرو با خدمت متصل به این فرم مطابقت ندارد.",
    };
  }

  return {
    ok: true,
    reservation: {
      reservationId: reservation.id,
      trackingCode: reservation.trackingCode,
      serviceId: reservation.slot.serviceId,
      status: reservation.status,
    },
  };
}

export async function linkReservationToSubmission(params: {
  organizationId: string;
  reservationId: string;
  formSubmissionId: string;
}): Promise<void> {
  await prisma.bookingReservation.updateMany({
    where: {
      id: params.reservationId,
      organizationId: params.organizationId,
      deletedAt: null,
    },
    data: { formSubmissionId: params.formSubmissionId },
  });
}

/**
 * After-submit: verify submission belongs to org/form before offering booking link.
 */
export async function assertSubmissionForBookingLink(params: {
  organizationId: string;
  formId: string;
  formSubmissionId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const submission = await prisma.formSubmission.findFirst({
    where: {
      id: params.formSubmissionId,
      organizationId: params.organizationId,
      formId: params.formId,
      deletedAt: null,
    },
    select: { id: true },
  });
  if (!submission) {
    return { ok: false, error: "پاسخ فرم برای اتصال به رزرو یافت نشد." };
  }
  return { ok: true };
}
