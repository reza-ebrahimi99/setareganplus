// Minimal Jalali <-> Gregorian conversion (jalaali-js algorithm), no dependencies.
const div = (a: number, b: number) => ~~(a / b);
const BREAKS = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];

function jalCal(jy: number) {
  const gy = jy + 621;
  let leapJ = -14, jp = BREAKS[0], jm = 0, jump = 0;
  for (let i = 1; i < BREAKS.length; i++) {
    jm = BREAKS[i]; jump = jm - jp;
    if (jy < jm) break;
    leapJ += div(jump, 33) * 8 + div(jump % 33, 4);
    jp = jm;
  }
  let n = jy - jp;
  leapJ += div(n, 33) * 8 + div((n % 33) + 3, 4);
  if (jump % 33 === 4 && jump - n === 4) leapJ += 1;
  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;
  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  return { gy, march };
}
function g2d(gy: number, gm: number, gd: number) {
  let d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4) + div(153 * ((gm + 9) % 12) + 2, 5) + gd - 34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}
function d2g(jdn: number) {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(j % 1461, 4) * 5 + 308;
  const gd = div(i % 153, 5) + 1, gm = (div(i, 153) % 12) + 1, gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}
function j2d(jy: number, jm: number, jd: number) {
  const r = jalCal(jy);
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}
/** Date (any tz) -> Jalali y/m/d as seen in Asia/Tehran. */
const FMT = new Intl.DateTimeFormat("en-u-ca-persian-nu-latn", { timeZone: "Asia/Tehran", year: "numeric", month: "numeric", day: "numeric" });
export function toJalali(d: Date): { jy: number; jm: number; jd: number } {
  const p = Object.fromEntries(FMT.formatToParts(d).map((x) => [x.type, x.value]));
  return { jy: Number.parseInt(p.year, 10), jm: Number.parseInt(p.month, 10), jd: Number.parseInt(p.day, 10) };
}
/** Jalali date + "HH:MM" Tehran time -> Date. */
export function fromJalali(jy: number, jm: number, jd: number, hm = "09:00"): Date {
  const { gy, gm, gd } = d2g(j2d(jy, jm, jd));
  const [h, m] = hm.split(":").map((x) => Number.parseInt(x, 10) || 0);
  return new Date(Date.UTC(gy, gm - 1, gd, h, m) - 3.5 * 3_600_000);
}
export const J_MONTHS = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
