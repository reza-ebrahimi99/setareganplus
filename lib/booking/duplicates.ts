import { BookingStatus } from "@/generated/prisma/enums";
import type { BookingDuplicateKey } from "@/lib/booking/service-settings";
import { prisma } from "@/lib/prisma";
import { jalaliToGregorian, utcToJalaliInTehran } from "@/lib/datetime/jalali";
import { tehranDayBoundsUtc } from "@/lib/datetime/tehran-zone";

const ACTIVE_STATUSES: BookingStatus[] = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
  BookingStatus.WAITING_LIST,
];

export type DuplicateCheckInput = {
  organizationId: string;
  serviceId: string;
  advisorId: string;
  slotStartsAt: Date;
  normalizedMobile: string;
  normalizedNationalId?: string | null;
  duplicateKeys: BookingDuplicateKey[];
};

/**
 * Prevent duplicate active bookings according to service settings.
 * Scoped per service. Different services are allowed unless identity matches
 * within the same service under configured keys.
 */
export async function findDuplicateActiveReservation(
  input: DuplicateCheckInput,
): Promise<{ id: string; trackingCode: string } | null> {
  const keys = new Set(input.duplicateKeys);

  const identityOr: Record<string, unknown>[] = [];
  if (keys.has("normalizedMobile") && input.normalizedMobile) {
    identityOr.push({ normalizedMobile: input.normalizedMobile });
  }
  if (keys.has("normalizedNationalId") && input.normalizedNationalId) {
    identityOr.push({ normalizedNationalId: input.normalizedNationalId });
  }
  if (identityOr.length === 0) {
    return null;
  }

  const slotFilter: Record<string, unknown> = {
    serviceId: input.serviceId,
  };

  if (keys.has("advisor")) {
    slotFilter.advisorId = input.advisorId;
  }

  if (keys.has("bookingDate")) {
    const j = utcToJalaliInTehran(input.slotStartsAt);
    const g = jalaliToGregorian(j.jy, j.jm, j.jd);
    const { startUtc, endUtc } = tehranDayBoundsUtc(g.gy, g.gm, g.gd);
    slotFilter.startsAt = { gte: startUtc, lte: endUtc };
  }

  const hit = await prisma.bookingReservation.findFirst({
    where: {
      organizationId: input.organizationId,
      deletedAt: null,
      status: { in: ACTIVE_STATUSES },
      OR: identityOr,
      slot: slotFilter,
    },
    select: { id: true, trackingCode: true },
  });

  return hit;
}

export const DUPLICATE_BOOKING_MESSAGE =
  "برای این خدمت در بازه انتخاب‌شده رزرو فعال دارید. در صورت نیاز رزرو قبلی را لغو کنید.";
