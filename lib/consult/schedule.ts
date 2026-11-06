import type { Audience, ConsultMode } from "./constants";
import { clampCapacity, clampSlotMinutes, hmToMinutes, tehranAt, tehranWeekday, tehranNoon } from "./time";

export type RuleAudience = "PUBLIC" | "SPECIAL" | "BOTH";

export type WindowRule = {
  weekday: number;
  startTime: string;
  endTime: string;
  slotMinutes: number | null;
  capacity: number | null;
  online: boolean;
  inPerson: boolean;
  audience: RuleAudience;
};

export type ExceptionRule = {
  date: string;
  kind: "OFF" | "EXTRA";
  startTime: string | null;
  endTime: string | null;
  slotMinutes: number | null;
  capacity: number | null;
  online: boolean;
  inPerson: boolean;
  audience: RuleAudience;
};

/** A consultant as the scheduler sees them. No implicit week is ever assumed. */
export type ConsultantCalendar = {
  id: string;
  sortOrder: number;
  active: boolean;
  offersPublic: boolean;
  offersSpecial: boolean;
  offersOnline: boolean;
  offersInPerson: boolean;
  windows: WindowRule[];
  exceptions: ExceptionRule[];
};

export type SlotDraft = {
  consultantId: string;
  startsAt: Date;
  endsAt: Date;
  capacity: number;
};

export type OpenSlot = SlotDraft & { taken: number; remaining: number };

type ModeFlags = { online: boolean; inPerson: boolean; audience: RuleAudience };

export function appliesTo(rule: ModeFlags, audience: Audience, mode: ConsultMode): boolean {
  if (rule.audience !== "BOTH" && rule.audience !== audience) return false;
  return mode === "ONLINE" ? rule.online : rule.inPerson;
}

export function consultantAllows(c: ConsultantCalendar, audience: Audience, mode: ConsultMode): boolean {
  if (!c.active) return false;
  if (audience === "PUBLIC" && !c.offersPublic) return false;
  if (audience === "SPECIAL" && !c.offersSpecial) return false;
  if (mode === "ONLINE" && !c.offersOnline) return false;
  if (mode === "IN_PERSON" && !c.offersInPerson) return false;
  return true;
}

/** True only when staff actually saved a window or an extra day for this audience and mode. */
export function hasConfiguredRules(c: ConsultantCalendar, audience: Audience, mode: ConsultMode): boolean {
  if (!consultantAllows(c, audience, mode)) return false;
  if (c.windows.some((w) => appliesTo(w, audience, mode))) return true;
  return c.exceptions.some((e) => e.kind === "EXTRA" && appliesTo(e, audience, mode));
}

function addRange(map: Map<number, { capacity: number; minutes: number }>, startTime: string, endTime: string, slotMinutes: number | null, capacity: number | null, fallbackSlot: number) {
  const a = hmToMinutes(startTime);
  const b = hmToMinutes(endTime);
  if (a === null || b === null || b <= a) return;
  const step = clampSlotMinutes(slotMinutes, fallbackSlot);
  const cap = clampCapacity(capacity);
  for (let t = a; t + step <= b; t += step) {
    const prev = map.get(t);
    if (!prev) map.set(t, { capacity: cap, minutes: step });
    else map.set(t, { capacity: Math.max(prev.capacity, cap), minutes: prev.minutes });
  }
}

function removeRange(map: Map<number, { capacity: number; minutes: number }>, startTime: string | null, endTime: string | null) {
  if (!startTime || !endTime) {
    map.clear();
    return;
  }
  const a = hmToMinutes(startTime);
  const b = hmToMinutes(endTime);
  if (a === null || b === null || b <= a) return;
  for (const [t, v] of map) {
    if (t < b && t + v.minutes > a) map.delete(t);
  }
}

/**
 * Slots for one Tehran date. An empty window list produces nothing — the engine
 * never fills Saturday–Wednesday or any other "usual" school week by itself.
 * Whole-day OFF runs before EXTRA, so a makeup hour on a closed day still opens.
 */
export function slotsForConsultantOnDate(c: ConsultantCalendar, dateKey: string, audience: Audience, mode: ConsultMode, defaultSlotMinutes: number): SlotDraft[] {
  if (!consultantAllows(c, audience, mode)) return [];
  const weekday = tehranWeekday(tehranNoon(dateKey));
  const map = new Map<number, { capacity: number; minutes: number }>();
  for (const w of c.windows) {
    if (w.weekday !== weekday || !appliesTo(w, audience, mode)) continue;
    addRange(map, w.startTime, w.endTime, w.slotMinutes, w.capacity, defaultSlotMinutes);
  }
  const today = c.exceptions.filter((e) => e.date === dateKey);
  for (const e of today) {
    if (e.kind !== "OFF" || !appliesTo(e, audience, mode)) continue;
    removeRange(map, e.startTime, e.endTime);
  }
  for (const e of today) {
    if (e.kind !== "EXTRA" || !appliesTo(e, audience, mode) || !e.startTime || !e.endTime) continue;
    addRange(map, e.startTime, e.endTime, e.slotMinutes, e.capacity, defaultSlotMinutes);
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([min, v]) => {
      const startsAt = tehranAt(dateKey, min);
      return { consultantId: c.id, startsAt, endsAt: new Date(startsAt.getTime() + v.minutes * 60_000), capacity: v.capacity };
    });
}

export function slotsAtInstant(calendars: ConsultantCalendar[], dateKey: string, audience: Audience, mode: ConsultMode, startsAt: Date, defaultSlotMinutes: number): SlotDraft[] {
  return calendars
    .flatMap((c) => slotsForConsultantOnDate(c, dateKey, audience, mode, defaultSlotMinutes))
    .filter((s) => s.startsAt.getTime() === startsAt.getTime());
}

export function slotKey(consultantId: string, startsAt: Date): string {
  return `${consultantId}|${startsAt.getTime()}`;
}

export function withRemaining(drafts: SlotDraft[], taken: Map<string, number>, now: Date, minNoticeMinutes: number): OpenSlot[] {
  const min = now.getTime() + minNoticeMinutes * 60_000;
  const out: OpenSlot[] = [];
  for (const s of drafts) {
    if (s.startsAt.getTime() < min) continue;
    const used = taken.get(slotKey(s.consultantId, s.startsAt)) ?? 0;
    const remaining = s.capacity - used;
    if (remaining <= 0) continue;
    out.push({ ...s, taken: used, remaining });
  }
  return out;
}

/** Least-booked consultant that day, then the staff sort order, then id. Stable. */
export function pickFastestConsultant(options: { id: string; sortOrder: number; dayLoad: number }[]): string | null {
  if (options.length === 0) return null;
  return [...options].sort((a, b) => a.dayLoad - b.dayLoad || a.sortOrder - b.sortOrder || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))[0].id;
}

/** First free seat index, or null when the slot is full. Shared by the DB claim and the tests. */
export function nextSeat(taken: number[], capacity: number): number | null {
  const used = new Set(taken);
  for (let i = 0; i < capacity; i++) if (!used.has(i)) return i;
  return null;
}

/**
 * In-memory stand-in for the unique (consultant, start, seat) index.
 * Two callers sharing `taken` cannot receive the same seat.
 */
export function claimSeat(taken: Set<number>, capacity: number): number | null {
  const seat = nextSeat([...taken], capacity);
  if (seat === null) return null;
  taken.add(seat);
  return seat;
}
