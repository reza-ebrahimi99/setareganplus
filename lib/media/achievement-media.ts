/**
 * Achievement media — reuses Team image pipeline for covers & certificate images.
 * PDF certificates are validated and stored as single files (no resize).
 */

import { randomBytes } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { publicUrlForStorageKey } from "@/lib/media/storage";
import {
  buildTeamPortraitMetadata,
  processTeamPortraitUpload,
  publicPortraitUrl,
  teamPortraitMetadataToJson,
  teamPortraitStorageKeysToUnlink,
  type TeamPortraitMediaMetadata,
  type TeamPortraitVariantMeta,
  type TeamPortraitVariantSize,
  type WebsitePortraitKind,
} from "@/lib/media/team-portrait";

export const ACHIEVEMENT_CERTIFICATE_MAX_BYTES = 8 * 1024 * 1024;

export type { TeamPortraitVariantSize as AchievementImageVariantSize };

export {
  processTeamPortraitUpload as processAchievementImageUpload,
  publicPortraitUrl as publicAchievementImageUrl,
  teamPortraitStorageKeysToUnlink as achievementImageStorageKeysToUnlink,
};

export function generateAchievementImageKeys(
  kind: "cover" | "certificate",
): { w480: string; w960: string } {
  const id = randomBytes(16).toString("hex");
  const folder =
    kind === "cover" ? "achievements/covers" : "achievements/certificates";
  return {
    w480: `${folder}/${id}-480.webp`,
    w960: `${folder}/${id}-960.webp`,
  };
}

export function generateAchievementPdfKey(): string {
  const id = randomBytes(16).toString("hex");
  return `achievements/certificates/${id}.pdf`;
}

export function buildAchievementImageMetadata(
  kind: Extract<
    WebsitePortraitKind,
    "achievement-cover" | "achievement-certificate-image"
  >,
  params: {
    w480: TeamPortraitVariantMeta;
    w960: TeamPortraitVariantMeta;
  },
): TeamPortraitMediaMetadata {
  const base = buildTeamPortraitMetadata(params);
  return { ...base, kind };
}

export function achievementImageMetadataToJson(
  metadata: TeamPortraitMediaMetadata,
): Prisma.InputJsonObject {
  return teamPortraitMetadataToJson(metadata);
}

export type AchievementPdfMetadata = {
  kind: "achievement-certificate-pdf";
  storageKey: string;
  byteSize: number;
};

export function buildAchievementPdfMetadata(
  storageKey: string,
  byteSize: number,
): AchievementPdfMetadata {
  return {
    kind: "achievement-certificate-pdf",
    storageKey,
    byteSize,
  };
}

export function achievementPdfMetadataToJson(
  metadata: AchievementPdfMetadata,
): Prisma.InputJsonObject {
  return metadata as unknown as Prisma.InputJsonObject;
}

function sanitizeOriginalName(name: string): string {
  const base = name.replace(/\\/g, "/").split("/").pop() || "certificate";
  return base.slice(0, 180).replace(/[^\w.\u0600-\u06FF\- ()[\]]+/g, "_");
}

function isPdfBuffer(buffer: Buffer): boolean {
  if (buffer.length < 5) return false;
  return buffer.subarray(0, 5).toString("utf8") === "%PDF-";
}

export type AchievementCertificateProcessResult =
  | {
      ok: true;
      kind: "image";
      mimeType: "image/webp";
      originalName: string;
      variants: {
        w480: { buffer: Buffer; width: number; height: number };
        w960: { buffer: Buffer; width: number; height: number };
      };
    }
  | {
      ok: true;
      kind: "pdf";
      mimeType: "application/pdf";
      extension: "pdf";
      originalName: string;
      buffer: Buffer;
    }
  | { ok: false; error: string };

export async function processAchievementCertificateUpload(
  file: File | null | undefined,
): Promise<AchievementCertificateProcessResult> {
  if (!file || typeof file.arrayBuffer !== "function") {
    return { ok: false, error: "لطفاً یک فایل گواهی انتخاب کنید." };
  }
  if (file.size <= 0) {
    return { ok: false, error: "فایل خالی است و قابل دریافت نیست." };
  }
  if (file.size > ACHIEVEMENT_CERTIFICATE_MAX_BYTES) {
    return {
      ok: false,
      error: "حجم گواهی نباید بیشتر از ۸ مگابایت باشد.",
    };
  }

  const declared = (file.type || "").toLowerCase().trim();
  const buffer = Buffer.from(await file.arrayBuffer());

  if (declared === "application/pdf" || isPdfBuffer(buffer)) {
    if (!isPdfBuffer(buffer)) {
      return { ok: false, error: "فایل PDF معتبر نیست." };
    }
    return {
      ok: true,
      kind: "pdf",
      mimeType: "application/pdf",
      extension: "pdf",
      originalName: sanitizeOriginalName(file.name || "certificate.pdf"),
      buffer,
    };
  }

  const image = await processTeamPortraitUpload(file);
  if (!image.ok) return image;

  return {
    ok: true,
    kind: "image",
    mimeType: "image/webp",
    originalName: image.originalName,
    variants: image.variants,
  };
}

export function publicCertificateUrl(media: {
  storageKey: string;
  metadata?: unknown;
} | null): string | null {
  if (!media) return null;
  const meta = media.metadata;
  if (meta && typeof meta === "object" && !Array.isArray(meta)) {
    const record = meta as Record<string, unknown>;
    if (record.kind === "achievement-certificate-pdf") {
      const key =
        typeof record.storageKey === "string"
          ? record.storageKey
          : media.storageKey;
      return publicUrlForStorageKey(key);
    }
    if (record.kind === "achievement-certificate-image") {
      return publicPortraitUrl(media, "w960");
    }
  }
  return publicUrlForStorageKey(media.storageKey);
}

export function publicCoverUrl(
  media: { storageKey: string; metadata?: unknown } | null,
  size: TeamPortraitVariantSize = "w480",
): string | null {
  return publicPortraitUrl(media, size);
}

export function achievementMediaKeysToUnlink(media: {
  storageKey: string;
  metadata?: unknown;
}): string[] {
  const meta = media.metadata;
  if (meta && typeof meta === "object" && !Array.isArray(meta)) {
    const record = meta as Record<string, unknown>;
    if (record.kind === "achievement-certificate-pdf") {
      return [media.storageKey];
    }
  }
  return teamPortraitStorageKeysToUnlink(media);
}
