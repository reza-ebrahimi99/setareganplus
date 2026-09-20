/**
 * Central timeline classification: open slot vs break vs gap.
 * Pure functions — tested without DB.
 */

import type { ClockWindow } from "@/lib/counselor-os/schedule-windows";

export type TimelineBlockKind =
  | "pending"
  | "confirmed"
  | "completed"
  | "no_show"
  | "cancelled"
  | "open_slot"
  | "break"
  | "gap";

export type TimeRangeMinutes = {
  start: number;
  end: number;
};

export type TimelineComputedBlock = {
  id: string;
  kind: TimelineBlockKind;
  start: number;
  end: number;
  title: string;
  subtitle: string;
  appointmentId: string | null;
  slotId: string | null;
  studentId: string | null;
  clickable: boolean;
};

export function minutesFromHm(hm: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hm.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

/** Gaps between consecutive windows on one schedule day = breaks (non-bookable). */
export function computeBreakRanges(windows: ClockWindow[]): TimeRangeMinutes[] {
  const parsed = windows
    .map((w) => ({
      start: minutesFromHm(w.startLocalTime),
      end: minutesFromHm(w.endLocalTime),
    }))
    .filter((w): w is TimeRangeMinutes => w.start != null && w.end != null && w.end > w.start)
    .sort((a, b) => a.start - b.start);
  const breaks: TimeRangeMinutes[] = [];
  for (let i = 1; i < parsed.length; i += 1) {
    const prev = parsed[i - 1]!;
    const cur = parsed[i]!;
    if (cur.start > prev.end) {
      breaks.push({ start: prev.end, end: cur.start });
    }
  }
  return breaks;
}

export function unionWorkingHours(windows: ClockWindow[]): TimeRangeMinutes[] {
  const parsed = windows
    .map((w) => ({
      start: minutesFromHm(w.startLocalTime),
      end: minutesFromHm(w.endLocalTime),
    }))
    .filter((w): w is TimeRangeMinutes => w.start != null && w.end != null && w.end > w.start)
    .sort((a, b) => a.start - b.start);
  if (parsed.length === 0) return [];
  const merged: TimeRangeMinutes[] = [{ ...parsed[0]! }];
  for (let i = 1; i < parsed.length; i += 1) {
    const cur = parsed[i]!;
    const last = merged[merged.length - 1]!;
    if (cur.start <= last.end) {
      last.end = Math.max(last.end, cur.end);
    } else {
      merged.push({ ...cur });
    }
  }
  return merged;
}

function overlaps(a: TimeRangeMinutes, b: TimeRangeMinutes): boolean {
  return a.start < b.end && a.end > b.start;
}

function subtractRange(
  base: TimeRangeMinutes,
  occupied: TimeRangeMinutes[],
): TimeRangeMinutes[] {
  let parts: TimeRangeMinutes[] = [base];
  for (const occ of occupied) {
    const next: TimeRangeMinutes[] = [];
    for (const p of parts) {
      if (!overlaps(p, occ)) {
        next.push(p);
        continue;
      }
      if (occ.start > p.start) {
        next.push({ start: p.start, end: Math.min(occ.start, p.end) });
      }
      if (occ.end < p.end) {
        next.push({ start: Math.max(occ.end, p.start), end: p.end });
      }
    }
    parts = next.filter((x) => x.end - x.start >= 1);
  }
  return parts;
}

export function computeGapRanges(params: {
  working: TimeRangeMinutes[];
  occupied: TimeRangeMinutes[];
  breaks: TimeRangeMinutes[];
  openSlots: TimeRangeMinutes[];
  minGapMinutes?: number;
}): TimeRangeMinutes[] {
  const minGap = params.minGapMinutes ?? 5;
  const blockers = [...params.occupied, ...params.breaks, ...params.openSlots];
  const gaps: TimeRangeMinutes[] = [];
  for (const work of params.working) {
    const free = subtractRange(work, blockers);
    for (const f of free) {
      if (f.end - f.start >= minGap) {
        gaps.push(f);
      }
    }
  }
  return gaps;
}

export function mergeTimelineBlocks(
  blocks: TimelineComputedBlock[],
): TimelineComputedBlock[] {
  return [...blocks].sort((a, b) => a.start - b.start || a.end - b.end);
}

export function workingBoundsFromWindows(windows: ClockWindow[]): TimeRangeMinutes | null {
  const union = unionWorkingHours(windows);
  if (union.length === 0) return null;
  return {
    start: union[0]!.start,
    end: union[union.length - 1]!.end,
  };
}
