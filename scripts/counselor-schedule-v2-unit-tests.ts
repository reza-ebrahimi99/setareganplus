import assert from "node:assert/strict";
import { enumerateSlotStartsInWindows } from "../lib/counselor-os/schedule-windows";
import { jalaliPartsToGregorianDateOnly } from "../lib/datetime/jalali-form";
import { gregorianDateOnlyToJalaliParts } from "../lib/datetime/jalali-form";
import { weekdayLabelForGregorianYmd } from "../lib/counselor-os/schedule-v2/local-date";
import { validateScheduleDays } from "../lib/counselor-os/schedule-v2/validate";

function test(name: string, fn: () => void) {
  fn();
  console.log(`✓ ${name}`);
}

test("1405/06/30 Monday 09-16 single window yields 7 slots at 60min", () => {
  const jy = 1405;
  const jm = 6;
  const jd = 30;
  const ymd = jalaliPartsToGregorianDateOnly(jy, jm, jd);
  const jBack = gregorianDateOnlyToJalaliParts(ymd);
  assert.equal(jBack?.jy, jy);
  assert.equal(jBack?.jm, jm);
  assert.equal(jBack?.jd, jd);
  assert.equal(weekdayLabelForGregorianYmd(ymd), "دوشنبه");

  const starts = enumerateSlotStartsInWindows({
    windows: [{ startLocalTime: "09:00", endLocalTime: "16:00" }],
    durationMinutes: 60,
    stepMinutes: 60,
  });
  assert.equal(starts.length, 7);

  validateScheduleDays(
    [
      {
        localDateGregorian: ymd,
        windows: [{ startLocalTime: "09:00", endLocalTime: "16:00" }],
      },
    ],
    60,
  );
});

test("two windows 09-12 and 13-16 yield 6 slots at 60min", () => {
  const starts = enumerateSlotStartsInWindows({
    windows: [
      { startLocalTime: "09:00", endLocalTime: "12:00" },
      { startLocalTime: "13:00", endLocalTime: "16:00" },
    ],
    durationMinutes: 60,
    stepMinutes: 60,
  });
  assert.equal(starts.length, 6);
});

console.log("\ncounselor schedule v2 unit tests passed");
