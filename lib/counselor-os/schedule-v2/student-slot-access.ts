import {
  CounselorSchedulePlanStatus,
  type CounselorScheduleSessionKind,
} from "@/generated/prisma/enums";
import { planLegacyArchivedAt } from "@/lib/counselor-os/schedule-v2/plan-title";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/** Prisma filter: future OPEN slots bookable on counselor v2 (ACTIVE plan only). */
export function bookableCounselorSlotWhere(params: {
  organizationId: string;
  serviceId: string;
  advisorId: string;
  now: Date;
  endDate: Date;
  activePlanId: string | null;
  allowLegacyNullSlots?: boolean;
}): Prisma.BookingSlotWhereInput {
  const base: Prisma.BookingSlotWhereInput = {
    organizationId: params.organizationId,
    serviceId: params.serviceId,
    advisorId: params.advisorId,
    startsAt: { gte: params.now, lte: params.endDate },
    status: "OPEN",
  };

  if (params.activePlanId) {
    return {
      ...base,
      schedulePlanId: params.activePlanId,
      schedulePlan: { status: CounselorSchedulePlanStatus.ACTIVE },
    };
  }

  if (params.allowLegacyNullSlots === false) {
    return {
      ...base,
      id: "__no_bookable_counselor_slots__",
    };
  }

  return {
    ...base,
    schedulePlanId: null,
  };
}

export async function assertSlotBookableForCounselorSession(params: {
  organizationId: string;
  slotId: string;
  advisorId: string;
  sessionKind: CounselorScheduleSessionKind;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const slot = await prisma.bookingSlot.findFirst({
    where: {
      id: params.slotId,
      organizationId: params.organizationId,
      advisorId: params.advisorId,
    },
    select: {
      id: true,
      status: true,
      startsAt: true,
      schedulePlanId: true,
      bookedCount: true,
      capacity: true,
    },
  });
  if (!slot) {
    return { ok: false, error: "این زمان دیگر در دسترس نیست." };
  }
  if (slot.status !== "OPEN" || slot.bookedCount >= slot.capacity) {
    return { ok: false, error: "این زمان دیگر در دسترس نیست." };
  }
  if (slot.startsAt < new Date()) {
    return { ok: false, error: "این زمان گذشته است." };
  }

  if (!slot.schedulePlanId) {
    return { ok: true };
  }

  const plan = await prisma.counselorSchedulePlan.findFirst({
    where: {
      id: slot.schedulePlanId,
      organizationId: params.organizationId,
      advisorId: params.advisorId,
      sessionKind: params.sessionKind,
      status: CounselorSchedulePlanStatus.ACTIVE,
    },
    select: { id: true, legacyMeta: true },
  });
  if (!plan || planLegacyArchivedAt(plan.legacyMeta)) {
    return { ok: false, error: "این زمان برای رزرو فعال نیست." };
  }
  return { ok: true };
}
