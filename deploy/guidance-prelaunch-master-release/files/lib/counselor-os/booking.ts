/**
 * Counselor OS booking — reuses Smart Booking Engine.
 */

import { BookingMeetingType, BookingStatus } from "@/generated/prisma/enums";
import { cancelReservation } from "@/lib/booking/manage-reservation";
import { createReservation } from "@/lib/booking/reserve";
import { generateSlotsForRange } from "@/lib/booking/generate-slots";
import { MAX_SLOT_GENERATION_DAYS } from "@/lib/booking/constants";
import { COUNSELOR_BOOKING_SERVICE_SLUG } from "@/lib/counselor-os/constants";
import { resolveCounselorBookingAdvisor } from "@/lib/counselor-os/advisor";
import type { CounselorContext } from "@/lib/counselor-os/auth";
import {
  daysToWindowOverride,
  intervalsOverlap,
  readCounselorSessionDurations,
  readStoredPrograms,
  refreshCounselorGeneratedSlots,
  slotDurationMinutes,
  utcDateToYmd,
  ymdToUtcNoon,
} from "@/lib/counselor-os/schedule";
import { slotMatchesProgram } from "@/lib/counselor-os/schedule-windows";
import { prisma } from "@/lib/prisma";
import {
  formatJalaliDateTimeLabel,
  formatJalaliDateTimeShort,
  PERSIAN_MONTHS,
  PERSIAN_WEEKDAYS,
  utcToJalaliInTehran,
} from "@/lib/datetime/jalali";
import {
  formatTehranTime24,
  getPersianWeekdayIndex,
  getTehranParts,
} from "@/lib/datetime/tehran-zone";
import { toPersianDigits } from "@/lib/persian";
import {
  APPOINTMENT_PURPOSE,
  type AppointmentPurpose,
} from "@/lib/guidance/journey-v2/constants";

export async function ensureCounselorBookingService(organizationId: string) {
  const existing = await prisma.bookingService.findFirst({
    where: {
      organizationId,
      slug: COUNSELOR_BOOKING_SERVICE_SLUG,
      deletedAt: null,
    },
  });
  if (existing) return existing;

  return prisma.bookingService.create({
    data: {
      organizationId,
      slug: COUNSELOR_BOOKING_SERVICE_SLUG,
      title: "جلسه مشاوره انتخاب رشته",
      description: "رزرو جلسه مشاوره با مشاور انتخاب رشته",
      durationMinutes: 45,
      minimumLeadTimeMinutes: 120,
      maximumAdvanceDays: 30,
      meetingTypes: ["IN_PERSON", "PHONE", "ONLINE"],
      settings: {
        autoConfirm: true,
        showRemainingCapacity: true,
        duplicateKeys: ["normalizedMobile", "service", "bookingDate"],
      },
    },
  });
}

export async function loadCounselorAvailableSlots(params: {
  organizationId: string;
  advisorId: string;
  purpose?: AppointmentPurpose | null;
}) {
  const service = await ensureCounselorBookingService(params.organizationId);
  const durations = readCounselorSessionDurations(
    service.settings,
    params.advisorId,
  );
  const durationMinutes =
    params.purpose === APPOINTMENT_PURPOSE.SECOND_SESSION
      ? durations.secondSessionMinutes
      : durations.firstSessionMinutes;

  const now = new Date();
  const horizonDays = Math.min(
    MAX_SLOT_GENERATION_DAYS,
    Math.max(1, service.maximumAdvanceDays),
  );
  const endDate = new Date(now.getTime() + horizonDays * 24 * 60 * 60 * 1000);
  const from = utcToJalaliInTehran(now);
  const to = utcToJalaliInTehran(endDate);
  const stored = readStoredPrograms(service.settings, params.advisorId);
  const programDays =
    params.purpose === APPOINTMENT_PURPOSE.SECOND_SESSION
      ? stored?.secondDays
      : stored?.firstDays;
  const fromYmd =
    params.purpose === APPOINTMENT_PURPOSE.SECOND_SESSION
      ? stored?.secondValidFromYmd
      : stored?.firstValidFromYmd;
  const untilYmd =
    params.purpose === APPOINTMENT_PURPOSE.SECOND_SESSION
      ? stored?.secondValidUntilYmd
      : stored?.firstValidUntilYmd;
  const rangeFrom = ymdToUtcNoon(fromYmd ?? "") ?? now;
  const rangeUntil = ymdToUtcNoon(untilYmd ?? "") ?? endDate;
  const windowsOverride =
    programDays && programDays.some((day) => day.enabled)
      ? daysToWindowOverride(programDays, rangeFrom, rangeUntil)
      : undefined;

  await generateSlotsForRange({
    organizationId: params.organizationId,
    serviceId: service.id,
    advisorId: params.advisorId,
    from,
    to,
    durationMinutes,
    exceptionWindows: "append",
    windowsOverride:
      windowsOverride && windowsOverride.length > 0 ? windowsOverride : undefined,
  });

  const slots = await prisma.bookingSlot.findMany({
    where: {
      organizationId: params.organizationId,
      serviceId: service.id,
      advisorId: params.advisorId,
      startsAt: { gte: now, lte: endDate },
      status: "OPEN",
    },
    include: { advisor: { select: { displayName: true } } },
    orderBy: { startsAt: "asc" },
    take: 160,
  });

  const occupied = await prisma.bookingReservation.findMany({
    where: {
      organizationId: params.organizationId,
      status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
      slot: {
        advisorId: params.advisorId,
        startsAt: { lt: endDate },
        endsAt: { gt: now },
      },
    },
    select: {
      slotId: true,
      slot: { select: { startsAt: true, endsAt: true } },
    },
  });

  return slots
    .filter((slot) => {
      if (slot.bookedCount >= slot.capacity) return false;
      if (slotDurationMinutes(slot.startsAt, slot.endsAt) !== durationMinutes) {
        return false;
      }
      const tehran = getTehranParts(slot.startsAt);
      const ymd = `${tehran.year}-${String(tehran.month).padStart(2, "0")}-${String(tehran.day).padStart(2, "0")}`;
      if (
        !slotMatchesProgram({
          startMinutes: tehran.hour * 60 + tehran.minute,
          durationMinutes,
          weekday: getPersianWeekdayIndex(slot.startsAt),
          ymd,
          days: programDays,
          fromYmd,
          untilYmd,
        })
      ) {
        return false;
      }
      return !occupied.some(
        (row) =>
          row.slotId !== slot.id &&
          intervalsOverlap(
            slot.startsAt,
            slot.endsAt,
            row.slot.startsAt,
            row.slot.endsAt,
          ),
      );
    })
    .slice(0, 80)
    .map((slot) => ({
      id: slot.id,
      startsAtIso: slot.startsAt.toISOString(),
      endsAtIso: slot.endsAt.toISOString(),
      label: formatJalaliDateTimeLabel(slot.startsAt, slot.endsAt),
      advisorName: slot.advisor.displayName,
      remaining: slot.capacity - slot.bookedCount,
      meetingTypes: service.meetingTypes,
      durationMinutes,
    }));
}

export async function bookCounselorSlotForStudent(params: {
  organizationId: string;
  studentId: string;
  userId: string;
  slotId: string;
  firstName: string;
  lastName: string;
  mobile: string;
  meetingType?: BookingMeetingType;
  purpose?: string | null;
}) {
  const plan = await prisma.guidancePlan.findFirst({
    where: {
      organizationId: params.organizationId,
      studentId: params.studentId,
      deletedAt: null,
      journeyVersion: 2,
    },
    orderBy: { updatedAt: "desc" },
  });
  if (params.purpose && !plan) {
    return { ok: false as const, error: "پرونده انتخاب رشته یافت نشد." };
  }

  const slot = await prisma.bookingSlot.findFirst({
    where: {
      id: params.slotId,
      organizationId: params.organizationId,
    },
    include: { advisor: true },
  });
  if (!slot || slot.bookedCount >= slot.capacity) {
    return { ok: false as const, error: "این زمان دیگر در دسترس نیست." };
  }

  const service = await ensureCounselorBookingService(params.organizationId);
  if (slot.serviceId !== service.id) {
    return { ok: false as const, error: "این زمان برای جلسه مشاوره معتبر نیست." };
  }
  if (params.purpose) {
    const durations = readCounselorSessionDurations(
      service.settings,
      slot.advisorId,
    );
    const expected =
      params.purpose === APPOINTMENT_PURPOSE.SECOND_SESSION
        ? durations.secondSessionMinutes
        : durations.firstSessionMinutes;
    if (slotDurationMinutes(slot.startsAt, slot.endsAt) !== expected) {
      return {
        ok: false as const,
        error: "این زمان برای این نوع جلسه معتبر نیست.",
      };
    }
  }

  const overlapping = await prisma.bookingReservation.findFirst({
    where: {
      organizationId: params.organizationId,
      status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
      slot: {
        advisorId: slot.advisorId,
        startsAt: { lt: slot.endsAt },
        endsAt: { gt: slot.startsAt },
        NOT: { id: slot.id },
      },
    },
    select: { id: true },
  });
  if (overlapping) {
    return {
      ok: false as const,
      error: "این بازه با نوبت دیگری تداخل دارد.",
    };
  }

  const existing = await prisma.counselorAppointment.findFirst({
    where: {
      organizationId: params.organizationId,
      studentId: params.studentId,
      status: { in: ["BOOKED", "CONFIRMED"] },
      ...(params.purpose
        ? { purpose: params.purpose }
        : { purpose: null }),
      bookingReservation: {
        slot: { startsAt: { gte: new Date() } },
        status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
      },
    },
  });
  if (existing) {
    return {
      ok: false as const,
      error: params.purpose
        ? "برای این جلسه یک نوبت فعال دارید. ابتدا آن را لغو یا جابه‌جا کنید."
        : "شما یک جلسه آینده دارید. ابتدا آن را لغو کنید.",
    };
  }

  const result = await createReservation({
    organizationId: params.organizationId,
    slotId: params.slotId,
    firstName: params.firstName,
    lastName: params.lastName,
    mobile: params.mobile,
    meetingType: params.meetingType,
  });

  if (!result.ok) {
    return { ok: false as const, error: result.error };
  }

  const counselorUserId = slot.advisor.userId ?? params.userId;

  try {
    await prisma.counselorAppointment.create({
      data: {
        organizationId: params.organizationId,
        studentId: params.studentId,
        counselorUserId,
        guidancePlanId: plan?.id ?? null,
        bookingReservationId: result.reservationId,
        status: "BOOKED",
        purpose: params.purpose ?? null,
      },
    });
  } catch {
    await cancelReservation({
      organizationId: params.organizationId,
      reservationId: result.reservationId,
    }).catch(() => undefined);
    return {
      ok: false as const,
      error: "ثبت نوبت مشاوره انجام نشد. رزرو لغو شد.",
    };
  }

  return { ok: true as const, trackingCode: result.trackingCode };
}

export async function loadStudentUpcomingAppointment(params: {
  organizationId: string;
  studentId: string;
}) {
  const appt = await prisma.counselorAppointment.findFirst({
    where: {
      organizationId: params.organizationId,
      studentId: params.studentId,
      status: { in: ["BOOKED", "CONFIRMED"] },
      bookingReservation: {
        slot: { startsAt: { gte: new Date() } },
        status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
      },
    },
    include: {
      bookingReservation: {
        include: { slot: { include: { advisor: true } } },
      },
    },
    orderBy: { createdAt: "asc" },
  });
  if (!appt) return null;

  return {
    id: appt.id,
    whenLabel: formatJalaliDateTimeShort(appt.bookingReservation.slot.startsAt),
    advisorName: appt.bookingReservation.slot.advisor.displayName,
    status: appt.status,
    meetingType: appt.bookingReservation.meetingType,
  };
}

export async function createCounselorAvailabilityRule(params: {
  ctx: CounselorContext;
  weekday: number;
  startLocalTime: string;
  endLocalTime: string;
  slotCapacity?: number;
}) {
  const advisor = await resolveCounselorBookingAdvisor({
    organizationId: params.ctx.organizationId,
    userId: params.ctx.userId,
  });
  if (!advisor) {
    throw new Error("پروفایل مشاور در سیستم نوبت‌دهی یافت نشد. با مدیر تماس بگیرید.");
  }

  const service = await ensureCounselorBookingService(params.ctx.organizationId);

  await prisma.bookingAdvisorService.upsert({
    where: {
      organizationId_advisorId_serviceId: {
        organizationId: params.ctx.organizationId,
        advisorId: advisor.id,
        serviceId: service.id,
      },
    },
    create: {
      organizationId: params.ctx.organizationId,
      advisorId: advisor.id,
      serviceId: service.id,
    },
    update: {},
  });

  return prisma.bookingAvailabilityRule.create({
    data: {
      organizationId: params.ctx.organizationId,
      advisorId: advisor.id,
      serviceId: service.id,
      weekday: params.weekday,
      startLocalTime: params.startLocalTime,
      endLocalTime: params.endLocalTime,
      slotCapacity: params.slotCapacity ?? 1,
      isActive: true,
    },
  });
}

export async function listCounselorAvailabilityRules(ctx: CounselorContext) {
  const advisor = await resolveCounselorBookingAdvisor({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
  });
  if (!advisor) return [];

  return prisma.bookingAvailabilityRule.findMany({
    where: {
      organizationId: ctx.organizationId,
      advisorId: advisor.id,
      isActive: true,
    },
    orderBy: [{ weekday: "asc" }, { startLocalTime: "asc" }],
  });
}

export type CounselorCalendarSlotView = {
  id: string;
  startLabel: string;
  endLabel: string;
  rangeLabel: string;
  status: "free" | "booked";
  statusLabel: string;
  sessionLabel: string;
  sessionKind: "FIRST_SESSION" | "SECOND_SESSION" | "OTHER";
  durationMinutes: number;
};

export type CounselorCalendarDayView = {
  key: string;
  heading: string;
  slots: CounselorCalendarSlotView[];
};

export type CounselorCalendarPreview = {
  firstDays: CounselorCalendarDayView[];
  secondDays: CounselorCalendarDayView[];
};

export async function listCounselorCalendarDays(params: {
  organizationId: string;
  advisorId: string;
  validFromYmd?: string;
  validUntilYmd?: string;
  secondValidFromYmd?: string;
  secondValidUntilYmd?: string;
}): Promise<CounselorCalendarPreview> {
  const service = await ensureCounselorBookingService(params.organizationId);
  const now = new Date();
  const horizon = new Date(now.getTime() + MAX_SLOT_GENERATION_DAYS * 24 * 60 * 60 * 1000);

  await refreshCounselorGeneratedSlots({
    organizationId: params.organizationId,
    advisorId: params.advisorId,
    validFromYmd: params.validFromYmd ?? utcDateToYmd(now),
    validUntilYmd: params.validUntilYmd ?? utcDateToYmd(horizon),
    secondValidFromYmd: params.secondValidFromYmd,
    secondValidUntilYmd: params.secondValidUntilYmd,
  });

  const durations = readCounselorSessionDurations(service.settings, params.advisorId);
  const slots = await prisma.bookingSlot.findMany({
    where: {
      organizationId: params.organizationId,
      serviceId: service.id,
      advisorId: params.advisorId,
      startsAt: { gte: now, lte: horizon },
      status: { in: ["OPEN", "FULL"] },
    },
    orderBy: { startsAt: "asc" },
    take: 240,
  });

  function pushSlot(
    bucket: Map<string, CounselorCalendarDayView>,
    slot: (typeof slots)[number],
    sessionKind: CounselorCalendarSlotView["sessionKind"],
    sessionLabel: string,
    duration: number,
  ) {
    const jalali = utcToJalaliInTehran(slot.startsAt);
    const weekday = PERSIAN_WEEKDAYS[getPersianWeekdayIndex(slot.startsAt)];
    const month = PERSIAN_MONTHS[jalali.jm - 1];
    const key = `${jalali.jy}-${jalali.jm}-${jalali.jd}`;
    const heading = toPersianDigits(`${weekday} ${jalali.jd} ${month}`);
    const booked = slot.bookedCount > 0 || slot.status === "FULL";
    const day = bucket.get(key) ?? { key, heading, slots: [] };
    day.slots.push({
      id: slot.id,
      startLabel: toPersianDigits(formatTehranTime24(slot.startsAt)),
      endLabel: toPersianDigits(formatTehranTime24(slot.endsAt)),
      rangeLabel: `${toPersianDigits(formatTehranTime24(slot.startsAt))}–${toPersianDigits(formatTehranTime24(slot.endsAt))}`,
      status: booked ? "booked" : "free",
      statusLabel: booked ? "رزرو شده" : "آزاد",
      sessionLabel,
      sessionKind,
      durationMinutes: duration,
    });
    bucket.set(key, day);
  }

  const firstDays = new Map<string, CounselorCalendarDayView>();
  const secondDays = new Map<string, CounselorCalendarDayView>();
  for (const slot of slots) {
    const duration = slotDurationMinutes(slot.startsAt, slot.endsAt);
    if (duration === durations.firstSessionMinutes) {
      pushSlot(
        firstDays,
        slot,
        "FIRST_SESSION",
        `جلسه اول انتخاب رشته · ${toPersianDigits(duration)} دقیقه`,
        duration,
      );
    } else if (duration === durations.secondSessionMinutes) {
      pushSlot(
        secondDays,
        slot,
        "SECOND_SESSION",
        `جلسه دوم انتخاب رشته · ${toPersianDigits(duration)} دقیقه`,
        duration,
      );
    }
  }

  return {
    firstDays: [...firstDays.values()],
    secondDays: [...secondDays.values()],
  };
}
