import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { fa } from "@/lib/format";
import { J_MONTHS } from "@/lib/jalali";
import type { Catalog } from "./catalog";
import type { Audience, ConsultMode } from "./constants";
import { getConsultSettings } from "./settings";
import {
  hasConfiguredRules,
  slotKey,
  slotsForConsultantOnDate,
  withRemaining,
  type ConsultantCalendar,
  type ExceptionRule,
  type OpenSlot,
  type RuleAudience,
  type WindowRule,
} from "./schedule";
import { jalaliToTehranKey, monthLength, tehranDateKey, tehranDateKeys, tehranHm, tehranKeyToJalali, tehranWeekday, tehranNoon } from "./time";

function asAudience(v: string): RuleAudience {
  return v === "PUBLIC" || v === "SPECIAL" ? v : "BOTH";
}
function asKind(v: string): ExceptionRule["kind"] {
  return v === "EXTRA" ? "EXTRA" : "OFF";
}

export async function loadCalendars(db: Pick<PrismaClient, "consultant"> = prisma): Promise<ConsultantCalendar[]> {
  const rows = await db.consultant.findMany({
    include: { windows: true, exceptions: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return rows.map((c) => ({
    id: c.id,
    sortOrder: c.sortOrder,
    active: c.active,
    offersPublic: c.offersPublic,
    offersSpecial: c.offersSpecial,
    offersOnline: c.offersOnline,
    offersInPerson: c.offersInPerson,
    windows: c.windows.map((w): WindowRule => ({
      weekday: w.weekday,
      startTime: w.startTime,
      endTime: w.endTime,
      slotMinutes: w.slotMinutes,
      capacity: w.capacity,
      online: w.online,
      inPerson: w.inPerson,
      audience: asAudience(w.audience),
    })),
    exceptions: c.exceptions.map((e): ExceptionRule => ({
      date: e.date,
      kind: asKind(e.kind),
      startTime: e.startTime,
      endTime: e.endTime,
      slotMinutes: e.slotMinutes,
      capacity: e.capacity,
      online: e.online,
      inPerson: e.inPerson,
      audience: asAudience(e.audience),
    })),
  }));
}

export async function catalogFor(audience: Audience, mode: ConsultMode, jy: number, jm: number, now = new Date()): Promise<Catalog> {
  const settings = await getConsultSettings();
  const closed = audience === "PUBLIC" ? !settings.publicOpen : !settings.specialOpen;
  const empty = (configured: boolean): Catalog => ({
    closed,
    configured,
    slotMinutes: settings.slotMinutes,
    jy,
    jm,
    days: [],
    times: {},
    consultants: [],
  });
  if (jm < 1 || jm > 12 || !Number.isInteger(jy)) return empty(false);
  const calendars = await loadCalendars();
  const configured = calendars.some((c) => hasConfiguredRules(c, audience, mode));
  if (closed) return empty(configured);

  const horizon = new Set(tehranDateKeys(now, settings.horizonDays));
  const len = monthLength(jy, jm);
  const days: Catalog["days"] = [];
  const times: Catalog["times"] = {};
  const people = new Map<string, { id: string; name: string; specialty: string; photo: string | null; startsAt: string[] }>();

  const rangeStart = now;
  const rangeEnd = new Date(now.getTime() + settings.horizonDays * 86_400_000 + 86_400_000);
  const ids = calendars.map((c) => c.id);
  const takenRows = ids.length
    ? await prisma.consultationSeat.groupBy({
        by: ["consultantId", "startsAt"],
        where: { consultantId: { in: ids }, startsAt: { gte: rangeStart, lt: rangeEnd } },
        _count: { _all: true },
      })
    : [];
  const taken = new Map<string, number>();
  for (const row of takenRows) taken.set(slotKey(row.consultantId, row.startsAt), row._count._all);

  const names = new Map(calendars.map((c) => [c.id, c]));
  const photos = ids.length
    ? await prisma.consultant.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, specialty: true, photo: true } })
    : [];
  const photoById = new Map(photos.map((p) => [p.id, p]));

  for (let jd = 1; jd <= len; jd++) {
    const date = jalaliToTehranKey(jy, jm, jd);
    if (!date) continue;
    const inHorizon = horizon.has(date);
    let open = 0;
    if (inHorizon && configured) {
      const drafts = calendars.flatMap((c) => slotsForConsultantOnDate(c, date, audience, mode, settings.slotMinutes));
      const slots = withRemaining(drafts, taken, now, settings.minNoticeMinutes);
      open = slots.length;
      if (slots.length) {
        times[date] = groupTimes(slots);
        for (const s of slots) {
          const info = photoById.get(s.consultantId);
          const cal = names.get(s.consultantId);
          if (!info || !cal) continue;
          const cur = people.get(s.consultantId) ?? { id: info.id, name: info.name, specialty: info.specialty, photo: info.photo, startsAt: [] };
          cur.startsAt.push(s.startsAt.toISOString());
          people.set(s.consultantId, cur);
        }
      }
    }
    days.push({ date, jd, weekday: tehranWeekday(tehranNoon(date)), open, inHorizon });
  }

  return { closed, configured, slotMinutes: settings.slotMinutes, jy, jm, days, times, consultants: [...people.values()] };
}

function groupTimes(slots: OpenSlot[]): { startsAt: string; label: string; open: number }[] {
  const map = new Map<string, { startsAt: string; label: string; open: number }>();
  for (const s of slots) {
    const iso = s.startsAt.toISOString();
    const cur = map.get(iso);
    if (cur) cur.open += s.remaining;
    else map.set(iso, { startsAt: iso, label: `${fa(tehranHm(s.startsAt))} تا ${fa(tehranHm(s.endsAt))}`, open: s.remaining });
  }
  return [...map.values()].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

export async function adminSlotChoices(audience: Audience, horizonDays: number) {
  const settings = await getConsultSettings();
  const calendars = await loadCalendars();
  const names = await prisma.consultant.findMany({ select: { id: true, name: true } });
  const nameOf = new Map(names.map((n) => [n.id, n.name]));
  const keys = tehranDateKeys(new Date(), horizonDays);
  const ids = calendars.map((c) => c.id);
  const takenRows = ids.length
    ? await prisma.consultationSeat.groupBy({
        by: ["consultantId", "startsAt"],
        where: { consultantId: { in: ids }, startsAt: { gte: new Date() } },
        _count: { _all: true },
      })
    : [];
  const taken = new Map<string, number>();
  for (const row of takenRows) taken.set(slotKey(row.consultantId, row.startsAt), row._count._all);
  const out: { value: string; label: string }[] = [];
  for (const date of keys) {
    for (const mode of ["ONLINE", "IN_PERSON"] as const) {
      const drafts = calendars.flatMap((c) => slotsForConsultantOnDate(c, date, audience, mode, settings.slotMinutes));
      for (const s of withRemaining(drafts, taken, new Date(), 0)) {
        const j = tehranKeyToJalali(date);
        out.push({
          value: `${s.consultantId}|${s.startsAt.toISOString()}|${mode}`,
          label: `${fa(j.jd)} ${J_MONTHS[j.jm - 1]} ${fa(tehranHm(s.startsAt))} · ${mode === "ONLINE" ? "آنلاین" : "حضوری"} · ${nameOf.get(s.consultantId) ?? ""}`,
        });
      }
    }
  }
  return out;
}

export function monthOf(now = new Date()): { jy: number; jm: number } {
  const j = tehranKeyToJalali(tehranDateKey(now));
  return { jy: j.jy, jm: j.jm };
}
