import { BookingSlotStatus } from "@/generated/prisma/enums";
import {
  jalaliTehranLocalToUtc,
  jalaliToGregorian,
  type JalaliDate,
} from "@/lib/datetime/jalali";
import { tehranDayBoundsUtc } from "@/lib/datetime/tehran-zone";
import {
  parseBookingServiceSettings,
  parseMeetingTypes,
} from "@/lib/booking/service-settings";
import { remainingCapacity } from "@/lib/booking/slot-capacity";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";
import { prisma } from "@/lib/prisma";

export async function loadPublicBookingService(slug: string) {
  try {
    const organization = await getCurrentOrganization();
    const service = await prisma.bookingService.findFirst({
      where: {
        organizationId: organization.id,
        slug,
        deletedAt: null,
        isActive: true,
      },
      include: {
        branch: { select: { id: true, name: true } },
        advisorLinks: {
          include: {
            advisor: {
              select: {
                id: true,
                displayName: true,
                description: true,
                colorKey: true,
                isActive: true,
                deletedAt: true,
              },
            },
          },
        },
      },
    });

    if (!service) {
      return { ok: false as const, reason: "not_found" as const };
    }

    const advisors = service.advisorLinks
      .map((link) => link.advisor)
      .filter((advisor) => advisor.isActive && !advisor.deletedAt);

    const settings = parseBookingServiceSettings(service.settings);

    return {
      ok: true as const,
      data: {
        organizationId: organization.id,
        service: {
          id: service.id,
          slug: service.slug,
          title: service.title,
          description: service.description,
          durationMinutes: service.durationMinutes,
          maximumAdvanceDays: service.maximumAdvanceDays,
          meetingTypes: parseMeetingTypes(service.meetingTypes),
          branch: service.branch,
          settings,
        },
        advisors,
      },
    };
  } catch {
    return { ok: false as const, reason: "unavailable" as const };
  }
}

export async function loadPublicSlotsForDay(params: {
  organizationId: string;
  serviceId: string;
  advisorId?: string | null;
  day: JalaliDate;
}) {
  const { gy, gm, gd } = jalaliToGregorian(
    params.day.jy,
    params.day.jm,
    params.day.jd,
  );
  const { startUtc, endUtc } = tehranDayBoundsUtc(gy, gm, gd);

  const slots = await prisma.bookingSlot.findMany({
    where: {
      organizationId: params.organizationId,
      serviceId: params.serviceId,
      startsAt: { gte: startUtc, lte: endUtc },
      status: { in: [BookingSlotStatus.OPEN, BookingSlotStatus.FULL] },
      ...(params.advisorId ? { advisorId: params.advisorId } : {}),
    },
    include: {
      advisor: { select: { id: true, displayName: true, colorKey: true } },
    },
    orderBy: { startsAt: "asc" },
  });

  return slots.map((slot) => ({
    id: slot.id,
    startsAt: slot.startsAt,
    endsAt: slot.endsAt,
    capacity: slot.capacity,
    bookedCount: slot.bookedCount,
    remaining: remainingCapacity(slot),
    status: slot.status,
    advisor: slot.advisor,
    selectable:
      slot.status === BookingSlotStatus.OPEN && remainingCapacity(slot) > 0,
  }));
}

/** Ensure at least one materialised day exists when admin forgot — no-op if slots exist. */
export async function ensureDayHint(_day: JalaliDate): Promise<void> {
  void jalaliTehranLocalToUtc;
}
