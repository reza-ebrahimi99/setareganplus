import { CounselorScheduleSessionKind } from "@/generated/prisma/enums";
import { formatJalaliDateLong } from "@/lib/datetime/jalali";
import { sessionKindLabel } from "@/lib/counselor-os/schedule-v2/session-kind";
import { gregorianYmdToDbDate, dbDateToJalali } from "@/lib/counselor-os/schedule-v2/local-date";
import { ymdToUtcNoon } from "@/lib/counselor-os/schedule";

export function suggestSchedulePlanTitle(params: {
  sessionKind: CounselorScheduleSessionKind;
  dayYmds: string[];
}): string {
  const sorted = [...params.dayYmds].filter(Boolean).sort();
  if (sorted.length === 0) {
    return sessionKindLabel(params.sessionKind);
  }
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;
  const fmt = (ymd: string) => {
    const db = gregorianYmdToDbDate(ymd);
    const noon = ymdToUtcNoon(ymd);
    if (noon) return formatJalaliDateLong(noon);
    if (db) {
      const j = dbDateToJalali(db);
      if (j) return `${j.jy}/${j.jm}/${j.jd}`;
    }
    return ymd;
  };
  const range =
    first === last ? fmt(first) : `${fmt(first)} تا ${fmt(last)}`;
  return `${sessionKindLabel(params.sessionKind)} — ${range}`;
}

export function planLegacyArchivedAt(legacyMeta: unknown): string | null {
  if (!legacyMeta || typeof legacyMeta !== "object") return null;
  const v = (legacyMeta as Record<string, unknown>).archivedAt;
  return typeof v === "string" ? v : null;
}

export function resolveSchedulePlanTitle(params: {
  title?: string | null;
  sessionKind: CounselorScheduleSessionKind;
  dayYmds: string[];
}): string | null {
  const trimmed = params.title?.trim();
  if (trimmed) return trimmed;
  if (params.dayYmds.length === 0) return null;
  return suggestSchedulePlanTitle({
    sessionKind: params.sessionKind,
    dayYmds: params.dayYmds,
  });
}
