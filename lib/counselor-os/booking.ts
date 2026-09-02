/**
 * Counselor OS booking — reuses Smart Booking Engine.
 */

import { BookingMeetingType, BookingStatus } from "@/generated/prisma/enums";
import { createReservation } from "@/lib/booking/reserve";
import { generateSlotsForRange } from "@/lib/booking/generate-slots";
import { MAX_SLOT_GENERATION_DAYS } from "@/lib/booking/constants";
import { COUNSELOR_BOOKING_SERVICE_SLUG } from "@/lib/counselor-os/constants";
import { resolveCounselorBookingAdvisor } from "@/lib/counselor-os/advisor";
import type { CounselorContext } from "@/lib/counselor-os/auth";
import { prisma } from "@/lib/prisma";
import { formatJalaliDateTimeShort, utcToJalaliInTehran } from "@/lib/datetime/jalali";

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
}) {
  const service = await ensureCounselorBookingService(params.organizationId);
  const now = new Date();
  const from = utcToJalaliInTehran(now);
  const endDate = new Date(now.getTime() + MAX_SLOT_GENERATION_DAYS * 24 * 60 * 60 * 1000);
  const to = utcToJalaliInTehran(endDate);

  await generateSlotsForRange({
    organizationId: params.organizationId,
    serviceId: service.id,
    advisorId: params.advisorId,
    from,
    to,
  });

  const slots = await prisma.bookingSlot.findMany({
    where: {
      organizationId: params.organizationId,
      serviceId: service.id,
      ...(params.advisorId ? { advisorId: params.advisorId } : {}),
      startsAt: { gte: now },
      status: "OPEN",
    },
    include: { advisor: { select: { displayName: true } } },
    orderBy: { startsAt: "asc" },
    take: 80,
  });

  return slots
    .filter((s) => s.bookedCount < s.capacity)
    .map((s) => ({
      id: s.id,
      startsAtIso: s.startsAt.toISOString(),
      label: formatJalaliDateTimeShort(s.startsAt),
      advisorName: s.advisor.displayName,
      remaining: s.capacity - s.bookedCount,
      meetingTypes: service.meetingTypes,
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
}) {
  const plan = await prisma.guidancePlan.findFirst({
    where: {
      organizationId: params.organizationId,
      studentId: params.studentId,
      deletedAt: null,
    },
    orderBy: { updatedAt: "desc" },
  });

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

  const existing = await prisma.counselorAppointment.findFirst({
    where: {
      organizationId: params.organizationId,
      studentId: params.studentId,
      status: { in: ["BOOKED", "CONFIRMED"] },
      bookingReservation: {
        slot: { startsAt: { gte: new Date() } },
        status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
      },
    },
  });
  if (existing) {
    return { ok: false as const, error: "شما یک جلسه آینده دارید. ابتدا آن را لغو کنید." };
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

  await prisma.counselorAppointment.create({
    data: {
      organizationId: params.organizationId,
      studentId: params.studentId,
      counselorUserId,
      guidancePlanId: plan?.id ?? null,
      bookingReservationId: result.reservationId,
      status: "BOOKED",
    },
  });

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
