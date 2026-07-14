/**
 * Materialize BookingSlot rows from availability rules for a Jalali date range.
 *
 * Strategy:
 * - Iterate each Jalali day in range.
 * - Match Persian weekday (Saturday-first) to BookingAvailabilityRule.weekday.
 * - Apply date exceptions (full-day closed or override window/capacity).
 * - Slice working hours by duration + buffers.
 * - Upsert by unique (organizationId, serviceId, advisorId, startsAt).
 * - Skip times before now + minimumLeadTimeMinutes.
 */

import { BookingSlotStatus } from "@/generated/prisma/enums";
import {
  jalaliMonthLength,
  jalaliTehranLocalToUtc,
  jalaliToGregorian,
  type JalaliDate,
} from "@/lib/datetime/jalali";
import {
  getPersianWeekdayIndex,
  parseLocalTimeHm,
  tehranLocalToUtc,
} from "@/lib/datetime/tehran-zone";
import { prisma } from "@/lib/prisma";

export type GenerateSlotsInput = {
  organizationId: string;
  serviceId: string;
  advisorId: string;
  from: JalaliDate;
  to: JalaliDate;
};

function nextJalaliDay(date: JalaliDate): JalaliDate {
  const len = jalaliMonthLength(date.jy, date.jm);
  if (date.jd < len) {
    return { jy: date.jy, jm: date.jm, jd: date.jd + 1 };
  }
  if (date.jm < 12) {
    return { jy: date.jy, jm: date.jm + 1, jd: 1 };
  }
  return { jy: date.jy + 1, jm: 1, jd: 1 };
}

function compareJalali(a: JalaliDate, b: JalaliDate): number {
  if (a.jy !== b.jy) return a.jy - b.jy;
  if (a.jm !== b.jm) return a.jm - b.jm;
  return a.jd - b.jd;
}

function eachJalaliDay(from: JalaliDate, to: JalaliDate): JalaliDate[] {
  const days: JalaliDate[] = [];
  let cursor = { ...from };
  for (let i = 0; i < 400; i += 1) {
    days.push({ ...cursor });
    if (compareJalali(cursor, to) >= 0) {
      break;
    }
    cursor = nextJalaliDay(cursor);
  }
  return days;
}

export async function generateSlotsForRange(
  input: GenerateSlotsInput,
): Promise<{ created: number; skipped: number }> {
  if (compareJalali(input.from, input.to) > 0) {
    return { created: 0, skipped: 0 };
  }

  const service = await prisma.bookingService.findFirst({
    where: {
      id: input.serviceId,
      organizationId: input.organizationId,
      deletedAt: null,
      isActive: true,
    },
  });
  if (!service) {
    return { created: 0, skipped: 0 };
  }

  const advisor = await prisma.bookingAdvisor.findFirst({
    where: {
      id: input.advisorId,
      organizationId: input.organizationId,
      deletedAt: null,
      isActive: true,
    },
  });
  if (!advisor) {
    return { created: 0, skipped: 0 };
  }

  const rules = await prisma.bookingAvailabilityRule.findMany({
    where: {
      organizationId: input.organizationId,
      advisorId: input.advisorId,
      isActive: true,
      OR: [{ serviceId: null }, { serviceId: input.serviceId }],
    },
  });

  const exceptions = await prisma.bookingAvailabilityException.findMany({
    where: {
      organizationId: input.organizationId,
      advisorId: input.advisorId,
      OR: [{ serviceId: null }, { serviceId: input.serviceId }],
    },
  });

  const exceptionByKey = new Map(
    exceptions.map((ex) => {
      const d = ex.localDate;
      const key = `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
      return [key, ex] as const;
    }),
  );

  const now = new Date();
  const leadMs = service.minimumLeadTimeMinutes * 60 * 1000;
  const stepMinutes =
    service.durationMinutes +
    service.bufferBeforeMinutes +
    service.bufferAfterMinutes;
  if (stepMinutes <= 0) {
    return { created: 0, skipped: 0 };
  }

  let created = 0;
  let skipped = 0;

  for (const day of eachJalaliDay(input.from, input.to)) {
    const { gy, gm, gd } = jalaliToGregorian(day.jy, day.jm, day.jd);
    const noon = tehranLocalToUtc(gy, gm, gd, 12, 0, 0);
    const weekday = getPersianWeekdayIndex(noon);
    const dayKey = `${gy}-${gm}-${gd}`;
    const exception = exceptionByKey.get(dayKey);

    if (exception?.isClosed && !exception.startLocalTime) {
      skipped += 1;
      continue;
    }

    const dayRules = rules.filter((rule) => rule.weekday === weekday);

    type Window = { start: string; end: string; capacity: number };
    const windows: Window[] = [];

    if (
      exception &&
      !exception.isClosed &&
      exception.startLocalTime &&
      exception.endLocalTime
    ) {
      windows.push({
        start: exception.startLocalTime,
        end: exception.endLocalTime,
        capacity: exception.slotCapacity ?? 1,
      });
    } else if (exception?.isClosed) {
      continue;
    } else {
      for (const rule of dayRules) {
        windows.push({
          start: rule.startLocalTime,
          end: rule.endLocalTime,
          capacity: rule.slotCapacity,
        });
      }
    }

    for (const window of windows) {
      const startHm = parseLocalTimeHm(window.start);
      const endHm = parseLocalTimeHm(window.end);
      if (!startHm || !endHm) {
        continue;
      }

      let cursorMinutes = startHm.hour * 60 + startHm.minute;
      const endMinutes = endHm.hour * 60 + endHm.minute;

      while (cursorMinutes + service.durationMinutes <= endMinutes) {
        const hour = Math.floor(cursorMinutes / 60);
        const minute = cursorMinutes % 60;
        const startsAt = jalaliTehranLocalToUtc(
          day.jy,
          day.jm,
          day.jd,
          hour,
          minute,
        );
        const endsAt = new Date(
          startsAt.getTime() + service.durationMinutes * 60 * 1000,
        );

        if (startsAt.getTime() < now.getTime() + leadMs) {
          cursorMinutes += stepMinutes;
          skipped += 1;
          continue;
        }

        const existing = await prisma.bookingSlot.findUnique({
          where: {
            organizationId_serviceId_advisorId_startsAt: {
              organizationId: input.organizationId,
              serviceId: input.serviceId,
              advisorId: input.advisorId,
              startsAt,
            },
          },
          select: { id: true, status: true },
        });

        if (existing) {
          if (existing.status !== BookingSlotStatus.CANCELLED) {
            await prisma.bookingSlot.update({
              where: { id: existing.id },
              data: {
                endsAt,
                capacity: window.capacity,
                branchId: service.branchId ?? advisor.branchId ?? null,
              },
            });
          }
          skipped += 1;
        } else {
          await prisma.bookingSlot.create({
            data: {
              organizationId: input.organizationId,
              serviceId: input.serviceId,
              advisorId: input.advisorId,
              branchId: service.branchId ?? advisor.branchId ?? null,
              startsAt,
              endsAt,
              capacity: window.capacity,
              bookedCount: 0,
              waitingCount: 0,
              status: BookingSlotStatus.OPEN,
            },
          });
          created += 1;
        }

        cursorMinutes += stepMinutes;
      }
    }
  }

  return { created, skipped };
}
