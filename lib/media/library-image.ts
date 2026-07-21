/**
 * Media library image upload: MIME sniff, size/dimension limits, safe storage keys.
 * Editorial fields (title/description/category/alt) live on MediaAsset columns;
 * technical metadata uses MediaAsset.metadata JSON.
 */

import { randomBytes } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import {
  LIBRARY_ALT_MAX,
  LIBRARY_CATEGORY_MAX,
  LIBRARY_DESCRIPTION_MAX,
  LIBRARY_IMAGE_MAX_BYTES,
  LIBRARY_IMAGE_MAX_EDGE,
  LIBRARY_IMAGE_MIN_EDGE,
  LIBRARY_TITLE_MAX,
} from "@/lib/media/library-constants";
import {
  type PosterValidationResult,
  validatePosterFile,
} from "@/lib/media/validate-poster";
import { publicUrlForStorageKey } from "@/lib/media/storage";

export {
  LIBRARY_IMAGE_MAX_BYTES,
  LIBRARY_IMAGE_MIN_EDGE,
  LIBRARY_IMAGE_MAX_EDGE,
  LIBRARY_TITLE_MAX,
  LIBRARY_DESCRIPTION_MAX,
  LIBRARY_ALT_MAX,
  LIBRARY_CATEGORY_MAX,
  LIBRARY_CAPTION_MAX,
} from "@/lib/media/library-constants";

export type LibraryImageProcessResult =
  | {
      ok: true;
      mimeType: "image/jpeg" | "image/png" | "image/webp";
      extension: "jpg" | "png" | "webp";
      originalName: string;
      buffer: Buffer;
      width: number;
      height: number;
    }
  | { ok: false; error: string };

export type LibraryMediaMetadata = {
  kind: "library-image";
};

export function generateLibraryStorageKey(extension: string): string {
  const safeExt = extension.replace(/[^a-z0-9]/gi, "").toLowerCase();
  if (!safeExt) {
    throw new Error("Missing file extension.");
  }
  const name = randomBytes(16).toString("hex");
  return `library/${name}.${safeExt}`;
}

export async function validateLibraryImageFile(
  file: File | null | undefined,
): Promise<PosterValidationResult> {
  return validatePosterFile(file, {
    maxBytes: LIBRARY_IMAGE_MAX_BYTES,
    tooLargeMessage: "حجم تصویر نباید بیشتر از ۸ مگابایت باشد.",
  });
}

export async function processLibraryImageUpload(
  file: File | null | undefined,
): Promise<LibraryImageProcessResult> {
  const validated = await validateLibraryImageFile(file);
  if (!validated.ok) {
    return validated;
  }

  try {
    const sharpModule = await import("sharp");
    const sharp = sharpModule.default;
    const meta = await sharp(validated.buffer, { failOn: "none" }).metadata();
    const width = meta.width ?? 0;
    const height = meta.height ?? 0;

    if (width < LIBRARY_IMAGE_MIN_EDGE || height < LIBRARY_IMAGE_MIN_EDGE) {
      return {
        ok: false,
        error: `ابعاد تصویر باید حداقل ${LIBRARY_IMAGE_MIN_EDGE}×${LIBRARY_IMAGE_MIN_EDGE} پیکسل باشد.`,
      };
    }

    if (width > LIBRARY_IMAGE_MAX_EDGE || height > LIBRARY_IMAGE_MAX_EDGE) {
      return {
        ok: false,
        error: `ابعاد تصویر نباید بیشتر از ${LIBRARY_IMAGE_MAX_EDGE} پیکسل در هر ضلع باشد.`,
      };
    }

    return {
      ok: true,
      mimeType: validated.mimeType,
      extension: validated.extension,
      originalName: validated.originalName,
      buffer: validated.buffer,
      width,
      height,
    };
  } catch {
    return {
      ok: false,
      error: "خواندن ابعاد تصویر ممکن نشد. فایل را بررسی کنید.",
    };
  }
}

export function libraryMediaMetadataToJson(): Prisma.InputJsonValue {
  const meta: LibraryMediaMetadata = { kind: "library-image" };
  return meta as Prisma.InputJsonValue;
}

export function publicLibraryUrl(storageKey: string): string {
  return publicUrlForStorageKey(storageKey);
}

/** Normalize free-text category: trim, collapse whitespace, max length. */
export function normalizeMediaCategory(
  raw: string | null | undefined,
): string | null {
  if (raw == null) return null;
  const normalized = raw.replace(/\s+/g, " ").trim().slice(0, LIBRARY_CATEGORY_MAX);
  return normalized.length > 0 ? normalized : null;
}

export function normalizeOptionalText(
  raw: string | null | undefined,
  max: number,
): string | null {
  if (raw == null) return null;
  const value = raw.replace(/\s+/g, " ").trim().slice(0, max);
  return value.length > 0 ? value : null;
}
