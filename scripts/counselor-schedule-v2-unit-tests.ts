import assert from "node:assert/strict";
import { enumerateSlotStartsInWindows } from "../lib/counselor-os/schedule-windows";
import { jalaliPartsToGregorianDateOnly } from "../lib/datetime/jalali-form";
import { gregorianDateOnlyToJalaliParts } from "../lib/datetime/jalali-form";
import { weekdayLabelForGregorianYmd } from "../lib/counselor-os/schedule-v2/local-date";
import { validateScheduleDays } from "../lib/counselor-os/schedule-v2/validate";
import { computeSchedulePreview } from "../lib/counselor-os/schedule-v2/preview-compute";
import {
  resolveSchedulePlanTitle,
  suggestSchedulePlanTitle,
} from "../lib/counselor-os/schedule-v2/plan-title";
import { CounselorScheduleSessionKind } from "../generated/prisma/enums";
import { bookableCounselorSlotWhere } from "../lib/counselor-os/schedule-v2/student-slot-access";

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

test("1405/06/31 preview compute yields 3 slots 09-12 at 60min", () => {
  const ymd = jalaliPartsToGregorianDateOnly(1405, 6, 31);
  assert.equal(weekdayLabelForGregorianYmd(ymd), "سه‌شنبه");
  const preview = computeSchedulePreview({
    sessionMinutes: 60,
    days: [
      {
        localDateGregorian: ymd,
        windows: [{ startLocalTime: "09:00", endLocalTime: "12:00" }],
      },
    ],
  });
  assert.equal(preview.ok, true);
  if (preview.ok) {
    assert.equal(preview.totalSlots, 3);
    assert.equal(preview.days[0]?.slots.length, 3);
  }
});

test("duplicate localDate rejected in preview", () => {
  const ymd = jalaliPartsToGregorianDateOnly(1405, 6, 31);
  const preview = computeSchedulePreview({
    sessionMinutes: 60,
    days: [
      {
        localDateGregorian: ymd,
        windows: [{ startLocalTime: "09:00", endLocalTime: "12:00" }],
      },
      {
        localDateGregorian: ymd,
        windows: [{ startLocalTime: "13:00", endLocalTime: "16:00" }],
      },
    ],
  });
  assert.equal(preview.ok, false);
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

test("1405/06/30 13-17 window yields 4 slots at 60min", () => {
  const ymd = jalaliPartsToGregorianDateOnly(1405, 6, 30);
  const preview = computeSchedulePreview({
    sessionMinutes: 60,
    days: [
      {
        localDateGregorian: ymd,
        windows: [{ startLocalTime: "13:00", endLocalTime: "17:00" }],
      },
    ],
  });
  assert.equal(preview.ok, true);
  if (preview.ok) assert.equal(preview.totalSlots, 4);
});

test("auto title from date range", () => {
  const ymd1 = jalaliPartsToGregorianDateOnly(1405, 6, 31);
  const ymd2 = jalaliPartsToGregorianDateOnly(1405, 7, 2);
  const title = suggestSchedulePlanTitle({
    sessionKind: CounselorScheduleSessionKind.FIRST_SESSION,
    dayYmds: [ymd1, ymd2],
  });
  assert.match(title, /جلسه اول/);
  assert.match(title, /تا/);
  const resolved = resolveSchedulePlanTitle({
    title: "  ",
    sessionKind: CounselorScheduleSessionKind.FIRST_SESSION,
    dayYmds: [ymd1],
  });
  assert.ok(resolved && resolved.includes("جلسه اول"));
});

test("bookable slot where requires active plan id when present", () => {
  const now = new Date();
  const end = new Date(now.getTime() + 86400000);
  const where = bookableCounselorSlotWhere({
    organizationId: "org",
    serviceId: "svc",
    advisorId: "adv",
    now,
    endDate: end,
    activePlanId: "plan-1",
  });
  assert.equal((where as { schedulePlanId?: string }).schedulePlanId, "plan-1");
});

console.log("\ncounselor schedule v2 unit tests passed");
