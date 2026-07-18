/**
 * Team portrait upload: validate, then require two WebP variants (480 + 960).
 * Original upload bytes are never persisted for public serving.
 */

import { randomBytes } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import {
  type PosterValidationResult,
  validatePosterFile,
} from "@/lib/media/validate-poster";
import { publicUrlForStorageKey } from "@/lib/media/storage";

export const TEAM_PORTRAIT_MAX_BYTES = 2 * 1024 * 1024;
export const TEAM_PORTRAIT_CARD_EDGE = 480;
export const TEAM_PORTRAIT_DETAIL_EDGE = 960;

export type TeamPortraitVariantSize = "w480" | "w960";

export type TeamPortraitVariantMeta = {
  storageKey: string;
  width: number;
  height: number;
  byteSize: number;
};

export type TeamPortraitMediaMetadata = {
  kind: "team-portrait";
  variants: {
    w480: TeamPortraitVariantMeta;
    w960: TeamPortraitVariantMeta;
  };
};

export type TeamPortraitProcessResult =
  | {
      ok: true;
      mimeType: "image/webp";
      extension: "webp";
      originalName: string;
      variants: {
        w480: { buffer: Buffer; width: number; height: number };
        w960: { buffer: Buffer; width: number; height: number };
      };
    }
  | { ok: false; error: string };

export function generateTeamPortraitVariantKeys(): {
  w480: string;
  w960: string;
} {
  const id = randomBytes(16).toString("hex");
  return {
    w480: `team/${id}-480.webp`,
    w960: `team/${id}-960.webp`,
  };
}

export async function validateTeamPortraitFile(
  file: File | null | undefined,
): Promise<PosterValidationResult> {
  return validatePosterFile(file, {
    maxBytes: TEAM_PORTRAIT_MAX_BYTES,
    tooLargeMessage: "حجم تصویر پروفایل نباید بیشتر از ۲ مگابایت باشد.",
  });
}

async function resizeToWebp(
  buffer: Buffer,
  maxEdge: number,
): Promise<{ buffer: Buffer; width: number; height: number }> {
  const sharpModule = await import("sharp");
  const sharp = sharpModule.default;
  const image = sharp(buffer, { failOn: "none" })
    .rotate()
    .resize({
      width: maxEdge,
      height: maxEdge,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 82, effort: 4 });

  const out = await image.toBuffer({ resolveWithObject: true });
  return {
    buffer: out.data,
    width: out.info.width,
    height: out.info.height,
  };
}

export async function processTeamPortraitUpload(
  file: File | null | undefined,
): Promise<TeamPortraitProcessResult> {
  const validated = await validateTeamPortraitFile(file);
  if (!validated.ok) return validated;

  try {
    const [w480, w960] = await Promise.all([
      resizeToWebp(validated.buffer, TEAM_PORTRAIT_CARD_EDGE),
      resizeToWebp(validated.buffer, TEAM_PORTRAIT_DETAIL_EDGE),
    ]);

    if (
      w480.buffer.byteLength > TEAM_PORTRAIT_MAX_BYTES ||
      w960.buffer.byteLength > TEAM_PORTRAIT_MAX_BYTES
    ) {
      return {
        ok: false,
        error: "پس از بهینه‌سازی، حجم تصویر همچنان بیش از حد مجاز است.",
      };
    }

    return {
      ok: true,
      mimeType: "image/webp",
      extension: "webp",
      originalName: validated.originalName.replace(/\.[a-z0-9]+$/i, ".webp"),
      variants: { w480, w960 },
    };
  } catch {
    return {
      ok: false,
      error:
        "پردازش و ساخت نسخه‌های بهینه‌شده تصویر ممکن نشد. لطفاً دوباره تلاش کنید.",
    };
  }
}

export function buildTeamPortraitMetadata(params: {
  w480: TeamPortraitVariantMeta;
  w960: TeamPortraitVariantMeta;
}): TeamPortraitMediaMetadata {
  return {
    kind: "team-portrait",
    variants: {
      w480: params.w480,
      w960: params.w960,
    },
  };
}

export function teamPortraitMetadataToJson(
  metadata: TeamPortraitMediaMetadata,
): Prisma.InputJsonObject {
  return metadata as unknown as Prisma.InputJsonObject;
}

export function parseTeamPortraitMetadata(
  value: unknown,
): TeamPortraitMediaMetadata | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.kind !== "team-portrait") return null;
  const variants = record.variants;
  if (!variants || typeof variants !== "object" || Array.isArray(variants)) {
    return null;
  }
  const map = variants as Record<string, unknown>;
  const w480 = parseVariant(map.w480);
  const w960 = parseVariant(map.w960);
  if (!w480 || !w960) return null;
  return { kind: "team-portrait", variants: { w480, w960 } };
}

function parseVariant(value: unknown): TeamPortraitVariantMeta | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.storageKey !== "string" || !record.storageKey) return null;
  return {
    storageKey: record.storageKey,
    width: typeof record.width === "number" ? record.width : 0,
    height: typeof record.height === "number" ? record.height : 0,
    byteSize: typeof record.byteSize === "number" ? record.byteSize : 0,
  };
}

/** Public URL for a variant. Never prefers an unlisted original upload. */
export function publicPortraitUrl(
  media: {
    storageKey: string;
    metadata?: unknown;
  } | null,
  size: TeamPortraitVariantSize,
): string | null {
  if (!media) return null;
  const parsed = parseTeamPortraitMetadata(media.metadata);
  if (parsed) {
    return publicUrlForStorageKey(parsed.variants[size].storageKey);
  }
  // Legacy single-file portraits (pre-variant uploads).
  return publicUrlForStorageKey(media.storageKey);
}

export function teamPortraitStorageKeysToUnlink(media: {
  storageKey: string;
  metadata?: unknown;
}): string[] {
  const keys = new Set<string>([media.storageKey]);
  const parsed = parseTeamPortraitMetadata(media.metadata);
  if (parsed) {
    keys.add(parsed.variants.w480.storageKey);
    keys.add(parsed.variants.w960.storageKey);
  }
  return Array.from(keys);
}
