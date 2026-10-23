const FA = "۰۱۲۳۴۵۶۷۸۹";
const AR = "٠١٢٣٤٥٦٧٨٩";

/** Convert ASCII digits to Persian digits. */
export function fa(input: string | number | null | undefined): string {
  if (input === null || input === undefined) return "";
  return String(input).replace(/[0-9]/g, (d) => FA[Number(d)]);
}

/** Convert Persian/Arabic digits to ASCII. */
export function toEn(input: string): string {
  return input
    .replace(/[۰-۹]/g, (d) => String(FA.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(AR.indexOf(d)));
}

const jalaliFmt = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const jalaliTimeFmt = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Tehran",
});

export function jalaliDate(d: Date | string): string {
  return jalaliFmt.format(new Date(d));
}
export function jalaliDateTime(d: Date | string): string {
  return jalaliTimeFmt.format(new Date(d));
}

/** "02156766772" -> "۰۲۱-۵۶۷۶۶۷۷۲", "09380190586" -> "۰۹۳۸-۰۱۹-۰۵۸۶" */
export function prettyPhone(raw: string): string {
  const n = toEn(raw).replace(/\D/g, "");
  if (n.startsWith("09") && n.length === 11) return fa(`${n.slice(0, 4)}-${n.slice(4, 7)}-${n.slice(7)}`);
  if (n.startsWith("0") && n.length === 11) return fa(`${n.slice(0, 3)}-${n.slice(3)}`);
  return fa(raw);
}
export function telHref(raw: string): string {
  return "tel:" + toEn(raw).replace(/[^\d+]/g, "");
}

/** Iranian mobile: 09xxxxxxxxx (accepts +98 / 0098 / Persian digits). */
export function normalizeIranMobile(raw: string): string | null {
  let n = toEn(raw).replace(/[\s\-()]/g, "");
  if (n.startsWith("+98")) n = "0" + n.slice(3);
  else if (n.startsWith("0098")) n = "0" + n.slice(4);
  else if (n.startsWith("98") && n.length === 12) n = "0" + n.slice(2);
  else if (n.startsWith("9") && n.length === 10) n = "0" + n;
  return /^09\d{9}$/.test(n) ? n : null;
}

export function slugify(s: string): string {
  const base = toEn(s)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "item";
}
