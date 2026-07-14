import {
  BookingMeetingType,
  BookingStatus,
  DomainEventType,
} from "@/generated/prisma/enums";
import {
  DUPLICATE_BOOKING_MESSAGE,
  findDuplicateActiveReservation,
} from "@/lib/booking/duplicates";
import { enqueueBookingEvent } from "@/lib/booking/events";
import {
  parseBookingServiceSettings,
  parseMeetingTypes,
} from "@/lib/booking/service-settings";
import {
  claimSlotSeat,
  claimWaitingListSeat,
  SLOT_FULL_MESSAGE,
} from "@/lib/booking/slot-capacity";
import { generateTrackingCode } from "@/lib/booking/tracking-code";
import {
  generateOpaqueToken,
  hashOpaqueToken,
} from "@/lib/booking/tokens";
import { normalizeEmail } from "@/lib/forms/normalize-email";
import { normalizeIranianMobile } from "@/lib/forms/normalize-mobile";
import { normalizeNationalId } from "@/lib/forms/normalize-national-id";
import { prisma } from "@/lib/prisma";

export type CreateReservationInput = {
  organizationId: string;
  slotId: string;
  firstName: string;
  lastName: string;
  mobile: string;
  email?: string | null;
  nationalId?: string | null;
  meetingType?: BookingMeetingType;
  notes?: string | null;
  formSubmissionId?: string | null;
  preferWaitingList?: boolean;
};

export type CreateReservationResult =
  | {
      ok: true;
      reservationId: string;
      trackingCode: string;
      status: BookingStatus;
      cancelToken: string;
      checkInToken: string;
    }
  | { ok: false; error: string };

export async function createReservation(
  input: CreateReservationInput,
): Promise<CreateReservationResult> {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  if (!firstName || !lastName) {
    return { ok: false, error: "نام و نام خانوادگی الزامی است." };
  }

  const mobile = normalizeIranianMobile(input.mobile);
  if (!mobile.ok) {
    return { ok: false, error: mobile.error };
  }

  let emailValue: string | null = null;
  if (input.email?.trim()) {
    const email = normalizeEmail(input.email);
    if (!email.ok) {
      return { ok: false, error: email.error };
    }
    emailValue = email.email;
  }

  let nationalId: string | null = null;
  if (input.nationalId?.trim()) {
    const nid = normalizeNationalId(input.nationalId);
    if (!nid.ok) {
      return { ok: false, error: nid.error };
    }
    nationalId = nid.normalized;
  }

  const slot = await prisma.bookingSlot.findFirst({
    where: {
      id: input.slotId,
      organizationId: input.organizationId,
    },
    include: {
      service: true,
      advisor: true,
    },
  });

  if (!slot || !slot.service.isActive || slot.service.deletedAt) {
    return { ok: false, error: "خدمت یا نوبت انتخاب‌شده معتبر نیست." };
  }

  const settings = parseBookingServiceSettings(slot.service.settings);
  const meetingTypes = parseMeetingTypes(slot.service.meetingTypes);
  const meetingType =
    input.meetingType ??
    (meetingTypes[0] as BookingMeetingType) ??
    BookingMeetingType.IN_PERSON;
  if (!(meetingTypes as string[]).includes(meetingType)) {
    return { ok: false, error: "نوع جلسه انتخاب‌شده برای این خدمت مجاز نیست." };
  }

  const duplicate = await findDuplicateActiveReservation({
    organizationId: input.organizationId,
    serviceId: slot.serviceId,
    advisorId: slot.advisorId,
    slotStartsAt: slot.startsAt,
    normalizedMobile: mobile.normalized,
    normalizedNationalId: nationalId,
    duplicateKeys: settings.duplicateKeys,
  });
  if (duplicate) {
    return { ok: false, error: DUPLICATE_BOOKING_MESSAGE };
  }

  const cancelToken = generateOpaqueToken();
  const checkInToken = generateOpaqueToken();
  let trackingCode = generateTrackingCode();

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Retry tracking code collision lightly
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const exists = await tx.bookingReservation.findFirst({
          where: {
            organizationId: input.organizationId,
            trackingCode,
          },
          select: { id: true },
        });
        if (!exists) break;
        trackingCode = generateTrackingCode();
      }

      const claimed = await claimSlotSeat(tx, slot.id);
      let status: BookingStatus;

      if (claimed) {
        status = settings.autoConfirm
          ? BookingStatus.CONFIRMED
          : BookingStatus.PENDING;
      } else if (settings.allowWaitingList || input.preferWaitingList) {
        const wait = await claimWaitingListSeat(tx, slot.id);
        if (!wait) {
          return { ok: false as const, error: SLOT_FULL_MESSAGE };
        }
        status = BookingStatus.WAITING_LIST;
      } else {
        return { ok: false as const, error: SLOT_FULL_MESSAGE };
      }

      const reservation = await tx.bookingReservation.create({
        data: {
          organizationId: input.organizationId,
          slotId: slot.id,
          formSubmissionId: input.formSubmissionId ?? null,
          status,
          meetingType,
          firstName,
          lastName,
          normalizedMobile: mobile.normalized,
          normalizedEmail: emailValue,
          normalizedNationalId: nationalId,
          trackingCode,
          cancelTokenHash: hashOpaqueToken(cancelToken),
          checkInTokenHash: hashOpaqueToken(checkInToken),
          notes: input.notes?.trim() || null,
        },
      });

      await enqueueBookingEvent({
        organizationId: input.organizationId,
        branchId: slot.branchId,
        eventType:
          status === BookingStatus.WAITING_LIST
            ? DomainEventType.BOOKING_WAITLISTED
            : status === BookingStatus.CONFIRMED
              ? DomainEventType.BOOKING_CONFIRMED
              : DomainEventType.BOOKING_CREATED,
        reservationId: reservation.id,
        payload: {
          trackingCode,
          serviceId: slot.serviceId,
          status,
        },
        tx,
      });

      return {
        ok: true as const,
        reservationId: reservation.id,
        trackingCode,
        status,
        cancelToken,
        checkInToken,
      };
    });

    return result;
  } catch {
    return {
      ok: false,
      error: "ثبت رزرو در حال حاضر ممکن نیست. لطفاً دوباره تلاش کنید.",
    };
  }
}
