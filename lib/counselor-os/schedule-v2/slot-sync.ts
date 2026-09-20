import { BookingSlotStatus } from "@/generated/prisma/enums";
import { generateSlotsForRange } from "@/lib/booking/generate-slots";
import { COUNSELOR_BOOKING_SERVICE_SLUG } from "@/lib/counselor-os/constants";
import {
  formatTehranTime24,
  getTehranParts,
  parseLocalTimeHm,
} from "@/lib/datetime/tehran-zone";
import { prisma } from "@/lib/prisma";
import {
  dbDateToGregorianYmd,
  dbDateToJalali,
  gregorianYmdToDbDate,
} from "@/lib/counselor-os/schedule-v2/local-date";
import { slotDurationMinutes } from "@/lib/counselor-os/schedule";
import { slotFitsSingleWindow } from "@/lib/counselor-os/schedule-windows";

async function loadPlanForSlotSync(planId: string, organizationId: string) {
  return prisma.counselorSchedulePlan.findFirst({
    where: { id: planId, organizationId },
    include: {
      days: {
        include: { windows: { orderBy: { sortOrder: "asc" } } },
        orderBy: { localDate: "asc" },
      },
    },
  });
}

function buildExplicitDays(
  dayRows: Array<{
    localDateGregorian: string;
    windows: Array<{ startLocalTime: string; endLocalTime: string }>;
    schedulePlanId?: string;
    scheduleDayId?: string;
    windowIds?: string[];
  }>,
) {
  const explicit = [];
  for (const day of dayRows) {
    const db = gregorianYmdToDbDate(day.localDateGregorian);
    const jalali = db ? dbDateToJalali(db) : null;
    if (!jalali) continue;
    explicit.push({
      jalali,
      windows: day.windows.map((w, index) => ({
        startLocalTime: w.startLocalTime,
        endLocalTime: w.endLocalTime,
        schedulePlanId: day.schedulePlanId,
        scheduleDayId: day.scheduleDayId,
        scheduleWindowId: day.windowIds?.[index],
      })),
    });
  }
  return explicit;
}

export async function previewPlanSlots(params: {
  organizationId: string;
  advisorId: string;
  sessionMinutes: number;
  planId?: string;
  days?: Array<{
    localDateGregorian: string;
    windows: Array<{ startLocalTime: string; endLocalTime: string }>;
  }>;
}): Promise<{ totalSlots: number; error?: string }> {
  const service = await prisma.bookingService.findFirst({
    where: {
      organizationId: params.organizationId,
      slug: COUNSELOR_BOOKING_SERVICE_SLUG,
      deletedAt: null,
    },
  });
  if (!service) {
    return { totalSlots: 0, error: "خدمت مشاوره یافت نشد." };
  }

  let dayRows = params.days;
  if (!dayRows && params.planId) {
    const plan = await loadPlanForSlotSync(params.planId, params.organizationId);
    if (!plan) return { totalSlots: 0, error: "برنامه یافت نشد." };
    dayRows = plan.days.map((d) => ({
      localDateGregorian: dbDateToGregorianYmd(d.localDate),
      windows: d.windows.map((w) => ({
        startLocalTime: w.startLocalTime,
        endLocalTime: w.endLocalTime,
      })),
    }));
  }
  if (!dayRows || dayRows.length === 0) {
    return { totalSlots: 0, error: "روز کاری برای پیش‌نمایش وجود ندارد." };
  }

  const explicit = buildExplicitDays(dayRows);
  if (explicit.length === 0) {
    return { totalSlots: 0, error: "تاریخ‌ها نامعتبر هستند." };
  }

  const from = explicit[0]!.jalali;
  const to = explicit[explicit.length - 1]!.jalali;
  const { computeSchedulePreview } = await import(
    "@/lib/counselor-os/schedule-v2/preview-compute"
  );
  const computed = computeSchedulePreview({
    days: dayRows.map((d) => ({
      localDateGregorian: d.localDateGregorian,
      windows: d.windows,
    })),
    sessionMinutes: params.sessionMinutes,
  });
  if (!computed.ok) {
    return { totalSlots: 0, error: computed.error };
  }
  return { totalSlots: computed.totalSlots };
}

export async function materializeActivePlanSlots(params: {
  organizationId: string;
  planId: string;
}): Promise<{ created: number; error?: string }> {
  const plan = await loadPlanForSlotSync(params.planId, params.organizationId);
  if (!plan || plan.status !== "ACTIVE") {
    return { created: 0, error: "برنامه فعال یافت نشد." };
  }

  const service = await prisma.bookingService.findFirst({
    where: {
      organizationId: params.organizationId,
      slug: COUNSELOR_BOOKING_SERVICE_SLUG,
      deletedAt: null,
    },
  });
  if (!service) {
    return { created: 0, error: "خدمت مشاوره یافت نشد." };
  }

  const dayRows = plan.days.map((d) => ({
    localDateGregorian: dbDateToGregorianYmd(d.localDate),
    windows: d.windows.map((w) => ({
      startLocalTime: w.startLocalTime,
      endLocalTime: w.endLocalTime,
    })),
    schedulePlanId: plan.id,
    scheduleDayId: d.id,
    windowIds: d.windows.map((w) => w.id),
  }));

  const explicitDays = buildExplicitDays(dayRows);
  if (explicitDays.length === 0) {
    return { created: 0 };
  }

  const from = explicitDays[0]!.jalali;
  const to = explicitDays[explicitDays.length - 1]!.jalali;
  const gen = await generateSlotsForRange({
    organizationId: params.organizationId,
    serviceId: service.id,
    advisorId: plan.advisorId,
    from,
    to,
    durationMinutes: plan.sessionMinutes,
    slotStepMinutes: plan.sessionMinutes,
    explicitDays,
  });
  if (gen.error) {
    return { created: 0, error: gen.error };
  }

  await reconcileOpenPlanSlots(plan);
  return { created: gen.created };
}

async function reconcileOpenPlanSlots(
  plan: NonNullable<Awaited<ReturnType<typeof loadPlanForSlotSync>>>,
): Promise<void> {
  const now = new Date();
  const openSlots = await prisma.bookingSlot.findMany({
    where: {
      organizationId: plan.organizationId,
      schedulePlanId: plan.id,
      startsAt: { gte: now },
      bookedCount: 0,
      status: BookingSlotStatus.OPEN,
    },
    select: { id: true, startsAt: true, endsAt: true },
  });

  const dayByYmd = new Map(
    plan.days.map((d) => [dbDateToGregorianYmd(d.localDate), d] as const),
  );

  const staleIds: string[] = [];
  for (const slot of openSlots) {
    const duration = slotDurationMinutes(slot.startsAt, slot.endsAt);
    if (duration !== plan.sessionMinutes) {
      staleIds.push(slot.id);
      continue;
    }
    const tehran = getTehranParts(slot.startsAt);
    const ymd = `${tehran.year}-${String(tehran.month).padStart(2, "0")}-${String(tehran.day).padStart(2, "0")}`;
    const day = dayByYmd.get(ymd);
    if (!day) {
      staleIds.push(slot.id);
      continue;
    }
    const hm = parseLocalTimeHm(formatTehranTime24(slot.startsAt));
    if (!hm) {
      staleIds.push(slot.id);
      continue;
    }
    const startMinutes = hm.hour * 60 + hm.minute;
    const fits = slotFitsSingleWindow({
      startMinutes,
      durationMinutes: plan.sessionMinutes,
      windows: day.windows.map((w) => ({
        startLocalTime: w.startLocalTime,
        endLocalTime: w.endLocalTime,
      })),
    });
    if (!fits) staleIds.push(slot.id);
  }

  if (staleIds.length > 0) {
    await prisma.bookingSlot.updateMany({
      where: {
        id: { in: staleIds },
        organizationId: plan.organizationId,
        bookedCount: 0,
      },
      data: { status: BookingSlotStatus.CANCELLED },
    });
  }
}

export async function cancelFutureOpenSlotsForPlan(params: {
  organizationId: string;
  planId: string;
}): Promise<number> {
  const now = new Date();
  const result = await prisma.bookingSlot.updateMany({
    where: {
      organizationId: params.organizationId,
      schedulePlanId: params.planId,
      startsAt: { gte: now },
      bookedCount: 0,
      status: BookingSlotStatus.OPEN,
    },
    data: { status: BookingSlotStatus.CANCELLED },
  });
  return result.count;
}
