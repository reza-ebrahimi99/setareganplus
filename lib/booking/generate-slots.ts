/**
 * Materialize BookingSlot rows from availability rules for a Jalali date range.
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
import { MAX_SLOT_GENERATION_DAYS } from "@/lib/booking/constants";
import { prisma } from "@/lib/prisma";

export { MAX_SLOT_GENERATION_DAYS };

export type GenerateSlotsInput = {
  organizationId: string;
  serviceId: string;
  advisorId: string;
  from: JalaliDate;
  to: JalaliDate;
  /** When true, count only — no writes. */
  dryRun?: boolean;
};

export type GenerateSlotsResult = {
  created: number;
  existing: number;
  skipped: number;
  dayCount: number;
  error?: string;
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

export function countJalaliDaysInclusive(from: JalaliDate, to: JalaliDate): number {
  if (compareJalali(from, to) > 0) return 0;
  return eachJalaliDay(from, to).length;
}

export async function generateSlotsForRange(
  input: GenerateSlotsInput,
): Promise<GenerateSlotsResult> {
  if (compareJalali(input.from, input.to) > 0) {
    return {
      created: 0,
      existing: 0,
      skipped: 0,
      dayCount: 0,
      error: "بازه تاریخ نامعتبر است.",
    };
  }

  const dayCount = countJalaliDaysInclusive(input.from, input.to);
  if (dayCount > MAX_SLOT_GENERATION_DAYS) {
    return {
      created: 0,
      existing: 0,
      skipped: 0,
      dayCount,
      error: `حداکثر بازه تولید نوبت ${MAX_SLOT_GENERATION_DAYS} روز است.`,
    };
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
    return {
      created: 0,
      existing: 0,
      skipped: 0,
      dayCount,
      error: "خدمت فعال یافت نشد.",
    };
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
    return {
      created: 0,
      existing: 0,
      skipped: 0,
      dayCount,
      error: "مشاور فعال یافت نشد.",
    };
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
    return {
      created: 0,
      existing: 0,
      skipped: 0,
      dayCount,
      error: "مدت جلسه و بافر نامعتبر است.",
    };
  }

  let created = 0;
  let existing = 0;
  let skipped = 0;
  const dryRun = input.dryRun === true;

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

    const dayRules = rules.filter((rule) => {
      if (rule.weekday !== weekday) return false;
      if (rule.validFrom && noon.getTime() < rule.validFrom.getTime()) {
        return false;
      }
      if (rule.validUntil && noon.getTime() > rule.validUntil.getTime()) {
        return false;
      }
      return true;
    });

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
      skipped += 1;
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
        skipped += 1;
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

        const found = await prisma.bookingSlot.findUnique({
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

        if (found) {
          existing += 1;
          if (!dryRun && found.status !== BookingSlotStatus.CANCELLED) {
            await prisma.bookingSlot.update({
              where: { id: found.id },
              data: {
                endsAt,
                capacity: window.capacity,
                branchId: service.branchId ?? advisor.branchId ?? null,
              },
            });
          }
        } else if (dryRun) {
          created += 1;
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

  return { created, existing, skipped, dayCount };
}
