/**
 * Private academy video storage (never public /media URLs).
 */

import { randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  absolutePathForStorageKey,
  getMediaRoot,
} from "@/lib/media/storage";

const ACADEMY_PRIVATE_PREFIX = "private/academy/videos";

export function academyVideoOriginalKey(assetId: string, ext: string): string {
  const safeExt = ext.replace(/[^a-z0-9.]/gi, "").slice(0, 8) || "mp4";
  return `${ACADEMY_PRIVATE_PREFIX}/${assetId}/original.${safeExt}`;
}

export function academyVideoHlsPrefix(assetId: string): string {
  return `${ACADEMY_PRIVATE_PREFIX}/${assetId}/hls`;
}

export async function writeAcademyVideoUpload(params: {
  assetId: string;
  buffer: Buffer;
  ext: string;
}): Promise<{ storageKey: string; sizeBytes: number }> {
  const storageKey = academyVideoOriginalKey(params.assetId, params.ext);
  const absolute = absolutePathForStorageKey(storageKey);
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  await fs.writeFile(absolute, params.buffer);
  return { storageKey, sizeBytes: params.buffer.byteLength };
}

export function resolveAcademyVideoAbsolutePath(storageKey: string): string {
  if (!storageKey.startsWith(ACADEMY_PRIVATE_PREFIX)) {
    throw new Error("Invalid academy video key.");
  }
  return absolutePathForStorageKey(storageKey);
}

export function newAcademyAssetId(): string {
  return randomBytes(12).toString("hex");
}

export function readAcademyStorageRoot(): string {
  return getMediaRoot();
}
