import { normalizeLocalTimeHm } from "@/lib/datetime/tehran-zone";
import { assertDayWindowsValid } from "@/lib/counselor-os/schedule-windows";
import { isGregorianYmdBeforeTodayTehran } from "@/lib/counselor-os/schedule-v2/local-date";
import type { ScheduleDayInput } from "@/lib/counselor-os/schedule-v2/types";
import { gregorianYmdToDbDate } from "@/lib/counselor-os/schedule-v2/local-date";

export function parseScheduleDaysJson(raw: string): ScheduleDayInput[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error("فرمت روزهای کاری نامعتبر است.");
  }
  if (!Array.isArray(parsed)) {
    throw new Error("لیست روزهای کاری باید آرایه باشد.");
  }
  return parsed.map((row, index) => {
    if (typeof row !== "object" || row === null) {
      throw new Error(`روز کاری ${index + 1} نامعتبر است.`);
    }
    const r = row as Record<string, unknown>;
    const localDateGregorian =
      typeof r.localDateGregorian === "string" ? r.localDateGregorian.trim() : "";
    if (!gregorianYmdToDbDate(localDateGregorian)) {
      throw new Error(`تاریخ روز ${index + 1} نامعتبر است.`);
    }
    const windowsRaw = Array.isArray(r.windows) ? r.windows : [];
    const windows = windowsRaw.map((w, wi) => {
      if (typeof w !== "object" || w === null) {
        throw new Error(`بازه ${wi + 1} در روز ${index + 1} نامعتبر است.`);
      }
      const ww = w as Record<string, unknown>;
      const start =
        normalizeLocalTimeHm(String(ww.startLocalTime ?? ww.start ?? "")) ?? "";
      const end =
        normalizeLocalTimeHm(String(ww.endLocalTime ?? ww.end ?? "")) ?? "";
      return { startLocalTime: start, endLocalTime: end };
    });
    return {
      localDateGregorian,
      note: typeof r.note === "string" ? r.note : null,
      windows,
    };
  });
}

export function validateScheduleDays(
  days: ScheduleDayInput[],
  sessionMinutes: number,
): void {
  if (days.length === 0) {
    throw new Error("حداقل یک روز کاری اضافه کنید.");
  }
  const seen = new Set<string>();
  for (const day of days) {
    if (isGregorianYmdBeforeTodayTehran(day.localDateGregorian)) {
      throw new Error("تاریخ گذشته قابل ثبت نیست.");
    }
    if (seen.has(day.localDateGregorian)) {
      throw new Error(
        "این تاریخ قبلاً اضافه شده است؛ بازه جدید را داخل همان روز وارد کنید.",
      );
    }
    seen.add(day.localDateGregorian);
    if (day.windows.length === 0) {
      throw new Error("هر روز باید حداقل یک بازه ساعتی داشته باشد.");
    }
    const check = assertDayWindowsValid(day.windows, sessionMinutes);
    if (!check.ok) {
      throw new Error(check.error);
    }
  }
}
