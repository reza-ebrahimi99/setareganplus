/**
 * Premium lessons the seed upserts by video hash. Other lessons are left untouched.
 *
 * The list in this file is committed. Extra lessons can be added without a code
 * push by writing JSON at PREMIUM_LESSONS_FILE (default
 * /var/www/setareganplus-lean-data/premium-lessons.json). A missing file is ignored.
 *
 *   [
 *     { "hash": "abc1234", "courseSlug": "hendese", "title": "…", "durationSec": 1248,
 *       "cover": "/var/www/setareganplus-lean-data/covers/abc1234.png" }
 *   ]
 *
 * `cover` may be an absolute file path, a path next to the JSON file, a site path
 * such as /classes/covers/….png, or an http(s) URL. A file or URL is copied into
 * the upload directory and served from /media/class-covers/. Optional fields:
 * sortOrder (defaults to after the other premium lessons of that course), grades
 * (defaults to the course's grades), description.
 */
import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { isGrade } from "./catalog";

export const DEFAULT_PREMIUM_LESSONS_FILE = "/var/www/setareganplus-lean-data/premium-lessons.json";

export type PremiumSeedLesson = {
  courseSlug: string;
  aparatHash: string;
  title: string;
  durationSec: number;
  /** Order among premium lessons of the course. Lower comes first. */
  sortOrder: number;
  /** Omitted means "use the course's grades" and do not change the course. */
  grades?: string[];
  /** Public path, for example /classes/covers/…. */
  poster: string;
  description?: string;
};

export type PremiumLessonDraft = {
  courseSlug: string;
  aparatHash: string;
  title: string;
  durationSec: number;
  sortOrder?: number;
  grades?: string[];
  poster?: string;
  /** File path, site path, or http(s) URL. Resolved before insert. */
  cover?: string;
  description?: string;
};

export const PREMIUM_SEED_LESSONS: PremiumSeedLesson[] = [
  {
    courseSlug: "moadele",
    aparatHash: "orw02g2",
    title: "معادله درجه ۲ - قسمت اول",
    durationSec: 48 * 60 + 43,
    sortOrder: 0,
    grades: ["g9", "g10", "g11", "g12"],
    poster: "/classes/covers/moadele-1-premium.png",
    description: "قسمت اول معادله درجه ۲ در سری ستارگان پلاس پریمیوم. مناسب پایه نهم تا دوازدهم.",
  },
  {
    courseSlug: "moadele",
    aparatHash: "usq84k4",
    title: "معادله درجه ۲ - قسمت دوم",
    durationSec: 16 * 60 + 9,
    sortOrder: 1,
    grades: ["g9", "g10", "g11", "g12"],
    poster: "/classes/covers/moadele-2-premium.png",
    description: "قسمت دوم معادله درجه ۲ در سری ستارگان پلاس پریمیوم. مناسب پایه نهم تا دوازدهم.",
  },
  {
    courseSlug: "hendese",
    aparatHash: "lwrtwii",
    title: "هندسه تحلیلی - قسمت سوم",
    durationSec: 20 * 60 + 48,
    sortOrder: 0,
    poster: "/classes/covers/hendese-3-premium.png",
    description: "قسمت سوم هندسه تحلیلی در سری ستارگان پلاس پریمیوم.",
  },
];

export function premiumLessonsFile() {
  const fromEnv = process.env.PREMIUM_LESSONS_FILE?.trim();
  return fromEnv || DEFAULT_PREMIUM_LESSONS_FILE;
}

const HASH = /^[A-Za-z0-9]{4,32}$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function parsePremiumLessonsJson(text: string): { lessons: PremiumLessonDraft[]; errors: string[] } {
  const trimmed = text.trim();
  if (!trimmed) return { lessons: [], errors: [] };
  let data: unknown;
  try {
    data = JSON.parse(trimmed);
  } catch {
    return { lessons: [], errors: ["premium-lessons.json is not valid JSON"] };
  }
  const rows = Array.isArray(data) ? data : data && typeof data === "object" && Array.isArray((data as { lessons?: unknown }).lessons) ? (data as { lessons: unknown[] }).lessons : null;
  if (!rows) return { lessons: [], errors: ["premium-lessons.json must be an array of lessons"] };
  const lessons: PremiumLessonDraft[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();
  rows.forEach((row, index) => {
    const label = `lesson ${index + 1}`;
    const rowErrors: string[] = [];
    if (!row || typeof row !== "object") {
      errors.push(`${label} is not an object`);
      return;
    }
    const o = row as Record<string, unknown>;
    const hash = typeof o.hash === "string" ? o.hash.trim() : "";
    const courseSlug = typeof o.courseSlug === "string" ? o.courseSlug.trim() : "";
    const title = typeof o.title === "string" ? o.title.trim() : "";
    const durationSec = typeof o.durationSec === "number" ? o.durationSec : Number.NaN;
    const cover = typeof o.cover === "string" ? o.cover.trim() : "";
    if (!HASH.test(hash)) rowErrors.push(`${label} needs a hash of 4–32 letters or digits`);
    if (!SLUG.test(courseSlug)) rowErrors.push(`${label} needs a courseSlug`);
    if (!title || title.length > 180) rowErrors.push(`${label} needs a title`);
    if (!Number.isInteger(durationSec) || durationSec < 1 || durationSec > 24 * 60 * 60) rowErrors.push(`${label} needs durationSec in seconds`);
    if (!cover) rowErrors.push(`${label} needs a cover path or URL`);
    let sortOrder: number | undefined;
    if (o.sortOrder !== undefined) {
      if (typeof o.sortOrder !== "number" || !Number.isInteger(o.sortOrder) || o.sortOrder < 0) rowErrors.push(`${label} sortOrder must be a whole number`);
      else sortOrder = o.sortOrder;
    }
    let grades: string[] | undefined;
    if (o.grades !== undefined) {
      if (!Array.isArray(o.grades) || o.grades.some((g) => typeof g !== "string" || !isGrade(g))) rowErrors.push(`${label} grades are not recognised`);
      else grades = o.grades as string[];
    }
    const description = typeof o.description === "string" && o.description.trim() ? o.description.trim() : undefined;
    if (hash && seen.has(hash)) rowErrors.push(`${label} repeats hash ${hash}`);
    if (hash) seen.add(hash);
    errors.push(...rowErrors);
    if (!rowErrors.length) lessons.push({ courseSlug, aparatHash: hash, title, durationSec, cover, sortOrder, grades, description });
  });
  return { lessons, errors };
}

/** Repo lessons win on the same hash. Extra lessons without sortOrder follow that course's premium lessons. */
export function mergePremiumLessons(repo: PremiumSeedLesson[], extra: PremiumLessonDraft[]): PremiumLessonDraft[] {
  const repoHashes = new Set(repo.map((l) => l.aparatHash));
  const fresh = extra.filter((l) => !repoHashes.has(l.aparatHash));
  const skipped = extra.length - fresh.length;
  if (skipped) console.warn(`premium json skipped ${skipped} hash(es) already listed in the repo`);
  const combined: PremiumLessonDraft[] = [...repo, ...fresh];
  const next = new Map<string, number>();
  for (const item of combined) {
    if (item.sortOrder === undefined) continue;
    next.set(item.courseSlug, Math.max(next.get(item.courseSlug) ?? -1, item.sortOrder));
  }
  return combined.map((item) => {
    if (item.sortOrder !== undefined) return item;
    const sortOrder = (next.get(item.courseSlug) ?? -1) + 1;
    next.set(item.courseSlug, sortOrder);
    return { ...item, sortOrder };
  });
}

export function isRemoteCover(cover: string) {
  return /^https?:\/\//i.test(cover);
}

export function isSiteCover(cover: string) {
  return cover.startsWith("/classes/") || cover.startsWith("/media/");
}

function imageExt(name: string) {
  const ext = path.extname(name).toLowerCase();
  if (ext === ".jpeg") return ".jpg";
  return [".png", ".jpg", ".webp", ".gif"].includes(ext) ? ext : "";
}

/** Copy a local cover into the upload dir. Returns the public /media path. */
export async function placeCoverFile(source: string, hash: string, uploadPublicDir: string) {
  const ext = imageExt(source);
  if (!ext) throw new Error(`cover for ${hash} must be a png, jpg, webp, or gif`);
  const st = await stat(source);
  if (!st.isFile() || st.size < 500 || st.size > 12_000_000) throw new Error(`cover for ${hash} is missing or an unexpected size`);
  const dir = path.join(uploadPublicDir, "class-covers");
  await mkdir(dir, { recursive: true });
  const filename = `${hash}${ext}`;
  await copyFile(source, path.join(dir, filename));
  return `/media/class-covers/${filename}`;
}

async function downloadCover(url: string, hash: string, uploadPublicDir: string) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20_000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, redirect: "follow" });
    if (!res.ok) throw new Error(`cover for ${hash} returned ${res.status}`);
    const type = res.headers.get("content-type") || "";
    if (type && !type.startsWith("image/")) throw new Error(`cover for ${hash} is not an image`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 500 || buf.length > 12_000_000) throw new Error(`cover for ${hash} is an unexpected size`);
    const ext = imageExt(new URL(url).pathname) || (type.includes("png") ? ".png" : type.includes("webp") ? ".webp" : type.includes("gif") ? ".gif" : ".jpg");
    const dir = path.join(uploadPublicDir, "class-covers");
    await mkdir(dir, { recursive: true });
    const filename = `${hash}${ext}`;
    await writeFile(path.join(dir, filename), buf);
    return `/media/class-covers/${filename}`;
  } finally {
    clearTimeout(t);
  }
}

/** Turn a cover path or URL into a poster the site can serve. Site paths are kept as-is. */
export async function resolveCover(cover: string, hash: string, opts: { uploadPublicDir: string; jsonDir?: string }) {
  if (isSiteCover(cover)) return cover;
  if (isRemoteCover(cover)) return downloadCover(cover, hash, opts.uploadPublicDir);
  const candidates = path.isAbsolute(cover) ? [cover] : opts.jsonDir ? [path.resolve(opts.jsonDir, cover)] : [];
  for (const file of candidates) {
    try {
      const st = await stat(file);
      if (st.isFile()) return placeCoverFile(file, hash, opts.uploadPublicDir);
    } catch {
      /* try the next candidate */
    }
  }
  throw new Error(`cover for ${hash} was not found: ${cover}`);
}

export async function loadExtraPremiumLessons(file = premiumLessonsFile()): Promise<PremiumLessonDraft[]> {
  let text: string;
  try {
    text = await readFile(file, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  const parsed = parsePremiumLessonsJson(text);
  if (parsed.errors.length) throw new Error(parsed.errors.join("\n"));
  return parsed.lessons;
}
