import { mkdir, readFile, stat, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { uploadRoot, safeJoin } from "@/lib/uploads";
import { IMG_WIDTHS } from "@/lib/img";

/** Resized webp copy of a public upload: /img/640/news/x.webp → /media/news/x.webp at 640px wide. */
export async function GET(req: Request, ctx: { params: Promise<{ w: string; path: string[] }> }) {
  const { w: ws, path: parts } = await ctx.params;
  const w = Number(ws);
  const original = "/media/" + parts.map(encodeURIComponent).join("/");
  const fallback = () => Response.redirect(new URL(original, req.url), 307);
  if (!(IMG_WIDTHS as readonly number[]).includes(w)) return new Response("Not found", { status: 404 });
  const ext = path.extname(parts[parts.length - 1] ?? "").slice(1).toLowerCase();
  if (!["jpg", "jpeg", "png", "webp"].includes(ext)) return new Response("Not found", { status: 404 });

  const root = uploadRoot();
  const file = safeJoin(path.join(root, "public"), parts);
  const cacheBase = path.join(root, ".resized", String(w));
  const cached = safeJoin(cacheBase, parts);
  if (!file || !cached) return new Response("Not found", { status: 404 });

  let src;
  try {
    src = await stat(file);
    if (!src.isFile()) throw new Error();
  } catch {
    return fallback(); // e.g. legacy files nginx serves from another folder
  }
  const out = cached + ".webp";
  const headers = { "Content-Type": "image/webp", "Cache-Control": "public, max-age=31536000, immutable" };
  try {
    const c = await stat(out);
    if (c.mtimeMs >= src.mtimeMs) return new Response(new Uint8Array(await readFile(out)), { headers });
  } catch {}
  try {
    const buf = await sharp(file).rotate().resize({ width: w, withoutEnlargement: true }).webp({ quality: 72 }).toBuffer();
    try {
      await mkdir(path.dirname(out), { recursive: true });
      const tmp = `${out}.${process.pid}.tmp`;
      await writeFile(tmp, buf);
      await rename(tmp, out);
    } catch {}
    return new Response(new Uint8Array(buf), { headers });
  } catch {
    return fallback();
  }
}
