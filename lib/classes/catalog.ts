import { GRADES, gradeLabel } from "@/lib/consult/constants";

/** Display teacher on every seeded course. Staff can change it per course. */
export const TEACHER = "مهندس رضا ابراهیمی";

/**
 * Placeholder list price (rials) so a free course can show a struck-through value.
 * 2_500_000 rials = ۲۵۰ هزار تومان. Staff should confirm this in the admin before advertising.
 */
export const SEED_LIST_PRICE_RIALS = 2_500_000;
/** Struck-through price shown on premium courses: ۴۹۰ هزار تومان. */
export const PREMIUM_LIST_PRICE_RIALS = 4_900_000;
export const NEW_LESSON_DAYS = 14;

export const WATCH_POINTS = 20;
export const QUIZ_POINT_EACH = 10;
export const QUIZ_PERFECT_BONUS = 15;
export const COURSE_POINTS = 50;
export const MAX_QUIZ_QUESTIONS = 5;
export const HEARTBEAT_MAX_SEC = 20;
export const UNKNOWN_DURATION_CAP = 3 * 60 * 60;

export const TOPIC_DEFS = [
  { slug: "tabe", title: "تابع" },
  { slug: "moshtagh", title: "مشتق" },
  { slug: "shomaresh", title: "شمارش و احتمال" },
  { slug: "had", title: "حد و پیوستگی" },
  { slug: "mosallasat", title: "مثلثات" },
  { slug: "donbale", title: "دنباله" },
  { slug: "logaritm", title: "لگاریتم و تابع نمایی" },
  { slug: "mohasebat", title: "محاسبات سریع" },
  { slug: "moadele", title: "معادله درجه ۲" },
  { slug: "hendese", title: "هندسه تحلیلی" },
] as const;

/** Suggested teaching order for the learning-path seed. */
export const PATH_ORDER = ["mohasebat", "moadele", "tabe", "mosallasat", "had", "moshtagh", "donbale", "logaritm", "shomaresh", "hendese"] as const;

export const FIELDS = [
  { id: "riazi", label: "ریاضی" },
  { id: "tajrobi", label: "تجربی" },
  { id: "ensani", label: "انسانی" },
] as const;

export type FieldId = (typeof FIELDS)[number]["id"];
export const FIELD_IDS = new Set<string>(FIELDS.map((f) => f.id));
export const fieldLabel = (id: string) => FIELDS.find((f) => f.id === id)?.label ?? id;

export const MAJOR_GRADES = new Set(["g10", "g11", "g12", "konkur"]);
export const GRADE_IDS = GRADES.map((g) => g.id);
export const isFieldId = (v: string): v is FieldId => FIELD_IDS.has(v);
export const isGrade = (v: string) => GRADE_IDS.includes(v as (typeof GRADE_IDS)[number]);

export const BADGES = {
  streak_7: { title: "۷ روز پشت سر هم", text: "هفت روز پیاپی سر کلاس بودی." },
  course_complete: { title: "دوره کامل شد", text: "همهٔ جلسه‌های این دوره را تمام کردی." },
} as const;

/** Dev OTP is allowed only outside production. No env flag can turn it on in production. */
export function devOtpAllowed(nodeEnv: string | undefined) {
  return nodeEnv !== "production";
}

export function topicFromPlaylist(name: string) {
  const parts = name.split("|").map((s) => s.trim()).filter(Boolean);
  if (parts[0] !== "ریاضی جامع") return null;
  return TOPIC_DEFS.find((t) => t.title === parts[1]) ?? null;
}

export function parseAparatHash(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  const fromHash = raw.match(/videohash\/([A-Za-z0-9]{4,32})/i);
  if (fromHash) return fromHash[1];
  const fromV = raw.match(/\/v\/([A-Za-z0-9]{4,32})/i);
  if (fromV) return fromV[1];
  const fromEmbed = raw.match(/\/embed\/([A-Za-z0-9]{4,32})/i);
  if (fromEmbed && fromEmbed[1].toLowerCase() !== "videohash") return fromEmbed[1];
  if (/^[A-Za-z0-9]{4,32}$/.test(raw)) return raw;
  return null;
}

export function playerSrc(hash: string) {
  const h = encodeURIComponent(hash);
  return `https://www.aparat.com/video/video/embed/videohash/${h}/vt/frame?titleShow=false&recom=false&startTime=0`;
}

export function parseDuration(v: string | null | undefined): number | null {
  if (!v) return null;
  const p = v.trim().split(":").map((x) => Number(x));
  if (p.length < 2 || p.length > 3 || p.some((n) => !Number.isInteger(n) || n < 0)) return null;
  if (p.length === 2) return p[0] * 60 + p[1];
  return p[0] * 3600 + p[1] * 60 + p[2];
}

export function cleanDescription(raw: string): string {
  let t = raw.replace(/\r/g, "").trim();
  const cut = t.search(/\n\s*(موسسه|مؤسسه|#)/);
  if (cut > 20) t = t.slice(0, cut);
  return t.replace(/https?:\/\/\S+/g, "").replace(/#[^\s#]+/g, "").replace(/\n{3,}/g, "\n\n").trim().slice(0, 1200);
}

export type PriceInput = { isFree: boolean; priceRials: number; salePriceRials: number | null };
export type PriceView =
  | { kind: "free"; list: number | null }
  | { kind: "sale"; list: number; sale: number; off: number }
  | { kind: "full"; price: number };

export function courseShowsPremium(course: { isPremium?: boolean }, lessons: { isPremium?: boolean; published?: boolean }[]) {
  if (course.isPremium) return true;
  return lessons.some((l) => l.isPremium && l.published !== false);
}

/** Premium courses that still carry the archive list price display ۴۹۰ هزار تومان. A custom admin price is kept. */
export function presentPrice<T extends { isFree: boolean; priceRials: number }>(course: T, premium: boolean): T {
  if (!premium || !course.isFree) return course;
  if (course.priceRials === 0 || course.priceRials === SEED_LIST_PRICE_RIALS) return { ...course, priceRials: PREMIUM_LIST_PRICE_RIALS };
  return course;
}

export function isNewLesson(createdAt: Date, now = Date.now()) {
  return now - createdAt.getTime() < NEW_LESSON_DAYS * 24 * 60 * 60 * 1000;
}

export function orderLessons<T extends { isPremium?: boolean; sortOrder: number }>(lessons: T[]) {
  return [...lessons].sort((a, b) => Number(!!b.isPremium) - Number(!!a.isPremium) || a.sortOrder - b.sortOrder);
}

export function coursePrice(c: PriceInput): PriceView {
  if (c.isFree) return { kind: "free", list: c.priceRials > 0 ? c.priceRials : null };
  const sale = c.salePriceRials;
  if (sale != null && sale > 0 && c.priceRials > sale) {
    return { kind: "sale", list: c.priceRials, sale, off: Math.round((1 - sale / c.priceRials) * 100) };
  }
  return { kind: "full", price: Math.max(0, c.priceRials) };
}

export function chargeRials(c: PriceInput): number {
  const p = coursePrice(c);
  if (p.kind === "free") return 0;
  if (p.kind === "sale") return p.sale;
  return p.price;
}

export function canWatchLesson(opts: { published: boolean; coursePublished: boolean; freePreview: boolean; loggedIn: boolean; enrolled: boolean }) {
  if (!opts.published || !opts.coursePublished) return false;
  if (!opts.loggedIn) return false;
  if (opts.freePreview) return true;
  return opts.enrolled;
}

export function lessonPath(courseSlug: string, hash: string) {
  return `/classes/${courseSlug}/${hash}`;
}

export function safeNext(raw: string | null | undefined) {
  if (!raw || !raw.startsWith("/classes") || raw.startsWith("//") || raw.includes("://") || raw.includes("\\")) return "/classes";
  return raw.slice(0, 300);
}

export function fieldsLabel(ids: string[]) {
  const labels = FIELDS.filter((f) => ids.includes(f.id)).map((f) => f.label);
  if (labels.length === 0) return "همهٔ رشته‌ها";
  if (labels.length === 3) return "ریاضی، تجربی و انسانی";
  if (labels.length === 2) return labels.join(" و ");
  return labels[0];
}

export function levelLabel(grades: string[]) {
  const ordered = GRADES.filter((g) => grades.includes(g.id));
  if (ordered.length === 0) return "همهٔ پایه‌ها";
  if (ordered.length === 1) return ordered[0].label;
  if (ordered.length <= 3) return ordered.map((g) => g.label).join("، ");
  return `${ordered[0].label} تا ${ordered[ordered.length - 1].label}`;
}

export function formatClock(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export function formatLength(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  if (h && m) return `${h} ساعت و ${m} دقیقه`;
  if (h) return `${h} ساعت`;
  return `${Math.max(1, Math.round(sec / 60))} دقیقه`;
}

export function acceptWatchDelta(input: { deltaSec: number; elapsedSec: number | null; watchedSec: number; durationSec: number | null }) {
  const cap = input.durationSec && input.durationSec > 0 ? input.durationSec : UNKNOWN_DURATION_CAP;
  const room = Math.max(0, cap - Math.max(0, input.watchedSec));
  let max = HEARTBEAT_MAX_SEC;
  if (input.elapsedSec != null && Number.isFinite(input.elapsedSec)) max = Math.min(max, Math.max(0, Math.floor(input.elapsedSec) + 2));
  else max = Math.min(max, 15);
  const add = Math.max(0, Math.min(room, max, Math.floor(input.deltaSec)));
  const seconds = Math.max(0, input.watchedSec) + add;
  const completed = !!(input.durationSec && input.durationSec > 0 && seconds >= Math.floor(input.durationSec * 0.9));
  return { add, seconds, completed };
}

export function markWatched(watched: number, duration: number | null) {
  if (duration && duration > 0) return { seconds: Math.max(watched, duration), completed: true as const };
  return { seconds: Math.max(0, watched), completed: true as const };
}

/** 70% watch, 30% best quiz. Lessons without a quiz are watch-only. */
export function lessonFraction(input: { watchedSec: number; durationSec: number | null; completed: boolean; quizScore: number | null; quizTotal: number | null; hasQuiz: boolean }) {
  const watch = input.completed ? 1 : input.durationSec && input.durationSec > 0 ? Math.min(1, Math.max(0, input.watchedSec) / input.durationSec) : input.watchedSec > 0 ? 0.15 : 0;
  if (!input.hasQuiz) return watch;
  const quiz = input.quizTotal && input.quizScore != null ? Math.min(1, Math.max(0, input.quizScore) / input.quizTotal) : 0;
  return watch * 0.7 + quiz * 0.3;
}

export function quizPoints(score: number, total: number) {
  if (total <= 0 || score <= 0) return 0;
  return score * QUIZ_POINT_EACH + (score === total ? QUIZ_PERFECT_BONUS : 0);
}

export function publicName(firstName: string, lastName: string) {
  const first = firstName.trim();
  const last = lastName.trim();
  return last ? `${first} ${last[0]}.` : first;
}

export function tehranDay(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export function shiftDay(day: string, delta: number) {
  const [y, m, d] = day.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  utc.setUTCDate(utc.getUTCDate() + delta);
  return utc.toISOString().slice(0, 10);
}

/** Iranian week starts Saturday. Returns the Tehran civil date of that Saturday. */
export function tehranWeekStart(now = new Date()) {
  const wd = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Tehran", weekday: "short" }).format(now);
  const map: Record<string, number> = { Sat: 0, Sun: 1, Mon: 2, Tue: 3, Wed: 4, Thu: 5, Fri: 6 };
  return shiftDay(tehranDay(now), -(map[wd] ?? 0));
}

export function tehranMidnight(day: string) {
  return new Date(`${day}T00:00:00+03:30`);
}

export function gradeWord(id: string) {
  return gradeLabel(id).replace(/^پایه\s+/, "").replace(" (داوطلب)", "");
}

export { GRADES, gradeLabel };
