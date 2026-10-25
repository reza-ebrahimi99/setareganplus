/**
 * Import news articles stored as JSON files (content/news/<slug>.json) into the News table.
 *
 *   npx tsx scripts/import-news.ts [--dir content/news] [--dry-run]
 *
 * Safety rules (this runs unattended from update.sh and the news-sync timer):
 * - Idempotent by slug. An article is created ONCE. Existing rows are never updated
 *   (admin edits win) and nothing is ever deleted.
 * - Every imported slug is remembered in Setting "newsFeed", so an article the admin
 *   deleted is not re-created on the next run.
 * - The cover is copied to UPLOAD_DIR/public/news/feed/ (served at /media/news/feed/…);
 *   an existing file there is never overwritten.
 * - A broken file is reported and skipped; the run continues. Exit code is non-zero only
 *   when the database is unreachable.
 * - New live articles are announced to IndexNow once (https sites only).
 */
import "dotenv/config";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const argv = process.argv.slice(2);
const DRY = argv.includes("--dry-run");
const dirIdx = argv.indexOf("--dir");
const DIR = path.resolve(dirIdx >= 0 && argv[dirIdx + 1] ? argv[dirIdx + 1] : "content/news");
const UPLOAD = path.resolve(process.env.UPLOAD_DIR || "./storage/uploads");
const SITE = (process.env.SITE_URL || "https://setareganplus.ir").replace(/\/+$/, "");
const CATEGORIES = ["ANNOUNCE", "EXAM", "CLASSES", "RESULTS", "BOOKLET", "GENERAL"];
const COVER_EXT = [".webp", ".jpg", ".jpeg", ".png"];

const log = (...a: unknown[]) => console.log(`[news ${new Date().toISOString()}]`, ...a);

type Article = {
  slug: string; title: string; summary: string | null; body: string; category: string;
  pinned: boolean; published: boolean; publishedAt: Date; formSlug: string | null; productSlug: string | null;
  coverFile: string | null;
};

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function parse(file: string): Article {
  const raw = JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
  const slug = str(raw.slug) ?? path.basename(file, ".json");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 120) throw new Error(`bad slug "${slug}"`);
  if (path.basename(file, ".json") !== slug) throw new Error(`file name must be ${slug}.json`);
  const title = str(raw.title);
  if (!title) throw new Error("title is required");
  const body = Array.isArray(raw.body) ? raw.body.map((l) => String(l)).join("\n") : str(raw.body);
  if (!body) throw new Error("body is required");
  const category = str(raw.category) ?? "GENERAL";
  if (!CATEGORIES.includes(category)) throw new Error(`bad category "${category}"`);
  const publishedAt = raw.publishedAt ? new Date(String(raw.publishedAt)) : new Date();
  if (Number.isNaN(publishedAt.getTime())) throw new Error("bad publishedAt");
  const summary = str(raw.summary);
  if (summary && summary.length > 300) throw new Error("summary too long");

  let coverFile: string | null = null;
  const cover = str(raw.cover);
  if (cover) {
    const abs = path.resolve(DIR, cover);
    if (!abs.startsWith(DIR + path.sep)) throw new Error("cover must be inside the news folder");
    if (!COVER_EXT.includes(path.extname(abs).toLowerCase())) throw new Error("cover must be webp/jpg/png");
    if (!existsSync(abs)) throw new Error(`cover not found: ${cover}`);
    if (statSync(abs).size > 5 * 1024 * 1024) throw new Error("cover larger than 5MB");
    coverFile = abs;
  }
  return {
    slug, title, summary, body, category, publishedAt, coverFile,
    pinned: raw.pinned === true,
    published: raw.published !== false,
    formSlug: str(raw.formSlug),
    productSlug: str(raw.productSlug),
  };
}

function placeCover(src: string): string {
  const name = path.basename(src).toLowerCase().replace(/[^a-z0-9._-]/g, "-");
  const dir = path.join(UPLOAD, "public", "news", "feed");
  const dest = path.join(dir, name);
  if (!DRY) {
    mkdirSync(dir, { recursive: true });
    if (!existsSync(dest)) copyFileSync(src, dest);
  }
  return `/media/news/feed/${name}`;
}

async function pingIndexNow(prisma: PrismaClient, paths: string[]): Promise<boolean> {
  if (!/^https:\/\//.test(SITE) || /localhost|127\.0\.0\.1/.test(SITE) || paths.length === 0) return false;
  const row = await prisma.setting.findUnique({ where: { key: "indexnow" } });
  const key = (row?.value as { key?: string } | undefined)?.key;
  if (!key || !/^[a-f0-9]{32}$/.test(key)) return false; // the site creates it on first admin save
  try {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host: new URL(SITE).host, key, keyLocation: `${SITE}/indexnow-key.txt`, urlList: paths.map((p) => SITE + encodeURI(p)) }),
      signal: AbortSignal.timeout(8000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function main() {
  if (!process.env.DATABASE_URL) { console.error("DATABASE_URL is required"); process.exit(2); }
  if (!existsSync(DIR)) { log(`no news folder at ${DIR}; nothing to do`); return; }
  const files = readdirSync(DIR).filter((f) => f.endsWith(".json")).sort();
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    const stateRow = await prisma.setting.findUnique({ where: { key: "newsFeed" } });
    const state = { imported: [] as string[], pinged: [] as string[], ...((stateRow?.value as object) ?? {}) };
    const imported = new Set(state.imported);
    const pinged = new Set(state.pinged);
    let created = 0, skipped = 0, failed = 0;

    for (const f of files) {
      let a: Article;
      try { a = parse(path.join(DIR, f)); } catch (e) { failed++; log(`SKIP ${f}: ${(e as Error).message}`); continue; }
      if (imported.has(a.slug)) { skipped++; continue; }
      const exists = await prisma.news.findUnique({ where: { slug: a.slug }, select: { id: true } });
      if (exists) { imported.add(a.slug); skipped++; log(`exists ${a.slug} (left untouched)`); continue; }
      try {
        const cover = a.coverFile ? placeCover(a.coverFile) : null;
        if (!DRY) {
          await prisma.news.create({
            data: {
              slug: a.slug, title: a.title, summary: a.summary, body: a.body, cover, category: a.category,
              pinned: a.pinned, published: a.published, publishedAt: a.publishedAt,
              formSlug: a.formSlug, productSlug: a.productSlug, createdBy: "news-feed",
            },
          });
        }
        imported.add(a.slug); created++;
        log(`${DRY ? "would create" : "created"} ${a.slug}${a.publishedAt > new Date() ? ` (scheduled ${a.publishedAt.toISOString()})` : ""}`);
      } catch (e) {
        failed++; log(`FAIL ${a.slug}: ${(e as Error).message}`);
      }
    }

    // announce articles that are live now and were never announced (scheduled ones get pinged on a later run)
    const live = await prisma.news.findMany({
      where: { slug: { in: [...imported].filter((s) => !pinged.has(s)) }, published: true, publishedAt: { lte: new Date() } },
      select: { slug: true },
    });
    if (!DRY && live.length && (await pingIndexNow(prisma, ["/news", ...live.map((n) => `/news/${n.slug}`)]))) {
      live.forEach((n) => pinged.add(n.slug));
      log(`IndexNow pinged ${live.length}`);
    }

    if (!DRY) {
      const value = { imported: [...imported].sort(), pinged: [...pinged].sort() };
      await prisma.setting.upsert({ where: { key: "newsFeed" }, create: { key: "newsFeed", value }, update: { value } });
    }
    log(`done: ${created} new, ${skipped} already there, ${failed} skipped with errors (${files.length} files in ${DIR})`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => { console.error(`[news] fatal: ${(e as Error).message}`); process.exit(1); });
