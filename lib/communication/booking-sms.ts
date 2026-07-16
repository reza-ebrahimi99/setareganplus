/**
 * Booking confirmation SMS enqueue (after successful reservation).
 * Must run outside the capacity transaction. Failures never fail the booking.
 */

import { BookingStatus } from "@/generated/prisma/enums";
import { parseBookingServiceSettings } from "@/lib/booking/service-settings";
import {
  formatJalaliDateShort,
  formatPersianTimeRange,
} from "@/lib/datetime/jalali";
import { formatTehranTime24 } from "@/lib/datetime/tehran-zone";
import { enqueueSms, renderSmsTemplate } from "@/lib/communication/queue";
import { toPersianDigits } from "@/lib/persian";
import { prisma } from "@/lib/prisma";

const DEFAULT_BOOKING_BODY =
  "رزرو شما ثبت شد. کد پیگیری: {{trackingCode}} — تاریخ: {{date}} — {{time}}";

export function buildBookingSmsTemplateVariables(params: {
  firstName: string;
  startsAt: Date;
  trackingCode: string;
}): {
  name: string;
  date: string;
  time: string;
  tracking: string;
} {
  return {
    name: params.firstName.trim(),
    date: formatJalaliDateShort(params.startsAt),
    time: toPersianDigits(formatTehranTime24(params.startsAt)),
    tracking: toPersianDigits(params.trackingCode),
  };
}

export async function enqueueBookingConfirmationSms(params: {
  organizationId: string;
  reservationId: string;
}): Promise<void> {
  try {
    const reservation = await prisma.bookingReservation.findFirst({
      where: {
        id: params.reservationId,
        organizationId: params.organizationId,
        deletedAt: null,
      },
      select: {
        id: true,
        status: true,
        trackingCode: true,
        normalizedMobile: true,
        firstName: true,
        lastName: true,
        slot: {
          select: {
            startsAt: true,
            endsAt: true,
            service: {
              select: {
                id: true,
                title: true,
                settings: true,
              },
            },
          },
        },
      },
    });

    if (!reservation) return;
    if (
      reservation.status !== BookingStatus.CONFIRMED &&
      reservation.status !== BookingStatus.PENDING
    ) {
      return;
    }

    const settings = parseBookingServiceSettings(
      reservation.slot.service.settings,
    );
    if (!settings.confirmationSmsEnabled) return;

    const templateVariables = buildBookingSmsTemplateVariables({
      firstName: reservation.firstName,
      startsAt: reservation.slot.startsAt,
      trackingCode: reservation.trackingCode,
    });
    const timeRange = formatPersianTimeRange(
      reservation.slot.startsAt,
      reservation.slot.endsAt,
    );

    const template = await prisma.smsTemplate.findFirst({
      where: {
        organizationId: params.organizationId,
        code: "booking_confirmation",
        isActive: true,
        deletedAt: null,
      },
      select: { id: true, body: true },
    });

    const variables: Record<string, string> = {
      trackingCode: templateVariables.tracking,
      date: templateVariables.date,
      time: templateVariables.time,
      timeRange,
      firstName: reservation.firstName,
      lastName: reservation.lastName,
      serviceTitle: reservation.slot.service.title,
    };

    const body = renderSmsTemplate(
      template?.body ?? DEFAULT_BOOKING_BODY,
      variables,
    );

    await enqueueSms({
      organizationId: params.organizationId,
      toMobile: reservation.normalizedMobile,
      body,
      purpose: "booking_confirmation",
      idempotencyKey: `booking_confirmation:${reservation.id}`,
      templateId: template?.id ?? null,
      relatedType: "BookingReservation",
      relatedId: reservation.id,
      templateDelivery: {
        version: 1,
        kind: "booking",
        variables: templateVariables,
      },
      metadata: {
        trackingCode: reservation.trackingCode,
        serviceId: reservation.slot.service.id,
      },
    });
  } catch {
    // SMS must never fail the booking path.
  }
}
