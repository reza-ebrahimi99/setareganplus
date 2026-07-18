/**
 * Known conversion case for CRM follow-up pickers (no DB).
 * Run: npx tsx scripts/crm-jalali-followup-smoke.ts
 */
import {
  formatJalaliDateAscii,
  formatJalaliDateTimeShort,
  jalaliTehranLocalToUtc,
  utcToJalaliInTehran,
} from "../lib/datetime/jalali";
import { formatTehranTime24 } from "../lib/datetime/tehran-zone";

const utc = jalaliTehranLocalToUtc(1405, 4, 28, 14, 30);
const back = utcToJalaliInTehran(utc);

console.log(
  JSON.stringify(
    {
      jalaliTehranInput: "1405/04/28 14:30",
      utcIso: utc.toISOString(),
      displayedJalali: formatJalaliDateTimeShort(utc),
      roundtripDateAscii: formatJalaliDateAscii(back.jy, back.jm, back.jd),
      roundtripTimeAscii: formatTehranTime24(utc),
      ok:
        formatJalaliDateAscii(back.jy, back.jm, back.jd) === "1405/04/28" &&
        formatTehranTime24(utc) === "14:30",
    },
    null,
    2,
  ),
);
