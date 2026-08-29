/**
 * Lightweight Jalali/Tehran smoke checks for leap years and round-trips.
 * Run via: npx tsx lib/booking/jalali-smoke.ts
 */

import {
  formatJalaliDate,
  isLeapJalaliYear,
  jalaliMonthLength,
  jalaliTehranLocalToUtc,
  utcToJalaliInTehran,
} from "@/lib/datetime/jalali";
import { getPersianWeekdayIndex, getTehranParts } from "@/lib/datetime/tehran-zone";

function assert(cond: boolean, message: string) {
  if (!cond) throw new Error(message);
}

function main() {
  // 1403 is leap Jalali → Esfand has 30 days
  assert(isLeapJalaliYear(1403) === true, "1403 should be leap");
  assert(jalaliMonthLength(1403, 12) === 30, "Esfand 1403 length");

  // 1404 non-leap → Esfand 29
  assert(isLeapJalaliYear(1404) === false, "1404 should not be leap");
  assert(jalaliMonthLength(1404, 12) === 29, "Esfand 1404 length");

  // Nowruz 1405-01-01 round-trip Tehran local noon
  const nowruz = jalaliTehranLocalToUtc(1405, 1, 1, 12, 0);
  const back = utcToJalaliInTehran(nowruz);
  assert(back.jy === 1405 && back.jm === 1 && back.jd === 1, "Nowruz round-trip");

  // Saturday-first: 1405/01/01 should be a known weekday — just ensure index in 0..6
  const wd = getPersianWeekdayIndex(nowruz);
  assert(wd >= 0 && wd <= 6, "weekday index");

  const parts = getTehranParts(nowruz);
  assert(parts.hour === 12, `Tehran hour expected 12 got ${parts.hour}`);

  console.log(
    JSON.stringify(
      {
        ok: true,
        nowruzJalali: formatJalaliDate(back.jy, back.jm, back.jd),
        weekdayIndex: wd,
        tehranHour: parts.hour,
      },
      null,
      2,
    ),
  );
}

main();
