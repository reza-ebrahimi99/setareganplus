import "server-only";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { uploadRoot } from "@/lib/uploads";

function posterFile(hash: string) {
  return path.join(uploadRoot(), "public", "class-posters", `${hash}.webp`);
}

function findPoster(value: unknown, depth = 0): string | null {
  if (!value || typeof value !== "object" || depth > 6) return null;
  const o = value as Record<string, unknown>;
  for (const key of ["big_poster", "small_poster", "poster", "thumbnail"]) {
    const v = o[key];
    if (typeof v === "string" && v.startsWith("https://")) return v;
  }
  for (const v of Object.values(o)) {
    const found = findPoster(v, depth + 1);
    if (found) return found;
  }
  return null;
}

function allowedHost(url: string) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && (u.hostname === "aparat.com" || u.hostname.endsWith(".aparat.com"));
  } catch {
    return false;
  }
}

async function downloadPoster(hash: string) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(`https://www.aparat.com/api/video/videohash/${encodeURIComponent(hash)}`, { signal: ctrl.signal, headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const poster = findPoster(await res.json());
    if (!poster || !allowedHost(poster)) return null;
    const img = await fetch(poster, { signal: ctrl.signal });
    if (!img.ok) return null;
    const buf = Buffer.from(await img.arrayBuffer());
    if (buf.length < 500 || buf.length > 8_000_000) return null;
    return await sharp(buf).rotate().resize({ width: 1280, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** Serve a cached poster. The browser only ever requests our own path. */
export async function readPoster(hash: string): Promise<{ body: Buffer; type: string } | null> {
  if (!/^[A-Za-z0-9]{4,32}$/.test(hash)) return null;
  const lesson = await prisma.classLesson.findUnique({ where: { aparatHash: hash }, select: { id: true, published: true, poster: true } });
  if (!lesson?.published) return null;
  const file = posterFile(hash);
  try {
    const st = await stat(file);
    if (st.isFile() && st.size > 0) return { body: await readFile(file), type: "image/webp" };
  } catch {
    /* cache miss */
  }
  const webp = await downloadPoster(hash);
  if (!webp) return null;
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, webp);
  const url = `/media/class-posters/${hash}.webp`;
  // A hand-set thumbnail (for example /classes/covers/…) must not be replaced by a fetched frame.
  if (!lesson.poster || lesson.poster.startsWith("/media/class-posters/")) {
    await prisma.classLesson.update({ where: { id: lesson.id }, data: { poster: url } }).catch(() => undefined);
  }
  return { body: webp, type: "image/webp" };
}
