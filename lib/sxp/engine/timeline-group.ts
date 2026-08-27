import { utcToJalaliInTehran, formatJalaliDateLong } from "@/lib/datetime/jalali";
import { toPersianDigits } from "@/lib/persian";
import type { TimelineDayGroup } from "@/lib/sxp/engine/timeline-query";

export function jalaliDayKey(date: Date): string {
  const j = utcToJalaliInTehran(date);
  return `${j.jy}-${String(j.jm).padStart(2, "0")}-${String(j.jd).padStart(2, "0")}`;
}

export function groupTimelineByTehranDay<T extends { occurredAt: Date }>(
  items: T[],
): TimelineDayGroup<T>[] {
  const groups: TimelineDayGroup<T>[] = [];
  const index = new Map<string, TimelineDayGroup<T>>();
  for (const item of items) {
    const dayKey = jalaliDayKey(item.occurredAt);
    let group = index.get(dayKey);
    if (!group) {
      group = {
        dayKey,
        label: formatJalaliDateLong(item.occurredAt),
        items: [],
      };
      index.set(dayKey, group);
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups;
}

export function relativeTimeFa(occurredAt: Date, now = new Date()): string {
  const deltaMs = now.getTime() - occurredAt.getTime();
  const minutes = Math.round(deltaMs / 60_000);
  if (minutes < 1) return "همین حالا";
  if (minutes < 60) return `${toPersianDigits(minutes)} دقیقه پیش`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${toPersianDigits(hours)} ساعت پیش`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${toPersianDigits(days)} روز پیش`;
  return formatJalaliDateLong(occurredAt);
}
