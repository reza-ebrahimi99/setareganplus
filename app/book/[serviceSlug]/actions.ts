"use server";

import { BookingMeetingType } from "@/generated/prisma/enums";
import type { JalaliDate } from "@/lib/datetime/jalali";
import { loadPublicSlotsForDay } from "@/lib/booking/load-public-service";
import { createReservation } from "@/lib/booking/reserve";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";
import { prisma } from "@/lib/prisma";

export type PublicSlotDto = {
  id: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  bookedCount: number;
  remaining: number;
  status: string;
  selectable: boolean;
  advisor: { id: string; displayName: string; colorKey: string | null };
};

export async function loadSlotsAction(input: {
  serviceSlug: string;
  serviceId: string;
  advisorId?: string | null;
  day: JalaliDate;
}): Promise<{ ok: true; slots: PublicSlotDto[] } | { ok: false; error: string }> {
  try {
    const organization = await getCurrentOrganization();
    const service = await prisma.bookingService.findFirst({
      where: {
        id: input.serviceId,
        organizationId: organization.id,
        slug: input.serviceSlug,
        deletedAt: null,
        isActive: true,
      },
      select: { id: true },
    });
    if (!service) {
      return { ok: false, error: "خدمت یافت نشد." };
    }

    const slots = await loadPublicSlotsForDay({
      organizationId: organization.id,
      serviceId: service.id,
      advisorId: input.advisorId,
      day: input.day,
    });

    return {
      ok: true,
      slots: slots.map((slot) => ({
        id: slot.id,
        startsAt: slot.startsAt.toISOString(),
        endsAt: slot.endsAt.toISOString(),
        capacity: slot.capacity,
        bookedCount: slot.bookedCount,
        remaining: slot.remaining,
        status: slot.status,
        selectable: slot.selectable,
        advisor: slot.advisor,
      })),
    };
  } catch {
    return { ok: false, error: "بارگذاری نوبت‌ها ممکن نشد." };
  }
}

export async function createPublicReservationAction(input: {
  serviceSlug: string;
  slotId: string;
  firstName: string;
  lastName: string;
  mobile: string;
  email?: string;
  nationalId?: string;
  notes?: string;
  meetingType: string;
  company_url?: string;
  formSubmissionId?: string | null;
}): Promise<
  | {
      ok: true;
      trackingCode: string;
      checkInToken: string;
      bookingProof: string;
      reservationId: string;
    }
  | { ok: false; error: string }
> {
  // Honeypot
  if (input.company_url?.trim()) {
    return { ok: false, error: "درخواست نامعتبر است." };
  }

  try {
    const organization = await getCurrentOrganization();
    const slot = await prisma.bookingSlot.findFirst({
      where: {
        id: input.slotId,
        organizationId: organization.id,
        service: {
          slug: input.serviceSlug,
          deletedAt: null,
          isActive: true,
        },
      },
      select: { id: true },
    });
    if (!slot) {
      return { ok: false, error: "نوبت انتخاب‌شده معتبر نیست." };
    }

    let formSubmissionId: string | null = null;
    if (input.formSubmissionId?.trim()) {
      const submission = await prisma.formSubmission.findFirst({
        where: {
          id: input.formSubmissionId.trim(),
          organizationId: organization.id,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!submission) {
        return { ok: false, error: "پاسخ فرم برای اتصال به رزرو معتبر نیست." };
      }
      formSubmissionId = submission.id;
    }

    const meetingType = (
      ["IN_PERSON", "ONLINE", "PHONE"] as const
    ).includes(input.meetingType as BookingMeetingType)
      ? (input.meetingType as BookingMeetingType)
      : BookingMeetingType.IN_PERSON;

    const result = await createReservation({
      organizationId: organization.id,
      slotId: slot.id,
      firstName: input.firstName,
      lastName: input.lastName,
      mobile: input.mobile,
      email: input.email,
      nationalId: input.nationalId,
      notes: input.notes,
      meetingType,
      formSubmissionId,
    });

    if (!result.ok) {
      return result;
    }

    return {
      ok: true,
      trackingCode: result.trackingCode,
      checkInToken: result.checkInToken,
      bookingProof: result.cancelToken,
      reservationId: result.reservationId,
    };
  } catch {
    return { ok: false, error: "ثبت رزرو ممکن نشد." };
  }
}
