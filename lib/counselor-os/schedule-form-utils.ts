/**
 * Client/server helpers for counselor schedule editor state.
 */

import { normalizeLocalTimeHm } from "@/lib/datetime/tehran-zone";
import type { ClockWindow } from "@/lib/counselor-os/schedule-windows";

export type WeeklyDayProgramLike = {
  weekday: number;
  enabled: boolean;
  windows: ClockWindow[];
};

export type DayDraft = {
  enabled: boolean;
  windows: Array<{ start: string; end: string }>;
};

export function normalizeWeeklyWindow(window: ClockWindow): ClockWindow | null {
  const start = normalizeLocalTimeHm(window.startLocalTime);
  const end = normalizeLocalTimeHm(window.endLocalTime);
  if (!start || !end) return null;
  return { startLocalTime: start, endLocalTime: end };
}

export function daysFromProgram(program: WeeklyDayProgramLike[]): DayDraft[] {
  return Array.from({ length: 7 }, (_, weekday) => {
    const found = program.find((day) => day.weekday === weekday);
    const normalizedWindows =
      found?.windows
        .map((w) => normalizeWeeklyWindow(w))
        .filter((w): w is ClockWindow => w != null) ?? [];
    const enabled = found?.enabled === true && normalizedWindows.length > 0;
    return {
      enabled,
      windows: enabled
        ? normalizedWindows.map((w) => ({
            start: w.startLocalTime,
            end: w.endLocalTime,
          }))
        : [{ start: "09:00", end: "12:00" }],
    };
  });
}

export function serializeDays(days: DayDraft[]) {
  return JSON.stringify(
    days.map((day, weekday) => ({
      weekday,
      enabled: day.enabled,
      windows: day.enabled
        ? day.windows.map((window) => ({
            startLocalTime: normalizeLocalTimeHm(window.start) ?? window.start,
            endLocalTime: normalizeLocalTimeHm(window.end) ?? window.end,
          }))
        : [],
    })),
  );
}

export function scheduleFormRevision(input: {
  advisorId: string;
  firstValidFromYmd: string;
  firstValidUntilYmd: string;
  secondValidFromYmd: string;
  secondValidUntilYmd: string;
  firstDays: WeeklyDayProgramLike[];
  secondDays: WeeklyDayProgramLike[];
}): string {
  return [
    input.advisorId,
    input.firstValidFromYmd,
    input.firstValidUntilYmd,
    input.secondValidFromYmd,
    input.secondValidUntilYmd,
    serializeDays(daysFromProgram(input.firstDays)),
    serializeDays(daysFromProgram(input.secondDays)),
  ].join("|");
}
