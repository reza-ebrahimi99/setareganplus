import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GRADES, isGradeId } from "./constants";
import { claimSeat, hasConfiguredRules, nextSeat, pickFastestConsultant, slotsForConsultantOnDate, withRemaining, type ConsultantCalendar } from "./schedule";
import { jalaliToTehranKey, tehranAt, tehranDateKey, tehranKeyToJalali, tehranWeekday, tehranNoon } from "./time";
import { parseConsultSettings } from "./settings-parse";

const SAT = "2026-11-07"; // Saturday in Tehran

function consultant(partial: Partial<ConsultantCalendar> = {}): ConsultantCalendar {
  return {
    id: "c1",
    sortOrder: 1,
    active: true,
    offersPublic: true,
    offersSpecial: false,
    offersOnline: true,
    offersInPerson: true,
    windows: [],
    exceptions: [],
    ...partial,
  };
}

describe("consultation schedule", () => {
  it("invents nothing when no window or extra day exists", () => {
    const c = consultant({ offersPublic: true, offersOnline: true });
    assert.equal(hasConfiguredRules(c, "PUBLIC", "ONLINE"), false);
    assert.deepEqual(slotsForConsultantOnDate(c, SAT, "PUBLIC", "ONLINE", 30), []);
    assert.equal(slotsForConsultantOnDate(c, "2026-11-08", "PUBLIC", "ONLINE", 30).length, 0);
  });

  it("builds 30-minute Tehran slots on the configured weekday only", () => {
    assert.equal(tehranWeekday(tehranNoon(SAT)), 0);
    const c = consultant({
      windows: [{ weekday: 0, startTime: "16:00", endTime: "18:00", slotMinutes: null, capacity: null, online: true, inPerson: false, audience: "PUBLIC" }],
    });
    const slots = slotsForConsultantOnDate(c, SAT, "PUBLIC", "ONLINE", 30);
    assert.deepEqual(slots.map((s) => s.startsAt.toISOString()), [
      "2026-11-07T12:30:00.000Z",
      "2026-11-07T13:00:00.000Z",
      "2026-11-07T13:30:00.000Z",
      "2026-11-07T14:00:00.000Z",
    ]);
    assert.equal(slots[0].endsAt.toISOString(), "2026-11-07T13:00:00.000Z");
    assert.equal(slots[0].capacity, 1);
    assert.equal(slotsForConsultantOnDate(c, "2026-11-08", "PUBLIC", "ONLINE", 30).length, 0);
    assert.equal(slotsForConsultantOnDate(c, SAT, "PUBLIC", "IN_PERSON", 30).length, 0);
    assert.equal(slotsForConsultantOnDate(c, SAT, "SPECIAL", "ONLINE", 30).length, 0);
  });

  it("removes a day off and keeps a partial closure accurate", () => {
    const c = consultant({
      windows: [{ weekday: 0, startTime: "16:00", endTime: "18:00", slotMinutes: 30, capacity: 1, online: true, inPerson: true, audience: "BOTH" }],
      exceptions: [{ date: SAT, kind: "OFF", startTime: "16:00", endTime: "17:00", slotMinutes: null, capacity: null, online: true, inPerson: true, audience: "BOTH" }],
    });
    const left = slotsForConsultantOnDate(c, SAT, "PUBLIC", "ONLINE", 30).map((s) => tehranDateKey(s.startsAt) && s.startsAt.toISOString());
    assert.deepEqual(left, ["2026-11-07T13:30:00.000Z", "2026-11-07T14:00:00.000Z"]);
    const closed = consultant({
      ...c,
      exceptions: [{ date: SAT, kind: "OFF", startTime: null, endTime: null, slotMinutes: null, capacity: null, online: true, inPerson: true, audience: "BOTH" }],
    });
    assert.equal(slotsForConsultantOnDate(closed, SAT, "PUBLIC", "IN_PERSON", 30).length, 0);
  });

  it("opens an extra hour on a day that has no weekly window", () => {
    const c = consultant({
      exceptions: [{ date: "2026-11-08", kind: "EXTRA", startTime: "10:00", endTime: "11:00", slotMinutes: 30, capacity: 2, online: false, inPerson: true, audience: "SPECIAL" }],
      offersSpecial: true,
    });
    assert.equal(hasConfiguredRules(c, "SPECIAL", "IN_PERSON"), true);
    assert.equal(hasConfiguredRules(c, "PUBLIC", "IN_PERSON"), false);
    const slots = slotsForConsultantOnDate(c, "2026-11-08", "SPECIAL", "IN_PERSON", 30);
    assert.equal(slots.length, 2);
    assert.equal(slots[0].capacity, 2);
    assert.equal(slots[0].startsAt.toISOString(), tehranAt("2026-11-08", 10 * 60).toISOString());
  });

  it("hides full slots and slots inside the notice window", () => {
    const c = consultant({
      windows: [{ weekday: 0, startTime: "16:00", endTime: "17:00", slotMinutes: 30, capacity: 2, online: true, inPerson: false, audience: "BOTH" }],
    });
    const drafts = slotsForConsultantOnDate(c, SAT, "PUBLIC", "ONLINE", 30);
    const taken = new Map<string, number>([[`${c.id}|${drafts[0].startsAt.getTime()}`, 2]]);
    const now = new Date("2026-11-07T12:00:00.000Z");
    const open = withRemaining(drafts, taken, now, 120);
    assert.equal(open.length, 0);
    const later = withRemaining(drafts, taken, new Date("2026-11-07T10:00:00.000Z"), 60);
    assert.equal(later.length, 1);
    assert.equal(later[0].remaining, 2);
    assert.equal(later[0].startsAt.toISOString(), "2026-11-07T13:00:00.000Z");
  });

  it("does not offer an inactive consultant", () => {
    const c = consultant({
      active: false,
      windows: [{ weekday: 0, startTime: "16:00", endTime: "17:00", slotMinutes: 30, capacity: 1, online: true, inPerson: true, audience: "BOTH" }],
    });
    assert.equal(hasConfiguredRules(c, "PUBLIC", "ONLINE"), false);
    assert.equal(slotsForConsultantOnDate(c, SAT, "PUBLIC", "ONLINE", 30).length, 0);
  });

  it("picks the least-booked consultant, then sort order, then id", () => {
    assert.equal(pickFastestConsultant([]), null);
    assert.equal(
      pickFastestConsultant([
        { id: "b", sortOrder: 0, dayLoad: 2 },
        { id: "a", sortOrder: 5, dayLoad: 1 },
        { id: "c", sortOrder: 1, dayLoad: 1 },
      ]),
      "c",
    );
  });

  it("never gives two claims the same seat and frees it on cancel", () => {
    const taken = new Set<number>();
    assert.equal(claimSeat(taken, 2), 0);
    assert.equal(claimSeat(taken, 2), 1);
    assert.equal(claimSeat(taken, 2), null);
    taken.delete(0);
    assert.equal(nextSeat([...taken], 2), 0);
    assert.equal(claimSeat(taken, 2), 0);
  });

  it("round-trips a Jalali date through Tehran", () => {
    const key = jalaliToTehranKey(1405, 8, 16);
    assert.ok(key);
    const back = tehranKeyToJalali(key!);
    assert.deepEqual(back, { jy: 1405, jm: 8, jd: 16 });
  });
});

describe("consultation settings", () => {
  it("ignores invented schedules stored next to the settings", () => {
    const parsed = parseConsultSettings({ windows: [{ weekday: 0 }], consultants: ["nobody"], slotMinutes: 45, otpTemplateId: "0", publicOpen: false });
    assert.equal(parsed.slotMinutes, 45);
    assert.equal(parsed.publicOpen, false);
    assert.equal(parsed.otpTemplateId, null);
    assert.equal("windows" in parsed, false);
    assert.equal(parsed.horizonDays, 21);
  });

  it("covers grade 2 through Konkur and not grade 1", () => {
    assert.equal(isGradeId("g2"), true);
    assert.equal(isGradeId("konkur"), true);
    assert.equal(isGradeId("g1"), false);
    assert.ok(GRADES.some((g) => g.label === "پایه دوم"));
    assert.ok(GRADES.some((g) => g.label.includes("کنکور")));
    const labels: string[] = GRADES.map((g) => g.label);
    assert.equal(labels.includes("پایه اول"), false);
  });
});
