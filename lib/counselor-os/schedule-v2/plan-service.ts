/**
 * Counselor schedule v2 — plan CRUD, activate/pause, optimistic concurrency.
 */

import {
  CounselorSchedulePlanStatus,
  CounselorScheduleSessionKind,
} from "@/generated/prisma/enums";
import { resolveManagedBookingAdvisor } from "@/lib/counselor-os/advisor";
import type { CounselorContext } from "@/lib/counselor-os/auth";
import { asSessionMinutes, ymdToUtcNoon } from "@/lib/counselor-os/schedule";
import {
  dbDateToGregorianYmd,
  dbDateToJalali,
  gregorianYmdToDbDate,
  weekdayLabelForGregorianYmd,
} from "@/lib/counselor-os/schedule-v2/local-date";
import {
  cancelFutureOpenSlotsForPlan,
  materializeActivePlanSlots,
} from "@/lib/counselor-os/schedule-v2/slot-sync";
import type {
  ScheduleDayInput,
  SchedulePlanDetail,
  SchedulePlanListItem,
} from "@/lib/counselor-os/schedule-v2/types";
import {
  parseScheduleDaysJson,
  validateScheduleDays,
} from "@/lib/counselor-os/schedule-v2/validate";
import { formatJalaliDateLong } from "@/lib/datetime/jalali";
import { normalizeLocalTimeHm } from "@/lib/datetime/tehran-zone";
import { prisma } from "@/lib/prisma";

const DELETE_BLOCKED_MSG =
  "این برنامه دارای رزرو است و قابل حذف نیست؛ ابتدا آن را متوقف کنید.";

async function assertAdvisorAccess(
  ctx: CounselorContext,
  advisorId: string,
): Promise<void> {
  const advisor = await resolveManagedBookingAdvisor({ ctx, advisorId });
  if (!advisor) {
    throw new Error("دسترسی به این مشاور مجاز نیست.");
  }
}

async function planHasReservations(
  organizationId: string,
  planId: string,
): Promise<boolean> {
  const count = await prisma.bookingSlot.count({
    where: {
      organizationId,
      schedulePlanId: planId,
      bookedCount: { gt: 0 },
    },
  });
  return count > 0;
}

function mapPlanDetail(
  plan: NonNullable<Awaited<ReturnType<typeof loadPlanById>>>,
): SchedulePlanDetail {
  return {
    id: plan.id,
    advisorId: plan.advisorId,
    sessionKind: plan.sessionKind,
    status: plan.status,
    sessionMinutes: plan.sessionMinutes,
    title: plan.title,
    note: plan.note,
    version: plan.version,
    days: plan.days.map((day) => {
      const ymd = dbDateToGregorianYmd(day.localDate);
      const jalali = dbDateToJalali(day.localDate);
      const probe = ymdToUtcNoon(ymd);
      const jalaliLabel = probe ? formatJalaliDateLong(probe) : ymd;
      return {
        id: day.id,
        localDateGregorian: ymd,
        jalaliLabel,
        weekdayLabel: day.weekdayLabel ?? weekdayLabelForGregorianYmd(ymd),
        note: day.note,
        windows: day.windows.map((w) => ({
          id: w.id,
          startLocalTime: w.startLocalTime,
          endLocalTime: w.endLocalTime,
        })),
      };
    }),
  };
}

async function loadPlanById(organizationId: string, planId: string) {
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

export async function listSchedulePlans(params: {
  ctx: CounselorContext;
  advisorId: string;
  sessionKind?: CounselorScheduleSessionKind;
  status?: CounselorSchedulePlanStatus;
}): Promise<SchedulePlanListItem[]> {
  await assertAdvisorAccess(params.ctx, params.advisorId);
  const rows = await prisma.counselorSchedulePlan.findMany({
    where: {
      organizationId: params.ctx.organizationId,
      advisorId: params.advisorId,
      ...(params.sessionKind ? { sessionKind: params.sessionKind } : {}),
      ...(params.status ? { status: params.status } : {}),
    },
    include: { _count: { select: { days: true } } },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
  });
  return rows.map((row) => ({
    id: row.id,
    sessionKind: row.sessionKind,
    status: row.status,
    sessionMinutes: row.sessionMinutes,
    title: row.title,
    version: row.version,
    dayCount: row._count.days,
    slotPreviewCount: null,
    updatedAt: row.updatedAt.toISOString(),
    activatedAt: row.activatedAt?.toISOString() ?? null,
  }));
}

export async function getSchedulePlanDetail(params: {
  ctx: CounselorContext;
  planId: string;
}): Promise<SchedulePlanDetail | null> {
  const plan = await loadPlanById(params.ctx.organizationId, params.planId);
  if (!plan) return null;
  await assertAdvisorAccess(params.ctx, plan.advisorId);
  return mapPlanDetail(plan);
}

async function replacePlanDays(params: {
  organizationId: string;
  planId: string;
  days: ScheduleDayInput[];
}) {
  await prisma.counselorScheduleDay.deleteMany({
    where: { organizationId: params.organizationId, planId: params.planId },
  });
  for (let i = 0; i < params.days.length; i += 1) {
    const day = params.days[i]!;
    const localDate = gregorianYmdToDbDate(day.localDateGregorian);
    if (!localDate) {
      throw new Error("تاریخ نامعتبر است.");
    }
    const weekdayLabel = weekdayLabelForGregorianYmd(day.localDateGregorian);
    const createdDay = await prisma.counselorScheduleDay.create({
      data: {
        organizationId: params.organizationId,
        planId: params.planId,
        localDate,
        weekdayLabel,
        note: day.note?.trim() || null,
        sortOrder: i,
      },
    });
    for (let w = 0; w < day.windows.length; w += 1) {
      const window = day.windows[w]!;
      const start =
        normalizeLocalTimeHm(window.startLocalTime) ?? window.startLocalTime;
      const end =
        normalizeLocalTimeHm(window.endLocalTime) ?? window.endLocalTime;
      await prisma.counselorScheduleWindow.create({
        data: {
          organizationId: params.organizationId,
          dayId: createdDay.id,
          startLocalTime: start,
          endLocalTime: end,
          sortOrder: w,
        },
      });
    }
  }
}

export async function saveSchedulePlanDraft(params: {
  ctx: CounselorContext;
  advisorId: string;
  sessionKind: CounselorScheduleSessionKind;
  sessionMinutes: number;
  title?: string | null;
  note?: string | null;
  daysJson: string;
  planId?: string;
  expectedVersion?: number;
  idempotencyKey?: string | null;
}): Promise<{ planId: string; version: number }> {
  await assertAdvisorAccess(params.ctx, params.advisorId);
  const sessionMinutes = asSessionMinutes(params.sessionMinutes, 45);
  const days = parseScheduleDaysJson(params.daysJson);
  validateScheduleDays(days, sessionMinutes);

  if (params.idempotencyKey?.trim()) {
    const existing = await prisma.counselorSchedulePlan.findFirst({
      where: {
        organizationId: params.ctx.organizationId,
        idempotencyKey: params.idempotencyKey.trim(),
      },
    });
    if (existing) {
      return { planId: existing.id, version: existing.version };
    }
  }

  if (params.planId) {
    const current = await loadPlanById(params.ctx.organizationId, params.planId);
    if (!current) throw new Error("برنامه یافت نشد.");
    if (current.advisorId !== params.advisorId) {
      throw new Error("مشاور با برنامه همخوان نیست.");
    }
    if (current.status !== CounselorSchedulePlanStatus.DRAFT) {
      throw new Error("فقط پیش‌نویس قابل ویرایش مستقیم است؛ برنامه فعال را با احتیاط ویرایش کنید.");
    }
    if (
      params.expectedVersion != null &&
      current.version !== params.expectedVersion
    ) {
      throw new Error(
        "این برنامه هم‌زمان توسط کاربر دیگری ویرایش شده است. صفحه را تازه‌سازی کنید.",
      );
    }

    await prisma.$transaction(async (tx) => {
      const updated = await tx.counselorSchedulePlan.updateMany({
        where: {
          id: params.planId,
          organizationId: params.ctx.organizationId,
          version: current.version,
        },
        data: {
          sessionMinutes,
          title: params.title?.trim() || null,
          note: params.note?.trim() || null,
          version: { increment: 1 },
        },
      });
      if (updated.count === 0) {
        throw new Error(
          "ذخیره انجام نشد؛ نسخه برنامه تغییر کرده است. صفحه را تازه‌سازی کنید.",
        );
      }
      await replacePlanDays({
        organizationId: params.ctx.organizationId,
        planId: params.planId!,
        days,
      });
    });

    const fresh = await loadPlanById(params.ctx.organizationId, params.planId);
    return { planId: params.planId, version: fresh?.version ?? current.version + 1 };
  }

  const created = await prisma.$transaction(async (tx) => {
    const plan = await tx.counselorSchedulePlan.create({
      data: {
        organizationId: params.ctx.organizationId,
        advisorId: params.advisorId,
        sessionKind: params.sessionKind,
        status: CounselorSchedulePlanStatus.DRAFT,
        sessionMinutes,
        title: params.title?.trim() || null,
        note: params.note?.trim() || null,
        idempotencyKey: params.idempotencyKey?.trim() || null,
        createdByUserId: params.ctx.userId,
      },
    });
    await replacePlanDays({
      organizationId: params.ctx.organizationId,
      planId: plan.id,
      days,
    });
    return plan;
  });

  return { planId: created.id, version: created.version };
}

export async function updateActiveSchedulePlan(params: {
  ctx: CounselorContext;
  planId: string;
  sessionMinutes: number;
  title?: string | null;
  note?: string | null;
  daysJson: string;
  expectedVersion: number;
}): Promise<{ version: number }> {
  const current = await loadPlanById(params.ctx.organizationId, params.planId);
  if (!current) throw new Error("برنامه یافت نشد.");
  await assertAdvisorAccess(params.ctx, current.advisorId);
  if (current.status !== CounselorSchedulePlanStatus.ACTIVE) {
    throw new Error("این عملیات فقط برای برنامه فعال است.");
  }

  const sessionMinutes = asSessionMinutes(params.sessionMinutes, current.sessionMinutes);
  const days = parseScheduleDaysJson(params.daysJson);
  validateScheduleDays(days, sessionMinutes);

  if (current.version !== params.expectedVersion) {
    throw new Error(
      "این برنامه هم‌زمان ویرایش شده است. صفحه را تازه‌سازی کنید.",
    );
  }

  await prisma.$transaction(async (tx) => {
    const updated = await tx.counselorSchedulePlan.updateMany({
      where: {
        id: params.planId,
        organizationId: params.ctx.organizationId,
        version: params.expectedVersion,
      },
      data: {
        sessionMinutes,
        title: params.title?.trim() || null,
        note: params.note?.trim() || null,
        version: { increment: 1 },
      },
    });
    if (updated.count === 0) {
      throw new Error("ذخیره انجام نشد؛ نسخه برنامه تغییر کرده است.");
    }
    await replacePlanDays({
      organizationId: params.ctx.organizationId,
      planId: params.planId,
      days,
    });
  });

  await materializeActivePlanSlots({
    organizationId: params.ctx.organizationId,
    planId: params.planId,
  });

  const fresh = await loadPlanById(params.ctx.organizationId, params.planId);
  return { version: fresh?.version ?? params.expectedVersion + 1 };
}

export async function activateSchedulePlan(params: {
  ctx: CounselorContext;
  planId: string;
  expectedVersion?: number;
  idempotencyKey?: string | null;
}): Promise<void> {
  const plan = await loadPlanById(params.ctx.organizationId, params.planId);
  if (!plan) throw new Error("برنامه یافت نشد.");
  await assertAdvisorAccess(params.ctx, plan.advisorId);
  if (plan.status === CounselorSchedulePlanStatus.ACTIVE) {
    return;
  }
  if (plan.days.length === 0) {
    throw new Error("برنامه بدون روز کاری قابل فعال‌سازی نیست.");
  }
  if (
    params.expectedVersion != null &&
    plan.version !== params.expectedVersion
  ) {
    throw new Error("نسخه برنامه تغییر کرده است. صفحه را تازه‌سازی کنید.");
  }

  if (params.idempotencyKey?.trim()) {
    const dup = await prisma.counselorSchedulePlan.findFirst({
      where: {
        organizationId: params.ctx.organizationId,
        idempotencyKey: params.idempotencyKey.trim(),
        status: CounselorSchedulePlanStatus.ACTIVE,
      },
    });
    if (dup) return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.counselorSchedulePlan.updateMany({
      where: {
        organizationId: params.ctx.organizationId,
        advisorId: plan.advisorId,
        sessionKind: plan.sessionKind,
        status: CounselorSchedulePlanStatus.ACTIVE,
        NOT: { id: plan.id },
      },
      data: {
        status: CounselorSchedulePlanStatus.PAUSED,
        pausedAt: new Date(),
      },
    });

    const updated = await tx.counselorSchedulePlan.updateMany({
      where: {
        id: plan.id,
        organizationId: params.ctx.organizationId,
        version: plan.version,
      },
      data: {
        status: CounselorSchedulePlanStatus.ACTIVE,
        activatedAt: new Date(),
        pausedAt: null,
        version: { increment: 1 },
      },
    });
    if (updated.count === 0) {
      throw new Error("فعال‌سازی انجام نشد؛ نسخه برنامه تغییر کرده است.");
    }
  });

  const mat = await materializeActivePlanSlots({
    organizationId: params.ctx.organizationId,
    planId: plan.id,
  });
  if (mat.error) {
    throw new Error(mat.error);
  }
}

export async function pauseSchedulePlan(params: {
  ctx: CounselorContext;
  planId: string;
}): Promise<void> {
  const plan = await loadPlanById(params.ctx.organizationId, params.planId);
  if (!plan) throw new Error("برنامه یافت نشد.");
  await assertAdvisorAccess(params.ctx, plan.advisorId);
  if (plan.status !== CounselorSchedulePlanStatus.ACTIVE) {
    throw new Error("فقط برنامه فعال را می‌توان متوقف کرد.");
  }

  await prisma.counselorSchedulePlan.update({
    where: { id: plan.id },
    data: {
      status: CounselorSchedulePlanStatus.PAUSED,
      pausedAt: new Date(),
      version: { increment: 1 },
    },
  });

  await cancelFutureOpenSlotsForPlan({
    organizationId: params.ctx.organizationId,
    planId: plan.id,
  });
}

export async function deleteSchedulePlan(params: {
  ctx: CounselorContext;
  planId: string;
}): Promise<void> {
  const plan = await loadPlanById(params.ctx.organizationId, params.planId);
  if (!plan) throw new Error("برنامه یافت نشد.");
  await assertAdvisorAccess(params.ctx, plan.advisorId);

  if (await planHasReservations(params.ctx.organizationId, plan.id)) {
    throw new Error(DELETE_BLOCKED_MSG);
  }

  if (plan.status === CounselorSchedulePlanStatus.ACTIVE) {
    throw new Error(DELETE_BLOCKED_MSG);
  }

  await cancelFutureOpenSlotsForPlan({
    organizationId: params.ctx.organizationId,
    planId: plan.id,
  });

  await prisma.counselorSchedulePlan.delete({
    where: { id: plan.id },
  });
}

export async function copySchedulePlan(params: {
  ctx: CounselorContext;
  planId: string;
}): Promise<{ planId: string }> {
  const source = await loadPlanById(params.ctx.organizationId, params.planId);
  if (!source) throw new Error("برنامه یافت نشد.");
  await assertAdvisorAccess(params.ctx, source.advisorId);

  const days: ScheduleDayInput[] = source.days.map((d) => ({
    localDateGregorian: dbDateToGregorianYmd(d.localDate),
    note: d.note,
    windows: d.windows.map((w) => ({
      startLocalTime: w.startLocalTime,
      endLocalTime: w.endLocalTime,
    })),
  }));

  const created = await prisma.$transaction(async (tx) => {
    const plan = await tx.counselorSchedulePlan.create({
      data: {
        organizationId: params.ctx.organizationId,
        advisorId: source.advisorId,
        sessionKind: source.sessionKind,
        status: CounselorSchedulePlanStatus.DRAFT,
        sessionMinutes: source.sessionMinutes,
        title: source.title ? `${source.title} (کپی)` : "کپی برنامه",
        note: source.note,
        legacyMeta: {
          copiedFromPlanId: source.id,
        },
        createdByUserId: params.ctx.userId,
      },
    });
    await replacePlanDays({
      organizationId: params.ctx.organizationId,
      planId: plan.id,
      days,
    });
    return plan;
  });

  return { planId: created.id };
}

export { DELETE_BLOCKED_MSG };
