/**
 * Counselor availability editor — BookingAdvisor rules + exceptions.
 * Durations live on BookingService.settings JSON. No second calendar.
 */

import { generateSlotsForRange } from "@/lib/booking/generate-slots";
import { MAX_SLOT_GENERATION_DAYS } from "@/lib/booking/constants";
import { parseBookingServiceSettings } from "@/lib/booking/service-settings";
import { resolveManagedBookingAdvisor } from "@/lib/counselor-os/advisor";
import type { CounselorContext } from "@/lib/counselor-os/auth";
import { COUNSELOR_BOOKING_SERVICE_SLUG } from "@/lib/counselor-os/constants";
import {
  formatJalaliDateLong,
  jalaliMonthLength,
  utcToJalaliInTehran,
} from "@/lib/datetime/jalali";
import { jalaliPartsToGregorianDateOnly } from "@/lib/datetime/jalali-form";
import {
  formatTehranTime24,
  getPersianWeekdayIndex,
  getTehranParts,
  parseLocalTimeHm,
} from "@/lib/datetime/tehran-zone";
import { BookingSlotStatus } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  assertDayWindowsValid,
} from "@/lib/counselor-os/schedule-windows";
import { assertProgramsDoNotOverlap } from "@/lib/counselor-os/schedule-conflict";

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
  firstDays: WeeklyDayProgram[];
  secondDays: WeeklyDayProgram[];
  firstValidFromYmd: string;
  firstValidUntilYmd: string;
  secondValidFromYmd: string;
  secondValidUntilYmd: string;
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

function cloneDays(days: WeeklyDayProgram[]): WeeklyDayProgram[] {
  return days.map((day) => ({
    weekday: day.weekday,
    enabled: day.enabled,
    windows: day.windows.map((window) => ({ ...window })),
  }));
}

export function daysToWindowOverride(
  days: WeeklyDayProgram[],
  validFrom: Date,
  validUntil: Date,
) {
  const rows: Array<{
    weekday: number;
    startLocalTime: string;
    endLocalTime: string;
    validFrom: Date;
    validUntil: Date;
    slotCapacity: number;
  }> = [];
  for (const day of days) {
    if (!day.enabled) continue;
    for (const window of day.windows) {
      rows.push({
        weekday: day.weekday,
        startLocalTime: window.startLocalTime,
        endLocalTime: window.endLocalTime,
        validFrom,
        validUntil,
        slotCapacity: 1,
      });
    }
  }
  return rows;
}

export function readStoredPrograms(
  settings: unknown,
  advisorId: string,
): {
  firstDays?: WeeklyDayProgram[];
  secondDays?: WeeklyDayProgram[];
  firstValidFromYmd?: string;
  firstValidUntilYmd?: string;
  secondValidFromYmd?: string;
  secondValidUntilYmd?: string;
} | null {
  const root = isRecord(settings) ? settings : {};
  const byAdvisor = isRecord(root.counselorPrograms) ? root.counselorPrograms : {};
  const own = advisorId && isRecord(byAdvisor[advisorId]) ? byAdvisor[advisorId] : null;
  if (!own) return null;
  const first = isRecord(own.first) ? own.first : null;
  const second = isRecord(own.second) ? own.second : null;
  return {
    firstDays: Array.isArray(first?.days) ? parseWeeklyProgramJson(JSON.stringify(first.days)) : undefined,
    secondDays: Array.isArray(second?.days) ? parseWeeklyProgramJson(JSON.stringify(second.days)) : undefined,
    firstValidFromYmd: typeof first?.validFromYmd === "string" ? first.validFromYmd : undefined,
    firstValidUntilYmd: typeof first?.validUntilYmd === "string" ? first.validUntilYmd : undefined,
    secondValidFromYmd: typeof second?.validFromYmd === "string" ? second.validFromYmd : undefined,
    secondValidUntilYmd: typeof second?.validUntilYmd === "string" ? second.validUntilYmd : undefined,
  };
}

export function mergeCounselorProgramSettings(
  existing: unknown,
  advisorId: string,
  programs: {
    firstSessionMinutes: number;
    secondSessionMinutes: number;
    firstValidFromYmd: string;
    firstValidUntilYmd: string;
    secondValidFromYmd: string;
    secondValidUntilYmd: string;
    firstDays: WeeklyDayProgram[];
    secondDays: WeeklyDayProgram[];
  },
): Record<string, unknown> {
  const extra = isRecord(existing) ? { ...existing } : {};
  const byAdvisor = isRecord(extra.counselorPrograms) ? { ...extra.counselorPrograms } : {};
  byAdvisor[advisorId] = {
    first: {
      minutes: programs.firstSessionMinutes,
      validFromYmd: programs.firstValidFromYmd,
      validUntilYmd: programs.firstValidUntilYmd,
      days: programs.firstDays,
    },
    second: {
      minutes: programs.secondSessionMinutes,
      validFromYmd: programs.secondValidFromYmd,
      validUntilYmd: programs.secondValidUntilYmd,
      days: programs.secondDays,
    },
  };
  return {
    ...mergeCounselorDurationSettings(existing, advisorId, {
      firstSessionMinutes: programs.firstSessionMinutes,
      secondSessionMinutes: programs.secondSessionMinutes,
    }),
    counselorPrograms: byAdvisor,
  };
}

function defaultScheduleRangeYmd(): { from: string; until: string } {
  const today = utcToJalaliInTehran(new Date());
  const from = jalaliPartsToGregorianDateOnly(today.jy, today.jm, today.jd);
  let jy = today.jy;
  let jm = today.jm + 1;
  if (jm > 12) {
    jm = 1;
    jy += 1;
  }
  const jd = Math.min(today.jd, jalaliMonthLength(jy, jm));
  const until = jalaliPartsToGregorianDateOnly(jy, jm, jd);
  return { from, until };
}

export async function loadCounselorSchedule(
  ctx: CounselorContext,
  advisorId?: string | null,
): Promise<CounselorScheduleView | null> {
  const advisor = await resolveManagedBookingAdvisor({
    ctx,
    advisorId,
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

  const stored = readStoredPrograms(service.settings, advisor.id);
  const firstDays = stored?.firstDays?.some((day) => day.enabled)
    ? stored.firstDays
    : cloneDays(days);
  const secondDays = stored?.secondDays?.some((day) => day.enabled)
    ? stored.secondDays
    : cloneDays(days);
  const firstFrom = stored?.firstValidFromYmd || (validFrom
      ? utcDateToYmd(validFrom)
      : defaultScheduleRangeYmd().from);
  const firstUntil = stored?.firstValidUntilYmd || (validUntil
      ? utcDateToYmd(validUntil)
      : defaultScheduleRangeYmd().until);
  const secondFrom = stored?.secondValidFromYmd || firstFrom;
  const secondUntil = stored?.secondValidUntilYmd || firstUntil;

  return {
    advisorId: advisor.id,
    advisorName: advisor.displayName,
    firstSessionMinutes: durations.firstSessionMinutes,
    secondSessionMinutes: durations.secondSessionMinutes,
    validFromYmd: firstFrom,
    validUntilYmd: firstUntil,
    days: firstDays,
    firstDays,
    secondDays,
    firstValidFromYmd: firstFrom,
    firstValidUntilYmd: firstUntil,
    secondValidFromYmd: secondFrom,
    secondValidUntilYmd: secondUntil,
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
  advisorId?: string | null;
  firstSessionMinutes: number;
  secondSessionMinutes: number;
  validFromYmd: string;
  validUntilYmd: string;
  days: WeeklyDayProgram[];
  firstDays?: WeeklyDayProgram[];
  secondDays?: WeeklyDayProgram[];
  firstValidFromYmd?: string;
  firstValidUntilYmd?: string;
  secondValidFromYmd?: string;
  secondValidUntilYmd?: string;
}) {
  const advisor = await resolveManagedBookingAdvisor({
    ctx: input.ctx,
    advisorId: input.advisorId,
  });
  if (!advisor) {
    throw new Error("ابتدا مشاور را انتخاب کنید.");
  }

  const first = asSessionMinutes(input.firstSessionMinutes, 0);
  const second = asSessionMinutes(input.secondSessionMinutes, 0);
  if (!first || !second) {
    throw new Error("مدت جلسات باید بین ۱۵ تا ۱۸۰ دقیقه باشد.");
  }

  const firstDays = input.firstDays ?? input.days;
  const secondDays = input.secondDays ?? input.days;
  const firstValidFromYmd = input.firstValidFromYmd || input.validFromYmd;
  const firstValidUntilYmd = input.firstValidUntilYmd || input.validUntilYmd;
  const secondValidFromYmd = input.secondValidFromYmd || input.validFromYmd;
  const secondValidUntilYmd = input.secondValidUntilYmd || input.validUntilYmd;

  for (const day of [...firstDays, ...secondDays]) {
    if (!day.enabled) continue;
    const windows = assertDayWindowsValid(day.windows);
    if (!windows.ok) throw new Error(windows.error);
  }
  const shared = assertProgramsDoNotOverlap({
    first: firstDays,
    second: secondDays,
    firstFromYmd: firstValidFromYmd,
    firstUntilYmd: firstValidUntilYmd,
    secondFromYmd: secondValidFromYmd,
    secondUntilYmd: secondValidUntilYmd,
  });
  if (!shared.ok) throw new Error(shared.error);

  const validFrom = ymdToUtcNoon(firstValidFromYmd);
  const validUntil = ymdToUtcNoon(firstValidUntilYmd);
  const secondFrom = ymdToUtcNoon(secondValidFromYmd);
  const secondUntil = ymdToUtcNoon(secondValidUntilYmd);
  if (!validFrom || !validUntil || !secondFrom || !secondUntil) {
    throw new Error("بازه فعال رزرو را با تاریخ شمسی مشخص کنید.");
  }
  if (validFrom.getTime() > validUntil.getTime() || secondFrom.getTime() > secondUntil.getTime()) {
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

  const programs: Array<{ days: WeeklyDayProgram[]; from: Date; until: Date }> = [
    { days: firstDays, from: validFrom, until: validUntil },
    { days: secondDays, from: secondFrom, until: secondUntil },
  ];
  for (const program of programs) {
    for (const day of program.days) {
      if (!day.enabled) continue;
      if (!Number.isInteger(day.weekday) || day.weekday < 0 || day.weekday > 6) {
        throw new Error("روز هفته نامعتبر است.");
      }
      for (const window of day.windows) {
        rows.push({
          organizationId: input.ctx.organizationId,
          advisorId: advisor.id,
          serviceId: service.id,
          weekday: day.weekday,
          startLocalTime: window.startLocalTime,
          endLocalTime: window.endLocalTime,
          slotCapacity: 1,
          validFrom: program.from,
          validUntil: program.until,
          isActive: true,
        });
      }
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
        settings: mergeCounselorProgramSettings(service.settings, advisor.id, {
          firstSessionMinutes: first,
          secondSessionMinutes: second,
          firstValidFromYmd,
          firstValidUntilYmd,
          secondValidFromYmd,
          secondValidUntilYmd,
          firstDays,
          secondDays,
        }) as Prisma.InputJsonValue,
      },
    });
  });

  await refreshCounselorGeneratedSlots({
    organizationId: input.ctx.organizationId,
    advisorId: advisor.id,
    validFromYmd: firstValidFromYmd,
    validUntilYmd: firstValidUntilYmd,
    secondValidFromYmd,
    secondValidUntilYmd,
  });
}

export async function upsertCounselorDateException(params: {
  ctx: CounselorContext;
  advisorId?: string | null;
  kind: "blocked" | "special";
  localDateYmd: string;
  startLocalTime?: string;
  endLocalTime?: string;
  reason?: string;
}) {
  const advisor = await resolveManagedBookingAdvisor({
    ctx: params.ctx,
    advisorId: params.advisorId,
  });
  if (!advisor) {
    throw new Error("ابتدا مشاور را انتخاب کنید.");
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

  const saved = existing
    ? await prisma.bookingAvailabilityException.update({
        where: { id: existing.id },
        data,
      })
    : await prisma.bookingAvailabilityException.create({ data });

  const schedule = await loadCounselorSchedule(params.ctx, advisor.id);
  if (schedule) {
    await refreshCounselorGeneratedSlots({
      organizationId: params.ctx.organizationId,
      advisorId: advisor.id,
      validFromYmd: schedule.firstValidFromYmd,
      validUntilYmd: schedule.firstValidUntilYmd,
      secondValidFromYmd: schedule.secondValidFromYmd,
      secondValidUntilYmd: schedule.secondValidUntilYmd,
    });
  }

  return saved;
}

export async function deleteCounselorDateException(params: {
  ctx: CounselorContext;
  advisorId?: string | null;
  exceptionId: string;
}) {
  const advisor = await resolveManagedBookingAdvisor({
    ctx: params.ctx,
    advisorId: params.advisorId,
  });
  if (!advisor) {
    throw new Error("ابتدا مشاور را انتخاب کنید.");
  }
  await prisma.bookingAvailabilityException.deleteMany({
    where: {
      id: params.exceptionId,
      organizationId: params.ctx.organizationId,
      advisorId: advisor.id,
    },
  });
  const schedule = await loadCounselorSchedule(params.ctx, advisor.id);
  if (schedule) {
    await refreshCounselorGeneratedSlots({
      organizationId: params.ctx.organizationId,
      advisorId: advisor.id,
      validFromYmd: schedule.firstValidFromYmd,
      validUntilYmd: schedule.firstValidUntilYmd,
      secondValidFromYmd: schedule.secondValidFromYmd,
      secondValidUntilYmd: schedule.secondValidUntilYmd,
    });
  }
}

function exceptionDayKey(date: Date): string {
  return `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}-${date.getUTCDate()}`;
}

function tehranDayKey(date: Date): string {
  const parts = getTehranParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function hmToMinutes(value: string): number | null {
  const parsed = parseLocalTimeHm(value);
  if (!parsed) return null;
  return parsed.hour * 60 + parsed.minute;
}

export async function refreshCounselorGeneratedSlots(params: {
  organizationId: string;
  advisorId: string;
  validFromYmd: string;
  validUntilYmd: string;
  secondValidFromYmd?: string;
  secondValidUntilYmd?: string;
}) {
  const service = await ensureService(params.organizationId);
  const durations = readCounselorSessionDurations(
    service.settings,
    params.advisorId,
  );
  const stored = readStoredPrograms(service.settings, params.advisorId);
  const now = new Date();

  async function generateFor(
    durationMinutes: number,
    days: WeeklyDayProgram[] | undefined,
    fromYmd: string,
    untilYmd: string,
  ) {
    const fromBound = ymdToUtcNoon(fromYmd) ?? now;
    const untilBound =
      ymdToUtcNoon(untilYmd) ??
      new Date(now.getTime() + MAX_SLOT_GENERATION_DAYS * 24 * 60 * 60 * 1000);
    const rangeStart = fromBound.getTime() > now.getTime() ? fromBound : now;
    const maxEnd = new Date(
      now.getTime() + MAX_SLOT_GENERATION_DAYS * 24 * 60 * 60 * 1000,
    );
    const rangeEnd = untilBound.getTime() < maxEnd.getTime() ? untilBound : maxEnd;
    if (rangeEnd.getTime() < rangeStart.getTime()) return;
    const override = days
      ? daysToWindowOverride(days, fromBound, untilBound)
      : undefined;
    await generateSlotsForRange({
      organizationId: params.organizationId,
      serviceId: service.id,
      advisorId: params.advisorId,
      from: utcToJalaliInTehran(rangeStart),
      to: utcToJalaliInTehran(rangeEnd),
      durationMinutes,
      exceptionWindows: "append",
      windowsOverride: override && override.length > 0 ? override : undefined,
    });
  }

  await generateFor(
    durations.firstSessionMinutes,
    stored?.firstDays,
    params.validFromYmd,
    params.validUntilYmd,
  );
  await generateFor(
    durations.secondSessionMinutes,
    stored?.secondDays,
    params.secondValidFromYmd || params.validFromYmd,
    params.secondValidUntilYmd || params.validUntilYmd,
  );

  const [rules, exceptions, openSlots] = await Promise.all([
    prisma.bookingAvailabilityRule.findMany({
      where: {
        organizationId: params.organizationId,
        advisorId: params.advisorId,
        isActive: true,
        OR: [{ serviceId: null }, { serviceId: service.id }],
      },
    }),
    prisma.bookingAvailabilityException.findMany({
      where: {
        organizationId: params.organizationId,
        advisorId: params.advisorId,
        OR: [{ serviceId: null }, { serviceId: service.id }],
      },
    }),
    prisma.bookingSlot.findMany({
      where: {
        organizationId: params.organizationId,
        serviceId: service.id,
        advisorId: params.advisorId,
        startsAt: { gte: now },
        bookedCount: 0,
        status: BookingSlotStatus.OPEN,
      },
      select: { id: true, startsAt: true, endsAt: true },
    }),
  ]);

  const staleIds: string[] = [];
  for (const slot of openSlots) {
    const duration = slotDurationMinutes(slot.startsAt, slot.endsAt);
    if (
      duration !== durations.firstSessionMinutes &&
      duration !== durations.secondSessionMinutes
    ) {
      staleIds.push(slot.id);
      continue;
    }
    const weekday = getPersianWeekdayIndex(slot.startsAt);
    const startMinutes = hmToMinutes(formatTehranTime24(slot.startsAt));
    if (startMinutes == null) {
      staleIds.push(slot.id);
      continue;
    }
    const exception = exceptions.find(
      (row) => exceptionDayKey(row.localDate) === tehranDayKey(slot.startsAt),
    );
    if (exception?.isClosed) {
      staleIds.push(slot.id);
      continue;
    }
    const windows: Array<{ start: string; end: string }> = [];
    const programDays =
      duration === durations.secondSessionMinutes
        ? stored?.secondDays
        : stored?.firstDays;
    const programDay = programDays?.find((day) => day.weekday === weekday && day.enabled);
    if (exception && !exception.isClosed && exception.startLocalTime && exception.endLocalTime) {
      windows.push({
        start: exception.startLocalTime,
        end: exception.endLocalTime,
      });
    }
    if (programDay) {
      for (const window of programDay.windows) {
        windows.push({
          start: window.startLocalTime,
          end: window.endLocalTime,
        });
      }
    } else {
      for (const rule of rules) {
        if (rule.weekday !== weekday) continue;
        if (rule.validFrom && slot.startsAt < rule.validFrom) continue;
        if (rule.validUntil && slot.startsAt > rule.validUntil) continue;
        windows.push({
          start: rule.startLocalTime,
          end: rule.endLocalTime,
        });
      }
    }
    const stillValid = windows.some((window) => {
      const start = hmToMinutes(window.start);
      const end = hmToMinutes(window.end);
      return (
        start != null &&
        end != null &&
        startMinutes >= start &&
        startMinutes + duration <= end
      );
    });
    if (!stillValid) staleIds.push(slot.id);
  }

  if (staleIds.length > 0) {
    await prisma.bookingSlot.updateMany({
      where: {
        id: { in: staleIds },
        organizationId: params.organizationId,
        advisorId: params.advisorId,
        bookedCount: 0,
        status: BookingSlotStatus.OPEN,
      },
      data: { status: BookingSlotStatus.CANCELLED },
    });
  }
}
