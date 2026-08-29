/**
 * One-time admin helper: import the two static homepage Qalamchi cards into CMS.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import {
  generateLibraryStorageKey,
  libraryMediaMetadataToJson,
} from "@/lib/media/library-image";
import { sha256Hex, tryUnlinkMediaFile, writeMediaFile } from "@/lib/media/storage";
import { prisma } from "@/lib/prisma";
import {
  HOMEPAGE_QALAMCHI_SECTION_KEY,
  MARKETING_CARD_DEFAULT_BADGE,
} from "@/lib/website/marketing-card-constants";

const CARDS = [
  {
    title: "شعبه دختران",
    description: "ویژه دانش‌آموزان دختر",
    imageAlt: "تابلوی نمایندگی قلم‌چی شعبه دختران نسیم‌شهر",
    fileName: "girls-branch.png",
    sortOrder: 0,
  },
  {
    title: "شعبه پسران",
    description: "ویژه دانش‌آموزان پسر",
    imageAlt: "تابلوی نمایندگی قلم‌چی شعبه پسران نسیم‌شهر",
    fileName: "about.png",
    sortOrder: 1,
  },
] as const;

export type ImportHomepageQalamchiResult =
  | { ok: true; status: "created" | "already_present" }
  | { ok: false; status: "error"; error: string };

async function mediaIdForPng(
  organizationId: string,
  fileName: string,
  title: string,
  imageAlt: string,
): Promise<string> {
  const existing = await prisma.mediaAsset.findFirst({
    where: {
      organizationId,
      deletedAt: null,
      status: "ACTIVE",
      originalName: { equals: fileName, mode: "insensitive" },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (existing) return existing.id;

  const absolutePath = path.join(
    process.cwd(),
    "public",
    "images",
    "about",
    fileName,
  );
  const aboutDir = path.join(process.cwd(), "public", "images", "about");
  if (!absolutePath.startsWith(aboutDir + path.sep)) {
    throw new Error("مسیر تصویر مجاز نیست.");
  }

  const buffer = await fs.readFile(absolutePath);
  const checksum = sha256Hex(buffer);
  const byChecksum = await prisma.mediaAsset.findFirst({
    where: { organizationId, deletedAt: null, status: "ACTIVE", checksum },
    select: { id: true },
  });
  if (byChecksum) return byChecksum.id;

  const sharpModule = await import("sharp");
  const meta = await sharpModule.default(buffer, { failOn: "none" }).metadata();
  const storageKey = generateLibraryStorageKey("png");
  await writeMediaFile({ storageKey, data: buffer });

  try {
    const created = await prisma.mediaAsset.create({
      data: {
        organizationId,
        storageKey,
        originalName: fileName,
        mimeType: "image/png",
        byteSize: buffer.byteLength,
        checksum,
        width: meta.width ?? null,
        height: meta.height ?? null,
        altText: imageAlt,
        title,
        category: "marketing",
        status: "ACTIVE",
        metadata: libraryMediaMetadataToJson(),
      },
      select: { id: true },
    });
    return created.id;
  } catch (error) {
    await tryUnlinkMediaFile(storageKey);
    throw error;
  }
}

export async function importHomepageQalamchiCards(
  organizationId: string,
): Promise<ImportHomepageQalamchiResult> {
  const existingCount = await prisma.websiteMarketingCard.count({
    where: {
      organizationId,
      sectionKey: HOMEPAGE_QALAMCHI_SECTION_KEY,
      deletedAt: null,
    },
  });
  if (existingCount > 0) {
    return { ok: true, status: "already_present" };
  }

  try {
    const mediaIds = await Promise.all(
      CARDS.map((card) =>
        mediaIdForPng(
          organizationId,
          card.fileName,
          card.title,
          card.imageAlt,
        ),
      ),
    );

    await prisma.$transaction(
      CARDS.map((card, index) =>
        prisma.websiteMarketingCard.create({
          data: {
            organizationId,
            sectionKey: HOMEPAGE_QALAMCHI_SECTION_KEY,
            title: card.title,
            description: card.description,
            badge: MARKETING_CARD_DEFAULT_BADGE,
            imageAlt: card.imageAlt,
            sortOrder: card.sortOrder,
            isActive: true,
            imageMediaId: mediaIds[index]!,
          },
        }),
      ),
    );

    return { ok: true, status: "created" };
  } catch (error) {
    return {
      ok: false,
      status: "error",
      error: error instanceof Error ? error.message : "درون‌ریزی ناموفق بود.",
    };
  }
}
