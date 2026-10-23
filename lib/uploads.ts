import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import sharp from "sharp";

export function uploadRoot(): string {
  return path.resolve(/*turbopackIgnore: true*/ process.env.UPLOAD_DIR || "./storage/uploads");
}

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/avif"];

/** Save a public image (resized, webp). Returns a URL under /media/... */
export async function saveImage(file: File, folder: string, maxWidth = 1600): Promise<string> {
  if (!IMAGE_TYPES.includes(file.type)) throw new Error("فقط فایل تصویری مجاز است.");
  if (file.size > 15 * 1024 * 1024) throw new Error("حجم تصویر بیش از ۱۵ مگابایت است.");
  const buf = Buffer.from(await file.arrayBuffer());
  return saveImageBuffer(buf, folder, maxWidth);
}

export async function saveImageBuffer(buf: Buffer, folder: string, maxWidth = 1600): Promise<string> {
  const dir = path.join(uploadRoot(), "public", folder);
  await mkdir(dir, { recursive: true });
  const name = `${Date.now().toString(36)}-${randomBytes(4).toString("hex")}.webp`;
  await sharp(buf).rotate().resize({ width: maxWidth, withoutEnlargement: true }).webp({ quality: 80 }).toFile(path.join(dir, name));
  return `/media/${folder}/${name}`;
}

const PRIVATE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

/** Save a private form attachment. Returns a relative key (served only to admins). */
export async function savePrivateFile(file: File): Promise<{ key: string; name: string }> {
  const ext = PRIVATE_TYPES[file.type];
  if (!ext) throw new Error("فرمت فایل مجاز نیست (JPG، PNG، WEBP یا PDF).");
  if (file.size > 5 * 1024 * 1024) throw new Error("حجم فایل بیش از ۵ مگابایت است.");
  const sub = new Date().toISOString().slice(0, 7);
  const dir = path.join(uploadRoot(), "private", sub);
  await mkdir(dir, { recursive: true });
  const name = `${Date.now().toString(36)}-${randomBytes(6).toString("hex")}.${ext}`;
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return { key: `${sub}/${name}`, name: file.name };
}

export const MIME: Record<string, string> = {
  webp: "image/webp",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  pdf: "application/pdf",
  avif: "image/avif",
};

/** Resolve a path safely under base; returns null on traversal. */
export function safeJoin(base: string, parts: string[]): string | null {
  const p = path.resolve(/*turbopackIgnore: true*/ base, ...parts);
  return p.startsWith(base + path.sep) ? p : null;
}
