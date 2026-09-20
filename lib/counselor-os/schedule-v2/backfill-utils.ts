import { jalaliToGregorian, type JalaliDate } from "@/lib/datetime/jalali";
import { gregorianDateOnlyToJalaliParts } from "@/lib/datetime/jalali-form";
import { getPersianWeekdayIndex, tehranLocalToUtc } from "@/lib/datetime/tehran-zone";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function parseYmd(ymd: string): { gy: number; gm: number; gd: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return null;
  return { gy: Number(m[1]), gm: Number(m[2]), gd: Number(m[3]) };
}

function nextGregorianDay(gy: number, gm: number, gd: number): string {
  const d = new Date(Date.UTC(gy, gm - 1, gd + 1, 12, 0, 0));
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

export function eachJalaliDayInRange(
  fromYmd: string,
  untilYmd: string,
  overrides: Array<{
    weekday: number;
    startLocalTime: string;
    endLocalTime: string;
    validFrom?: Date | null;
    validUntil?: Date | null;
  }>,
): Array<{
  gregorianYmd: string;
  windows: Array<{ startLocalTime: string; endLocalTime: string }>;
}> {
  const from = parseYmd(fromYmd);
  const until = parseYmd(untilYmd);
  if (!from || !until) return [];

  const out: Array<{
    gregorianYmd: string;
    windows: Array<{ startLocalTime: string; endLocalTime: string }>;
  }> = [];

  let cursor = `${from.gy}-${pad2(from.gm)}-${pad2(from.gd)}`;
  const end = `${until.gy}-${pad2(until.gm)}-${pad2(until.gd)}`;

  for (let guard = 0; guard < 400; guard += 1) {
    if (cursor > end) break;
    const jalali = gregorianDateOnlyToJalaliParts(cursor);
    if (!jalali) break;
    const { gy, gm, gd } = jalaliToGregorian(jalali.jy, jalali.jm, jalali.jd);
    const noon = tehranLocalToUtc(gy, gm, gd, 12, 0, 0);
    const weekday = getPersianWeekdayIndex(noon);
    const dayRules = overrides.filter((rule) => {
      if (rule.weekday !== weekday) return false;
      const probe = new Date(Date.UTC(gy, gm - 1, gd, 12, 0, 0));
      if (rule.validFrom && probe < rule.validFrom) return false;
      if (rule.validUntil && probe > rule.validUntil) return false;
      return true;
    });
    if (dayRules.length > 0) {
      out.push({
        gregorianYmd: cursor,
        windows: dayRules.map((r) => ({
          startLocalTime: r.startLocalTime,
          endLocalTime: r.endLocalTime,
        })),
      });
    }
    const p = parseYmd(cursor)!;
    cursor = nextGregorianDay(p.gy, p.gm, p.gd);
  }

  return out;
}

export type { JalaliDate };
