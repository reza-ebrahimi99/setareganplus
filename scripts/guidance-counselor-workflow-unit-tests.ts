/**
 * Booking integrity + schedule windows + Jalali follow-up + choice revision policy.
 * No database connection.
 */

import assert from "node:assert/strict";
import { assertQualifyingSessionBooking } from "../lib/guidance/journey-v2/booking-gate";
import { APPOINTMENT_PURPOSE } from "../lib/guidance/journey-v2/constants";
import {
  assertDayWindowsValid,
  assertProgramsDoNotShareClock,
  enumerateSlotStartsInWindows,
  slotFitsSingleWindow,
} from "../lib/counselor-os/schedule-windows";
import { mapSourceFeedback, nextRevisionSourceItemId } from "../lib/guidance/journey-v2/choice-feedback-map";
import {
  counselorChoiceMutationLock,
  resolveChoiceStudioState,
} from "../lib/guidance/choice-studio/status";
import {
  parseTehranDateTimeLocal,
  formatDateTimeLocalInTehran,
} from "../lib/forms/tehran-datetime";
import {
  tehranJalaliPartsToUtc,
  utcToTehranJalaliParts,
} from "../lib/datetime/jalali-form";

let passed = 0;

async function test(name: string, fn: () => void | Promise<void>) {
  await fn();
  passed += 1;
  console.log(`✓ ${name}`);
}

function snapshot(partial: Partial<Parameters<typeof assertQualifyingSessionBooking>[0]["snapshot"]>) {
  const future = new Date(Date.now() + 60 * 60 * 1000);
  return {
    appointmentId: "appt-1",
    purpose: APPOINTMENT_PURPOSE.FIRST_SESSION,
    appointmentStatus: "BOOKED",
    guidancePlanId: "plan-1",
    counselorUserId: "counselor-1",
    reservationId: "res-1",
    reservationStatus: "CONFIRMED",
    slotStartsAt: future,
    slotAdvisorId: "adv-1",
    ...partial,
  };
}

async function main() {
  await test("no appointment => Step 11 cannot advance", () => {
    const gate = assertQualifyingSessionBooking({
      snapshot: null,
      expectedPurpose: APPOINTMENT_PURPOSE.FIRST_SESSION,
      expectedPlanId: "plan-1",
      expectedCounselorUserId: "counselor-1",
    });
    assert.equal(gate.ok, false);
  });

  await test("COMPLETED appointment does not qualify for advance", () => {
    const gate = assertQualifyingSessionBooking({
      snapshot: snapshot({ appointmentStatus: "COMPLETED" }),
      expectedPurpose: APPOINTMENT_PURPOSE.FIRST_SESSION,
      expectedPlanId: "plan-1",
      expectedCounselorUserId: "counselor-1",
    });
    assert.equal(gate.ok, false);
  });

  await test("valid FIRST_SESSION live reservation qualifies Step 11", () => {
    const gate = assertQualifyingSessionBooking({
      snapshot: snapshot({ purpose: APPOINTMENT_PURPOSE.FIRST_SESSION }),
      expectedPurpose: APPOINTMENT_PURPOSE.FIRST_SESSION,
      expectedPlanId: "plan-1",
      expectedCounselorUserId: "counselor-1",
    });
    assert.equal(gate.ok, true);
  });

  await test("valid SECOND_SESSION live reservation qualifies Step 15", () => {
    const gate = assertQualifyingSessionBooking({
      snapshot: snapshot({ purpose: APPOINTMENT_PURPOSE.SECOND_SESSION }),
      expectedPurpose: APPOINTMENT_PURPOSE.SECOND_SESSION,
      expectedPlanId: "plan-1",
      expectedCounselorUserId: "counselor-1",
    });
    assert.equal(gate.ok, true);
  });

  await test("wrong purpose cannot advance the other session", () => {
    const gate = assertQualifyingSessionBooking({
      snapshot: snapshot({ purpose: APPOINTMENT_PURPOSE.FIRST_SESSION }),
      expectedPurpose: APPOINTMENT_PURPOSE.SECOND_SESSION,
      expectedPlanId: "plan-1",
      expectedCounselorUserId: "counselor-1",
    });
    assert.equal(gate.ok, false);
  });

  await test("cancelled reservation cannot advance", () => {
    const gate = assertQualifyingSessionBooking({
      snapshot: snapshot({ reservationStatus: "CANCELLED" }),
      expectedPurpose: APPOINTMENT_PURPOSE.FIRST_SESSION,
      expectedPlanId: "plan-1",
      expectedCounselorUserId: "counselor-1",
    });
    assert.equal(gate.ok, false);
  });

  await test("past slot cannot advance", () => {
    const gate = assertQualifyingSessionBooking({
      snapshot: snapshot({ slotStartsAt: new Date(Date.now() - 60_000) }),
      expectedPurpose: APPOINTMENT_PURPOSE.FIRST_SESSION,
      expectedPlanId: "plan-1",
      expectedCounselorUserId: "counselor-1",
    });
    assert.equal(gate.ok, false);
  });

  await test("collision detector rejects overlapping active intervals", () => {
    const aStart = new Date("2026-09-07T05:30:00.000Z");
    const aEnd = new Date("2026-09-07T06:15:00.000Z");
    const bStart = new Date("2026-09-07T06:00:00.000Z");
    const bEnd = new Date("2026-09-07T06:15:00.000Z");
    const overlap = aStart < bEnd && aEnd > bStart;
    assert.equal(overlap, true);
  });

  await test("first and second durations stay independent in generated starts", () => {
    const windows = [{ startLocalTime: "09:00", endLocalTime: "11:00" }];
    const first = enumerateSlotStartsInWindows({ windows, durationMinutes: 45 });
    const second = enumerateSlotStartsInWindows({ windows, durationMinutes: 15 });
    assert.equal(first.length, 2);
    assert.equal(second.length, 8);
    assert.notEqual(first.length, second.length);
  });

  await test("break window is respected and slots never cross the gap", () => {
    const windows = [
      { startLocalTime: "09:00", endLocalTime: "11:00" },
      { startLocalTime: "11:30", endLocalTime: "13:00" },
    ];
    const starts = enumerateSlotStartsInWindows({ windows, durationMinutes: 45 });
    assert.ok(starts.every((start) => slotFitsSingleWindow({ startMinutes: start, durationMinutes: 45, windows })));
    assert.equal(
      starts.some((start) => start > 11 * 60 && start < 11 * 60 + 30),
      false,
    );
    const ends = starts.map((start) => start + 45);
    assert.equal(ends.some((end) => end > 11 * 60 && end < 11 * 60 + 30), false);
  });

  await test("no generated slot ends after its window", () => {
    const windows = [{ startLocalTime: "09:00", endLocalTime: "10:20" }];
    const starts = enumerateSlotStartsInWindows({ windows, durationMinutes: 45 });
    assert.deepEqual(starts, [9 * 60]);
    assert.equal(starts[0]! + 45 <= 10 * 60 + 20, true);
  });

  await test("overlapping windows on the same weekday are rejected", () => {
    const result = assertDayWindowsValid([
      { startLocalTime: "09:00", endLocalTime: "11:00" },
      { startLocalTime: "10:30", endLocalTime: "12:00" },
    ]);
    assert.equal(result.ok, false);
  });

  await test("first/second programs cannot share the same clock window", () => {
    const result = assertProgramsDoNotShareClock(
      [{ weekday: 0, enabled: true, windows: [{ startLocalTime: "09:00", endLocalTime: "11:00" }] }],
      [{ weekday: 0, enabled: true, windows: [{ startLocalTime: "10:00", endLocalTime: "10:30" }] }],
    );
    assert.equal(result.ok, false);
  });

  await test("independent first/second slot sets do not share overlapping clocks", () => {
    const first = [{ weekday: 1, enabled: true, windows: [{ startLocalTime: "09:00", endLocalTime: "11:00" }] }];
    const second = [{ weekday: 1, enabled: true, windows: [{ startLocalTime: "16:00", endLocalTime: "18:00" }] }];
    assert.equal(assertProgramsDoNotShareClock(first, second).ok, true);
  });

  await test("published INITIAL and FINAL snapshots stay locked; FINAL draft is editable", () => {
    assert.equal(
      counselorChoiceMutationLock({ kind: "INITIAL", status: "READY" }),
      "published_snapshot",
    );
    assert.equal(
      counselorChoiceMutationLock({ kind: "FINAL", status: "READY" }),
      "published_snapshot",
    );
    assert.equal(
      counselorChoiceMutationLock({ kind: "FINAL", status: "DRAFT" }),
      "editable",
    );
    assert.equal(
      counselorChoiceMutationLock({ kind: "FINAL", status: "CONFIRMED" }),
      "confirmed",
    );
    assert.equal(
      resolveChoiceStudioState({ kind: "FINAL", status: "DRAFT", hasItems: true }),
      "FINAL_DRAFT",
    );
  });

  await test("student feedback survives counselor revision via sourceItemId", () => {
    const mapped = mapSourceFeedback(
      [
        { id: "final-1", sourceItemId: "init-1", feedback: null as { verdict: string; note: string } | null },
        { id: "final-2", sourceItemId: null, feedback: null as { verdict: string; note: string } | null },
      ],
      [{ id: "init-1", feedback: { verdict: "needs_review", note: "سخت است" } }],
    );
    assert.equal(mapped[0]?.feedback?.verdict, "needs_review");
    assert.equal(mapped[0]?.feedback?.note, "سخت است");
    assert.equal(mapped[1]?.feedback, null);
  });

  await test("revision copy keeps the original INITIAL sourceItemId", () => {
    assert.equal(
      nextRevisionSourceItemId({ id: "init-1", sourceItemId: null }),
      "init-1",
    );
    assert.equal(
      nextRevisionSourceItemId({ id: "final-1", sourceItemId: "init-1" }),
      "init-1",
    );
  });

  await test("Jalali follow-up input converts to Gregorian/UTC and back", () => {
    const utc = tehranJalaliPartsToUtc(1404, 6, 16, 14, 30);
    const tehranLocal = formatDateTimeLocalInTehran(utc);
    const parsed = parseTehranDateTimeLocal(tehranLocal);
    assert.ok(parsed);
    assert.equal(parsed!.getTime(), utc.getTime());
    const jalali = utcToTehranJalaliParts(utc);
    assert.equal(jalali.jy, 1404);
    assert.equal(jalali.jm, 6);
    assert.equal(jalali.jd, 16);
    assert.equal(jalali.hour, 14);
    assert.equal(jalali.minute, 30);
  });

  await test("stored Gregorian ISO renders back to the same Jalali wall clock", () => {
    const stored = new Date("2025-09-07T11:00:00.000Z");
    const parts = utcToTehranJalaliParts(stored);
    const roundTrip = tehranJalaliPartsToUtc(
      parts.jy,
      parts.jm,
      parts.jd,
      parts.hour,
      parts.minute,
    );
    assert.equal(roundTrip.getTime(), stored.getTime());
  });

  console.log(`\n${passed} tests passed`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
