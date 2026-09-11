/**
 * Counselor availability editor — BookingAdvisor rules + exceptions.
 * Durations live on BookingService.settings JSON. No second calendar.
 */

import { parseBookingServiceSettings } from "@/lib/booking/service-settings";
import { resolveCounselorBookingAdvisor } from "@/lib/counselor-os/advisor";
import type { CounselorContext } from "@/lib/counselor-os/auth";
import { COUNSELOR_BOOKING_SERVICE_SLUG } from "@/lib/counselor-os/constants";
import { formatJalaliDateLong } from "@/lib/datetime/jalali";
import { parseLocalTimeHm } from "@/lib/datetime/tehran-zone";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const DEFAULT_FIRST_SESSION_MINUTES = 45;
export const DEFAULT_SECOND_SESSION_MINUTES = 60;

export type CounselorSessionDurations = {
  firstSessionMinutes: number;
  secondSessionMinutes: number;
};

export type WeeklyWindow = {
  startLocalTime: string;
  endLocalTime: string;
};

export type WeeklyDayProgram = {
  weekday: number;
  enabled: boolean;
  windows: WeeklyWindow[];
};

export type CounselorExceptionView = {
  id: string;
  localDateYmd: string;
  dateLabel: string;
  kind: "blocked" | "special";
  startLocalTime: string | null;
  endLocalTime: string | null;
  reason: string | null;
};

export type CounselorScheduleView = {
  advisorId: string;
  advisorName: string;
  firstSessionMinutes: number;
  secondSessionMinutes: number;
  validFromYmd: string;
  validUntilYmd: string;
  days: WeeklyDayProgram[];
  exceptions: CounselorExceptionView[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function asSessionMinutes(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  const rounded = Math.round(n);
  if (rounded < 15 || rounded > 180) return fallback;
  return rounded;
}

export function readCounselorSessionDurations(
  settings: unknown,
  advisorId?: string,
): CounselorSessionDurations {
  const root = isRecord(settings) ? settings : {};
  const byAdvisor = isRecord(root.counselorDurations)
    ? root.counselorDurations
    : {};
  const own =
    advisorId && isRecord(byAdvisor[advisorId]) ? byAdvisor[advisorId] : {};
  return {
    firstSessionMinutes: asSessionMinutes(
      own.firstSessionMinutes ?? root.firstSessionMinutes,
      DEFAULT_FIRST_SESSION_MINUTES,
    ),
    secondSessionMinutes: asSessionMinutes(
      own.secondSessionMinutes ?? root.secondSessionMinutes,
      DEFAULT_SECOND_SESSION_MINUTES,
    ),
  };
}

export function mergeCounselorDurationSettings(
  existing: unknown,
  advisorId: string,
  durations: CounselorSessionDurations,
): Record<string, unknown> {
  const parsed = parseBookingServiceSettings(existing);
  const extra = isRecord(existing) ? { ...existing } : {};
  const byAdvisor = isRecord(extra.counselorDurations)
    ? { ...extra.counselorDurations }
    : {};
  byAdvisor[advisorId] = {
    firstSessionMinutes: durations.firstSessionMinutes,
    secondSessionMinutes: durations.secondSessionMinutes,
  };
  return {
    ...extra,
    ...parsed,
    firstSessionMinutes: durations.firstSessionMinutes,
    secondSessionMinutes: durations.secondSessionMinutes,
    counselorDurations: byAdvisor,
  };
}

export function utcDateToYmd(date: Date): string {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

export function ymdToUtcNoon(ymd: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

export function intervalsOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart.getTime() < bEnd.getTime() && aEnd.getTime() > bStart.getTime();
}

export function slotDurationMinutes(startsAt: Date, endsAt: Date): number {
  return Math.round((endsAt.getTime() - startsAt.getTime()) / 60000);
}

function emptyDays(): WeeklyDayProgram[] {
  return Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    enabled: false,
    windows: [],
  }));
}

async function ensureService(organizationId: string) {
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
      durationMinutes: DEFAULT_FIRST_SESSION_MINUTES,
      minimumLeadTimeMinutes: 120,
      maximumAdvanceDays: 30,
      meetingTypes: ["IN_PERSON", "PHONE", "ONLINE"],
      settings: {
        autoConfirm: true,
        showRemainingCapacity: true,
        duplicateKeys: ["normalizedMobile", "service", "bookingDate"],
        firstSessionMinutes: DEFAULT_FIRST_SESSION_MINUTES,
        secondSessionMinutes: DEFAULT_SECOND_SESSION_MINUTES,
      },
    },
  });
}

export function parseWeeklyProgramJson(raw: string): WeeklyDayProgram[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("برنامه هفتگی نامعتبر است.");
  }
  if (!Array.isArray(parsed)) {
    throw new Error("برنامه هفتگی نامعتبر است.");
  }
  const days = emptyDays();
  for (const item of parsed) {
    if (!isRecord(item)) continue;
    const weekday = Number(item.weekday);
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) continue;
    const windowsRaw = Array.isArray(item.windows) ? item.windows : [];
    const windows: WeeklyWindow[] = [];
    for (const window of windowsRaw) {
      if (!isRecord(window)) continue;
      if (
        typeof window.startLocalTime !== "string" ||
        typeof window.endLocalTime !== "string"
      ) {
        continue;
      }
      windows.push({
        startLocalTime: window.startLocalTime,
        endLocalTime: window.endLocalTime,
      });
    }
    days[weekday] = {
      weekday,
      enabled: item.enabled === true && windows.length > 0,
      windows,
    };
  }
  return days;
}

export async function loadCounselorSchedule(
  ctx: CounselorContext,
): Promise<CounselorScheduleView | null> {
  const advisor = await resolveCounselorBookingAdvisor({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
  });
  if (!advisor) return null;

  const service = await ensureService(ctx.organizationId);
  const durations = readCounselorSessionDurations(service.settings, advisor.id);

  const [rules, exceptions] = await Promise.all([
    prisma.bookingAvailabilityRule.findMany({
      where: {
        organizationId: ctx.organizationId,
        advisorId: advisor.id,
        isActive: true,
        OR: [{ serviceId: null }, { serviceId: service.id }],
      },
      orderBy: [{ weekday: "asc" }, { startLocalTime: "asc" }],
    }),
    prisma.bookingAvailabilityException.findMany({
      where: {
        organizationId: ctx.organizationId,
        advisorId: advisor.id,
        OR: [{ serviceId: null }, { serviceId: service.id }],
      },
      orderBy: { localDate: "asc" },
    }),
  ]);

  const days = emptyDays();
  let validFrom: Date | null = null;
  let validUntil: Date | null = null;
  for (const rule of rules) {
    const day = days[rule.weekday];
    if (!day) continue;
    day.enabled = true;
    day.windows.push({
      startLocalTime: rule.startLocalTime,
      endLocalTime: rule.endLocalTime,
    });
    if (rule.validFrom && (!validFrom || rule.validFrom < validFrom)) {
      validFrom = rule.validFrom;
    }
    if (rule.validUntil && (!validUntil || rule.validUntil > validUntil)) {
      validUntil = rule.validUntil;
    }
  }

  return {
    advisorId: advisor.id,
    advisorName: advisor.displayName,
    firstSessionMinutes: durations.firstSessionMinutes,
    secondSessionMinutes: durations.secondSessionMinutes,
    validFromYmd: validFrom ? utcDateToYmd(validFrom) : "",
    validUntilYmd: validUntil ? utcDateToYmd(validUntil) : "",
    days,
    exceptions: exceptions.map((ex) => {
      const ymd = utcDateToYmd(ex.localDate);
      return {
        id: ex.id,
        localDateYmd: ymd,
        dateLabel: formatJalaliDateLong(ymdToUtcNoon(ymd) ?? ex.localDate),
        kind: ex.isClosed ? ("blocked" as const) : ("special" as const),
        startLocalTime: ex.startLocalTime,
        endLocalTime: ex.endLocalTime,
        reason: ex.reason,
      };
    }),
  };
}

export async function saveCounselorSchedule(input: {
  ctx: CounselorContext;
  firstSessionMinutes: number;
  secondSessionMinutes: number;
  validFromYmd: string;
  validUntilYmd: string;
  days: WeeklyDayProgram[];
}) {
  const advisor = await resolveCounselorBookingAdvisor({
    organizationId: input.ctx.organizationId,
    userId: input.ctx.userId,
  });
  if (!advisor) {
    throw new Error("پروفایل مشاور در سیستم نوبت‌دهی یافت نشد. با مدیر تماس بگیرید.");
  }

  const first = asSessionMinutes(input.firstSessionMinutes, 0);
  const second = asSessionMinutes(input.secondSessionMinutes, 0);
  if (!first || !second) {
    throw new Error("مدت جلسات باید بین ۱۵ تا ۱۸۰ دقیقه باشد.");
  }

  const validFrom = ymdToUtcNoon(input.validFromYmd);
  const validUntil = ymdToUtcNoon(input.validUntilYmd);
  if (!validFrom || !validUntil) {
    throw new Error("بازه فعال رزرو را با تاریخ شمسی مشخص کنید.");
  }
  if (validFrom.getTime() > validUntil.getTime()) {
    throw new Error("تاریخ پایان باید بعد از تاریخ شروع باشد.");
  }

  const service = await ensureService(input.ctx.organizationId);
  const rows: Array<{
    organizationId: string;
    advisorId: string;
    serviceId: string;
    weekday: number;
    startLocalTime: string;
    endLocalTime: string;
    slotCapacity: number;
    validFrom: Date;
    validUntil: Date;
    isActive: true;
  }> = [];

  for (const day of input.days) {
    if (!day.enabled) continue;
    if (!Number.isInteger(day.weekday) || day.weekday < 0 || day.weekday > 6) {
      throw new Error("روز هفته نامعتبر است.");
    }
    for (const window of day.windows) {
      const start = parseLocalTimeHm(window.startLocalTime);
      const end = parseLocalTimeHm(window.endLocalTime);
      if (!start || !end) {
        throw new Error("ساعت شروع و پایان هر بازه را کامل وارد کنید.");
      }
      if (end.hour * 60 + end.minute <= start.hour * 60 + start.minute) {
        throw new Error("ساعت پایان باید بعد از ساعت شروع باشد.");
      }
      rows.push({
        organizationId: input.ctx.organizationId,
        advisorId: advisor.id,
        serviceId: service.id,
        weekday: day.weekday,
        startLocalTime: window.startLocalTime,
        endLocalTime: window.endLocalTime,
        slotCapacity: 1,
        validFrom,
        validUntil,
        isActive: true,
      });
    }
  }

  if (rows.length === 0) {
    throw new Error("حداقل یک بازه هفتگی فعال وارد کنید.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.bookingAdvisorService.upsert({
      where: {
        organizationId_advisorId_serviceId: {
          organizationId: input.ctx.organizationId,
          advisorId: advisor.id,
          serviceId: service.id,
        },
      },
      create: {
        organizationId: input.ctx.organizationId,
        advisorId: advisor.id,
        serviceId: service.id,
      },
      update: {},
    });

    await tx.bookingAvailabilityRule.deleteMany({
      where: {
        organizationId: input.ctx.organizationId,
        advisorId: advisor.id,
        OR: [{ serviceId: null }, { serviceId: service.id }],
      },
    });

    await tx.bookingAvailabilityRule.createMany({ data: rows });

    await tx.bookingService.update({
      where: { id: service.id },
      data: {
        settings: mergeCounselorDurationSettings(service.settings, advisor.id, {
          firstSessionMinutes: first,
          secondSessionMinutes: second,
        }) as Prisma.InputJsonValue,
      },
    });
  });
}

export async function upsertCounselorDateException(params: {
  ctx: CounselorContext;
  kind: "blocked" | "special";
  localDateYmd: string;
  startLocalTime?: string;
  endLocalTime?: string;
  reason?: string;
}) {
  const advisor = await resolveCounselorBookingAdvisor({
    organizationId: params.ctx.organizationId,
    userId: params.ctx.userId,
  });
  if (!advisor) {
    throw new Error("پروفایل مشاور در سیستم نوبت‌دهی یافت نشد.");
  }

  const localDate = ymdToUtcNoon(params.localDateYmd);
  if (!localDate) {
    throw new Error("تاریخ استثنا را مشخص کنید.");
  }

  const service = await ensureService(params.ctx.organizationId);
  const isClosed = params.kind === "blocked";
  let start: string | null = null;
  let end: string | null = null;

  if (!isClosed) {
    const startHm = params.startLocalTime
      ? parseLocalTimeHm(params.startLocalTime)
      : null;
    const endHm = params.endLocalTime
      ? parseLocalTimeHm(params.endLocalTime)
      : null;
    if (!startHm || !endHm || !params.startLocalTime || !params.endLocalTime) {
      throw new Error("برای زمان ویژه، ساعت شروع و پایان لازم است.");
    }
    if (endHm.hour * 60 + endHm.minute <= startHm.hour * 60 + startHm.minute) {
      throw new Error("ساعت پایان باید بعد از ساعت شروع باشد.");
    }
    start = params.startLocalTime;
    end = params.endLocalTime;
  }

  const existing = await prisma.bookingAvailabilityException.findFirst({
    where: {
      organizationId: params.ctx.organizationId,
      advisorId: advisor.id,
      localDate,
      OR: [{ serviceId: null }, { serviceId: service.id }],
    },
  });

  const data = {
    organizationId: params.ctx.organizationId,
    advisorId: advisor.id,
    serviceId: service.id,
    localDate,
    isClosed,
    startLocalTime: start,
    endLocalTime: end,
    slotCapacity: isClosed ? null : 1,
    reason:
      params.reason?.trim() || (isClosed ? "تعطیل" : "زمان ویژه"),
  };

  if (existing) {
    return prisma.bookingAvailabilityException.update({
      where: { id: existing.id },
      data,
    });
  }
  return prisma.bookingAvailabilityException.create({ data });
}

export async function deleteCounselorDateException(params: {
  ctx: CounselorContext;
  exceptionId: string;
}) {
  const advisor = await resolveCounselorBookingAdvisor({
    organizationId: params.ctx.organizationId,
    userId: params.ctx.userId,
  });
  if (!advisor) {
    throw new Error("پروفایل مشاور یافت نشد.");
  }
  await prisma.bookingAvailabilityException.deleteMany({
    where: {
      id: params.exceptionId,
      organizationId: params.ctx.organizationId,
      advisorId: advisor.id,
    },
  });
}
