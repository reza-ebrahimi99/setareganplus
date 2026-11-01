/**
 * Top Konkur ranks (رتبه‌های برتر کنکور), shown at /rotbe-bartar-konkur and on the home page.
 * Plain data, no database: to add a student, drop a 480×600 face-cropped webp into
 * public/honors/<year>/ and add one line below. Order inside a field doesn't matter
 * (sorted by rank); the best rank of each field is highlighted automatically.
 */
import { fa } from "@/lib/format";

export type HonorField = "riazi" | "tajrobi" | "ensani";

export type HonorStudent = {
  name: string;
  rank: number;
  field: HonorField;
  /** path under /public, e.g. "/honors/1405/sajjad-rafei.webp" (optional) */
  photo?: string;
  /** optional: accepted major / university, shown under the name */
  note?: string;
};

export type HonorYear = {
  year: number;
  /** who the results belong to */
  center: string;
  /** original announcement banner (optional), webp in two widths */
  banner?: { src: string; large: string; width: number; height: number };
  students: HonorStudent[];
};

export const FIELDS: Record<HonorField, { label: string; full: string }> = {
  riazi: { label: "ریاضی", full: "ریاضی و فیزیک" },
  tajrobi: { label: "تجربی", full: "علوم تجربی" },
  ensani: { label: "انسانی", full: "علوم انسانی" },
};
export const FIELD_ORDER: HonorField[] = ["riazi", "tajrobi", "ensani"];

const p = (year: number, slug: string) => `/honors/${year}/${slug}.webp`;

export const HONORS: HonorYear[] = [
  {
    year: 1405,
    center: "نمایندگی قلم‌چی نسیم‌شهر",
    banner: { src: "/honors/1405/banner-720.webp", large: "/honors/1405/banner-1200.webp", width: 1200, height: 1200 },
    students: [
      // ریاضی
      { name: "سجاد رافعی", rank: 75, field: "riazi", photo: p(1405, "sajjad-rafei") },
      { name: "متین لطف‌زاده", rank: 274, field: "riazi", photo: p(1405, "matin-lotfzadeh") },
      { name: "حسین محمدیان", rank: 564, field: "riazi", photo: p(1405, "hossein-mohammadian") },
      { name: "علی‌اصغر علی‌نژاد", rank: 1400, field: "riazi", photo: p(1405, "aliasghar-alinejad") },
      { name: "امیرمحمد صالحی", rank: 1700, field: "riazi", photo: p(1405, "amirmohammad-salehi") },
      // تجربی
      { name: "امیرحسین امیدی", rank: 518, field: "tajrobi", photo: p(1405, "amirhossein-omidi") },
      { name: "علی محمدی", rank: 1007, field: "tajrobi", photo: p(1405, "ali-mohammadi") },
      { name: "ابوالفضل سلیمانی", rank: 1100, field: "tajrobi", photo: p(1405, "abolfazl-soleimani") },
      { name: "امیرمهدی سلیمانی", rank: 1150, field: "tajrobi", photo: p(1405, "amirmahdi-soleimani") },
      // انسانی
      { name: "مائده عسگری", rank: 409, field: "ensani", photo: p(1405, "maedeh-asgari") },
      { name: "سودا پرنلو", rank: 1024, field: "ensani", photo: p(1405, "sooda-parnalou") },
      { name: "اسما اسکندری", rank: 1029, field: "ensani", photo: p(1405, "asma-eskandari") },
      { name: "نگار کوچک‌زاده", rank: 1250, field: "ensani", photo: p(1405, "negar-koochakzadeh") },
    ],
  },
];

export const HONORS_PATH = "/rotbe-bartar-konkur";

/** Latest year first. */
export function latestHonors(): HonorYear {
  return [...HONORS].sort((a, b) => b.year - a.year)[0];
}

/** Students of one field, best rank first. */
export function byField(y: HonorYear, f: HonorField): HonorStudent[] {
  return y.students.filter((s) => s.field === f).sort((a, b) => a.rank - b.rank);
}

/** Best student of each field (in FIELD_ORDER), skipping empty fields. */
export function toppers(y: HonorYear): HonorStudent[] {
  return FIELD_ORDER.map((f) => byField(y, f)[0]).filter(Boolean);
}

/* ------------------------------------------------------------------ */
/* Tabs of /rotbe-bartar-konkur                                        */
/* The first tab is the static banner data above; the other two read  */
/* live from prisma.achievement (managed in the admin panel).         */
/* ------------------------------------------------------------------ */
export type HonorTabKey = "konkur" | "ghabooli" | "tizhooshan";

export const HONOR_TABS: { key: HonorTabKey; label: string; short: string; category?: "KONKUR" | "GIFTED" }[] = [
  { key: "konkur", label: `کنکور ${fa(HONORS[0].year)}`, short: "رتبه‌های برتر" },
  { key: "ghabooli", label: "قبولی‌های کنکور سال‌های قبل", short: "قبولی دانشگاه", category: "KONKUR" },
  { key: "tizhooshan", label: "تیزهوشان و نمونه دولتی", short: "قبولی مدارس", category: "GIFTED" },
];

/** ?tab=… → tab key (unknown/missing → the default "konkur" tab). */
export function honorTab(raw: string | string[] | undefined): HonorTabKey {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return HONOR_TABS.some((t) => t.key === v) ? (v as HonorTabKey) : "konkur";
}

/** URL of a tab; the default tab is the bare page URL (no query). */
export function honorTabHref(key: HonorTabKey): string {
  return key === "konkur" ? HONORS_PATH : `${HONORS_PATH}?tab=${key}`;
}

/** Admin text often contains Arabic ي/ك; show Persian letters. */
export function faText(s: string | null | undefined): string {
  return (s ?? "").replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/\s+/g, " ").trim();
}

/** "پزشکی دانشگاه تهران" → { major: "پزشکی", uni: "دانشگاه تهران" } (best effort). */
export function splitMajor(detail: string | null | undefined): { major: string; uni: string } {
  const d = faText(detail);
  const m = d.match(/\s(دانشگاه|پردیس|دانشکده|مؤسسه|موسسه|آموزشکده)\s/);
  if (!m || m.index === undefined || m.index === 0) return { major: d, uni: "" };
  return { major: d.slice(0, m.index).trim(), uni: d.slice(m.index).trim() };
}
