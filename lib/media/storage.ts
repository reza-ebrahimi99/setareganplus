import { createHash, randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Persistent media storage (outside git / deploy tree).
 * Production root: STAROS_MEDIA_ROOT (e.g. /var/www/staros-media)
 * Public URLs: STAROS_MEDIA_PUBLIC_BASE + "/" + storageKey (e.g. /media/forms/…)
 */

const FORMS_SUBDIR = "forms";
const TEAM_SUBDIR = "team";

export function getMediaRoot(): string {
  const configured = process.env.STAROS_MEDIA_ROOT?.trim();
  if (configured) {
    return path.resolve(configured);
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "STAROS_MEDIA_ROOT must be set in production (e.g. /var/www/staros-media).",
    );
  }

  // Dev-only fallback — never under public/ or a git-managed deploy path.
  return path.resolve(process.cwd(), ".data", "staros-media");
}

export function getMediaPublicBase(): string {
  const configured = process.env.STAROS_MEDIA_PUBLIC_BASE?.trim();
  if (configured) {
    return configured.replace(/\/+$/, "") || "/media";
  }
  return "/media";
}

/** Public URL for a storageKey — never exposes absolute filesystem paths. */
export function publicUrlForStorageKey(storageKey: string): string {
  const base = getMediaPublicBase();
  const key = storageKey.replace(/^\/+/, "");
  return `${base}/${key}`;
}

export function absolutePathForStorageKey(storageKey: string): string {
  const root = getMediaRoot();
  const normalizedKey = storageKey.replace(/\\/g, "/").replace(/^\/+/, "");

  if (
    !normalizedKey ||
    normalizedKey.includes("..") ||
    path.isAbsolute(normalizedKey)
  ) {
    throw new Error("Invalid storage key.");
  }

  const absolute = path.resolve(root, ...normalizedKey.split("/"));
  const rootWithSep = root.endsWith(path.sep) ? root : `${root}${path.sep}`;

  if (absolute !== root && !absolute.startsWith(rootWithSep)) {
    throw new Error("Storage path escape blocked.");
  }

  return absolute;
}

export function generateFormsStorageKey(extension: string): string {
  const safeExt = extension.replace(/[^a-z0-9]/gi, "").toLowerCase();
  if (!safeExt) {
    throw new Error("Missing file extension.");
  }
  const name = randomBytes(16).toString("hex");
  return `${FORMS_SUBDIR}/${name}.${safeExt}`;
}

export function generateTeamStorageKey(extension: string): string {
  const safeExt = extension.replace(/[^a-z0-9]/gi, "").toLowerCase();
  if (!safeExt) {
    throw new Error("Missing file extension.");
  }
  const name = randomBytes(16).toString("hex");
  return `${TEAM_SUBDIR}/${name}.${safeExt}`;
}

export function sha256Hex(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

/**
 * Write bytes atomically (temp file + rename) under the media root.
 * Does not delete older physical files — soft-delete handles DB only.
 */
export async function writeMediaFile(params: {
  storageKey: string;
  data: Buffer;
}): Promise<{ absolutePath: string; byteSize: number; checksum: string }> {
  const absolutePath = absolutePathForStorageKey(params.storageKey);
  const dir = path.dirname(absolutePath);
  await fs.mkdir(dir, { recursive: true });

  const checksum = sha256Hex(params.data);
  const tempPath = `${absolutePath}.${randomBytes(8).toString("hex")}.tmp`;

  try {
    await fs.writeFile(tempPath, params.data, { flag: "wx" });
    await fs.rename(tempPath, absolutePath);
  } catch (error) {
    await fs.unlink(tempPath).catch(() => undefined);
    throw error;
  }

  return {
    absolutePath,
    byteSize: params.data.byteLength,
    checksum,
  };
}

/** Physical unlink is intentional and rare; prefer soft-delete in DB. */
export async function tryUnlinkMediaFile(storageKey: string): Promise<void> {
  try {
    const absolutePath = absolutePathForStorageKey(storageKey);
    await fs.unlink(absolutePath);
  } catch {
    // File may already be gone — ignore.
  }
}
