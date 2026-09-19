import assert from "node:assert/strict";
import { normalizeLocalTimeHm } from "../lib/datetime/tehran-zone";
import { fromPersianDigits } from "../lib/persian";
import { daysFromProgram, serializeDays } from "../lib/counselor-os/schedule-form-utils";
import {
  assertDayWindowsValid,
  enumerateSlotStartsInWindows,
} from "../lib/counselor-os/schedule-windows";
import { parseWeeklyProgramJson } from "../lib/counselor-os/schedule";

function test(name: string, fn: () => void) {
  fn();
  console.log(`✓ ${name}`);
}

test("normalizeLocalTimeHm accepts Persian digits and seconds", () => {
  assert.equal(normalizeLocalTimeHm("۱۳:۰۰:00"), "13:00");
  assert.equal(normalizeLocalTimeHm("16:00"), "16:00");
});

test("daysFromProgram marks disabled days without showing stale enabled UI", () => {
  const draft = daysFromProgram([
    { weekday: 0, enabled: true, windows: [{ startLocalTime: "13:00", endLocalTime: "16:00" }] },
    { weekday: 1, enabled: false, windows: [] },
  ]);
  assert.equal(draft[0].enabled, true);
  assert.equal(draft[0].windows[0].start, "13:00");
  assert.equal(draft[1].enabled, false);
});

test("serialize round-trip preserves enabled windows", () => {
  const draft = daysFromProgram([
    {
      weekday: 2,
      enabled: true,
      windows: [
        { startLocalTime: "09:00", endLocalTime: "12:00" },
        { startLocalTime: "16:00", endLocalTime: "19:00" },
      ],
    },
  ]);
  const parsed = parseWeeklyProgramJson(serializeDays(draft));
  assert.equal(parsed[2].enabled, true);
  assert.equal(parsed[2].windows.length, 2);
});

test("assertDayWindowsValid rejects overlap and short windows", () => {
  const overlap = assertDayWindowsValid([
    { startLocalTime: "09:00", endLocalTime: "12:00" },
    { startLocalTime: "11:00", endLocalTime: "13:00" },
  ]);
  assert.equal(overlap.ok, false);

  const short = assertDayWindowsValid(
    [{ startLocalTime: "09:00", endLocalTime: "09:30" }],
    45,
  );
  assert.equal(short.ok, false);
});

test("enumerateSlotStartsInWindows respects duration and break gap", () => {
  const starts = enumerateSlotStartsInWindows({
    windows: [
      { startLocalTime: "09:00", endLocalTime: "10:00" },
      { startLocalTime: "11:00", endLocalTime: "12:00" },
    ],
    durationMinutes: 45,
    stepMinutes: 45,
  });
  assert.deepEqual(starts, [9 * 60, 11 * 60]);
});

test("fromPersianDigits normalizes digits only", () => {
  assert.equal(fromPersianDigits("۱۴۰۴/۰۱/۱۵").includes("1404"), true);
});

console.log("\ncounselor schedule unit tests passed");
