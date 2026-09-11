/**
 * Date-aware conflict rules for first vs second session programs.
 * Clock-only comparison is intentionally insufficient.
 */

import {
  clockWindowsOverlap,
  type WeekdayWindows,
} from "@/lib/counselor-os/schedule-windows";

export function ymdRangesOverlap(
  aFrom: string,
  aUntil: string,
  bFrom: string,
  bUntil: string,
): boolean {
  if (!aFrom || !aUntil || !bFrom || !bUntil) return true;
  return aFrom <= bUntil && aUntil >= bFrom;
}

export function assertProgramsDoNotOverlap(params: {
  first: WeekdayWindows[];
  second: WeekdayWindows[];
  firstFromYmd: string;
  firstUntilYmd: string;
  secondFromYmd: string;
  secondUntilYmd: string;
}): { ok: true } | { ok: false; error: string } {
  if (
    !ymdRangesOverlap(
      params.firstFromYmd,
      params.firstUntilYmd,
      params.secondFromYmd,
      params.secondUntilYmd,
    )
  ) {
    return { ok: true };
  }

  for (const firstDay of params.first) {
    if (!firstDay.enabled) continue;
    const secondDay = params.second.find((day) => day.weekday === firstDay.weekday);
    if (!secondDay?.enabled) continue;
    for (const a of firstDay.windows) {
      for (const b of secondDay.windows) {
        if (clockWindowsOverlap(a, b)) {
          return {
            ok: false,
            error:
              "در روزهایی که بازه تاریخ جلسه اول و جلسه دوم روی هم می‌افتد، ساعت‌های همان روز تداخل دارند.",
          };
        }
      }
    }
  }
  return { ok: true };
}
