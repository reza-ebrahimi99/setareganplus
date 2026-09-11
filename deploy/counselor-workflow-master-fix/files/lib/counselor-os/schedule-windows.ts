/**
 * Pure weekly-window rules for counselor FIRST/SECOND session schedules.
 * Multiple windows per weekday encode breaks. Slots must fit inside one window.
 */

export type ClockWindow = {
  startLocalTime: string;
  endLocalTime: string;
};

export type WeekdayWindows = {
  weekday: number;
  enabled: boolean;
  windows: ClockWindow[];
};

function parseHm(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
}

export function clockWindowsOverlap(a: ClockWindow, b: ClockWindow): boolean {
  const aStart = parseHm(a.startLocalTime);
  const aEnd = parseHm(a.endLocalTime);
  const bStart = parseHm(b.startLocalTime);
  const bEnd = parseHm(b.endLocalTime);
  if (aStart == null || aEnd == null || bStart == null || bEnd == null) return true;
  return aStart < bEnd && aEnd > bStart;
}

export function assertDayWindowsValid(
  windows: ClockWindow[],
): { ok: true } | { ok: false; error: string } {
  const parsed: Array<{ start: number; end: number; raw: ClockWindow }> = [];
  for (const window of windows) {
    const start = parseHm(window.startLocalTime);
    const end = parseHm(window.endLocalTime);
    if (start == null || end == null) {
      return { ok: false, error: "ساعت شروع و پایان هر بازه را کامل وارد کنید." };
    }
    if (end <= start) {
      return { ok: false, error: "ساعت پایان باید بعد از ساعت شروع باشد." };
    }
    parsed.push({ start, end, raw: window });
  }
  parsed.sort((a, b) => a.start - b.start);
  for (let i = 1; i < parsed.length; i += 1) {
    if (parsed[i].start < parsed[i - 1].end) {
      return {
        ok: false,
        error: "بازه‌های یک روز نباید روی هم بیفتند. برای استراحت، بین بازه‌ها فاصله بگذارید.",
      };
    }
  }
  return { ok: true };
}

export function assertProgramsDoNotShareClock(
  first: WeekdayWindows[],
  second: WeekdayWindows[],
): { ok: true } | { ok: false; error: string } {
  for (const firstDay of first) {
    if (!firstDay.enabled) continue;
    const secondDay = second.find((day) => day.weekday === firstDay.weekday);
    if (!secondDay?.enabled) continue;
    for (const a of firstDay.windows) {
      for (const b of secondDay.windows) {
        if (clockWindowsOverlap(a, b)) {
          return {
            ok: false,
            error:
              "بازه‌های جلسه اول و جلسه دوم در یک روز روی هم افتاده‌اند. آن‌ها را جدا کنید تا نوبت‌ها قاطی نشوند.",
          };
        }
      }
    }
  }
  return { ok: true };
}

export function slotFitsSingleWindow(params: {
  startMinutes: number;
  durationMinutes: number;
  windows: ClockWindow[];
}): boolean {
  return params.windows.some((window) => {
    const start = parseHm(window.startLocalTime);
    const end = parseHm(window.endLocalTime);
    if (start == null || end == null) return false;
    return (
      params.startMinutes >= start &&
      params.startMinutes + params.durationMinutes <= end
    );
  });
}

export function enabledWindowsOf(days: WeekdayWindows[]): ClockWindow[] {
  return days.flatMap((day) => (day.enabled ? day.windows : []));
}

/** Slot start minutes that fully fit inside one window and never cross a break. */
export function enumerateSlotStartsInWindows(params: {
  windows: ClockWindow[];
  durationMinutes: number;
  stepMinutes?: number;
}): number[] {
  const duration = params.durationMinutes;
  const step = params.stepMinutes ?? duration;
  if (duration <= 0 || step <= 0) return [];
  const starts: number[] = [];
  for (const window of params.windows) {
    const start = parseHm(window.startLocalTime);
    const end = parseHm(window.endLocalTime);
    if (start == null || end == null) continue;
    let cursor = start;
    while (cursor + duration <= end) {
      starts.push(cursor);
      cursor += step;
    }
  }
  return starts;
}
