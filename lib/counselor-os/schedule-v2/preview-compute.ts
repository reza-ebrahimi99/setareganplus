/**
 * Pure schedule preview — shared by client UI and server validation.
 * Does not apply minimum lead time (shows capacity, not bookable-now filter).
 */

import { formatJalaliDateLong } from "@/lib/datetime/jalali";
import { normalizeLocalTimeHm } from "@/lib/datetime/tehran-zone";
import { toPersianDigits } from "@/lib/persian";
import {
  gregorianYmdToDbDate,
  weekdayLabelForGregorianYmd,
  ymdToUtcNoon,
} from "@/lib/counselor-os/schedule-v2/local-date";
import { isGregorianYmdBeforeTodayTehran } from "@/lib/counselor-os/schedule-v2/local-date";
import type { ScheduleDayInput } from "@/lib/counselor-os/schedule-v2/types";
import {
  assertDayWindowsValid,
  enumerateSlotStartsInWindows,
} from "@/lib/counselor-os/schedule-windows";

export type PreviewSlotChip = {
  startLocalTime: string;
  endLocalTime: string;
  label: string;
};

export type PreviewDayGroup = {
  localDateGregorian: string;
  jalaliHeading: string;
  weekdayLabel: string;
  slots: PreviewSlotChip[];
};

export type SchedulePreviewResult =
  | {
      ok: true;
      totalSlots: number;
      days: PreviewDayGroup[];
    }
  | { ok: false; error: string };

function hmToEnd(startHm: string, durationMinutes: number): string {
  const match = /^(\d{2}):(\d{2})$/.exec(startHm);
  if (!match) return startHm;
  const total = Number(match[1]) * 60 + Number(match[2]) + durationMinutes;
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function slotLabel(start: string, end: string): string {
  return `${toPersianDigits(start)} تا ${toPersianDigits(end)}`;
}

export function normalizeScheduleDayInputs(
  days: ScheduleDayInput[],
): ScheduleDayInput[] | { error: string } {
  const normalized: ScheduleDayInput[] = [];
  for (let i = 0; i < days.length; i += 1) {
    const day = days[i]!;
    const localDateGregorian = day.localDateGregorian.trim();
    if (!localDateGregorian) {
      return { error: "حداقل یک روز با تاریخ مشخص اضافه کنید." };
    }
    if (!gregorianYmdToDbDate(localDateGregorian)) {
      return { error: "تاریخ نامعتبر است." };
    }
    if (isGregorianYmdBeforeTodayTehran(localDateGregorian)) {
      return { error: "این تاریخ گذشته است." };
    }
    const windowList: Array<{ startLocalTime: string; endLocalTime: string }> =
      [];
    for (let wi = 0; wi < day.windows.length; wi += 1) {
      const w = day.windows[wi]!;
      const start =
        normalizeLocalTimeHm(w.startLocalTime) ?? w.startLocalTime.trim();
      const end = normalizeLocalTimeHm(w.endLocalTime) ?? w.endLocalTime.trim();
      if (!start || !end) {
        return { error: `ساعت شروع و پایان بازه ${wi + 1} معتبر نیست.` };
      }
      windowList.push({ startLocalTime: start, endLocalTime: end });
    }
    if (windowList.length === 0) {
      return { error: "هر روز باید حداقل یک بازه ساعتی داشته باشد." };
    }
    normalized.push({
      localDateGregorian,
      note: day.note,
      windows: windowList,
    });
  }
  return normalized;
}

export function computeSchedulePreview(params: {
  days: ScheduleDayInput[];
  sessionMinutes: number;
}): SchedulePreviewResult {
  const minutes = Math.round(params.sessionMinutes);
  if (!Number.isFinite(minutes) || minutes < 15 || minutes > 180) {
    return { ok: false, error: "مدت جلسه باید بین ۱۵ تا ۱۸۰ دقیقه باشد." };
  }

  const normalized = normalizeScheduleDayInputs(params.days);
  if ("error" in normalized) {
    return { ok: false, error: normalized.error };
  }

  const seen = new Set<string>();
  for (const day of normalized) {
    if (seen.has(day.localDateGregorian)) {
      return {
        ok: false,
        error:
          "این تاریخ قبلاً اضافه شده است؛ بازه جدید را داخل همان روز وارد کنید.",
      };
    }
    seen.add(day.localDateGregorian);
    const check = assertDayWindowsValid(day.windows, minutes);
    if (!check.ok) {
      return { ok: false, error: check.error };
    }
  }

  const groups: PreviewDayGroup[] = [];
  let totalSlots = 0;

  for (const day of normalized) {
    const probe = ymdToUtcNoon(day.localDateGregorian);
    const jalaliHeading = probe
      ? formatJalaliDateLong(probe)
      : day.localDateGregorian;
    const weekdayLabel = weekdayLabelForGregorianYmd(day.localDateGregorian);
    const starts = enumerateSlotStartsInWindows({
      windows: day.windows,
      durationMinutes: minutes,
      stepMinutes: minutes,
    });
    const slots: PreviewSlotChip[] = starts.map((startMinutes) => {
      const startHm = `${String(Math.floor(startMinutes / 60)).padStart(2, "0")}:${String(startMinutes % 60).padStart(2, "0")}`;
      const endHm = hmToEnd(startHm, minutes);
      return {
        startLocalTime: startHm,
        endLocalTime: endHm,
        label: slotLabel(startHm, endHm),
      };
    });
    totalSlots += slots.length;
    groups.push({
      localDateGregorian: day.localDateGregorian,
      jalaliHeading,
      weekdayLabel,
      slots,
    });
  }

  return { ok: true, totalSlots, days: groups };
}

/** Build ScheduleDayInput[] from form rows (client). */
export function formRowsToScheduleDays(
  rows: Array<{
    localDateGregorian: string;
    windows: Array<{ start: string; end: string }>;
  }>,
): ScheduleDayInput[] {
  return rows
    .filter((r) => r.localDateGregorian.trim())
    .map((r) => ({
      localDateGregorian: r.localDateGregorian.trim(),
      windows: r.windows.map((w) => ({
        startLocalTime: w.start,
        endLocalTime: w.end,
      })),
    }));
}

export function jalaliHeadingForGregorianYmd(ymd: string): string {
  const probe = ymdToUtcNoon(ymd);
  if (!probe) return ymd;
  return formatJalaliDateLong(probe);
}
