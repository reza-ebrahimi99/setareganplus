/**
 * Org-scoped MediaPlacement admin helpers.
 */

import type { Prisma } from "@/generated/prisma/client";
import {
  HOME_GALLERY_PLACEMENT_KEY,
  isMediaPlacementKey,
  type MediaPlacementKey,
} from "@/lib/media/placement-keys";
import { publicLibraryUrl } from "@/lib/media/library-image";
import { prisma } from "@/lib/prisma";

export type AdminMediaPlacement = {
  id: string;
  placementKey: string;
  mediaId: string | null;
  albumId: string | null;
  titleOverride: string | null;
  descriptionOverride: string | null;
  sortOrder: number;
  isActive: boolean;
  startAt: Date | null;
  endAt: Date | null;
  mediaTitle: string | null;
  mediaUrl: string | null;
  albumTitle: string | null;
  albumSlug: string | null;
};

export function validatePlacementTarget(input: {
  mediaId?: string | null;
  albumId?: string | null;
}): { ok: true; mediaId: string | null; albumId: string | null } | { ok: false; error: string } {
  const mediaId = input.mediaId?.trim() || null;
  const albumId = input.albumId?.trim() || null;

  if (mediaId && albumId) {
    return {
      ok: false,
      error: "جایگاه نمی‌تواند همزمان به تصویر و آلبوم اشاره کند.",
    };
  }
  if (!mediaId && !albumId) {
    return {
      ok: false,
      error: "باید یکی از تصویر یا آلبوم برای جایگاه انتخاب شود.",
    };
  }
  return { ok: true, mediaId, albumId };
}

export function validatePlacementSchedule(
  startAt: Date | null,
  endAt: Date | null,
): { ok: true } | { ok: false; error: string } {
  if (startAt && endAt && endAt <= startAt) {
    return {
      ok: false,
      error: "تاریخ پایان باید بعد از تاریخ شروع باشد.",
    };
  }
  return { ok: true };
}

export async function listAdminMediaPlacements(
  organizationId: string,
  placementKey?: MediaPlacementKey,
): Promise<AdminMediaPlacement[]> {
  const where: Prisma.MediaPlacementWhereInput = {
    organizationId,
    deletedAt: null,
    ...(placementKey ? { placementKey } : {}),
  };

  const rows = await prisma.mediaPlacement.findMany({
    where,
    orderBy: [{ placementKey: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      placementKey: true,
      mediaId: true,
      albumId: true,
      titleOverride: true,
      descriptionOverride: true,
      sortOrder: true,
      isActive: true,
      startAt: true,
      endAt: true,
      media: {
        select: { title: true, storageKey: true, altText: true },
      },
      album: {
        select: { title: true, slug: true },
      },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    placementKey: row.placementKey,
    mediaId: row.mediaId,
    albumId: row.albumId,
    titleOverride: row.titleOverride,
    descriptionOverride: row.descriptionOverride,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    startAt: row.startAt,
    endAt: row.endAt,
    mediaTitle: row.media?.title ?? null,
    mediaUrl: row.media ? publicLibraryUrl(row.media.storageKey) : null,
    albumTitle: row.album?.title ?? null,
    albumSlug: row.album?.slug ?? null,
  }));
}

export { HOME_GALLERY_PLACEMENT_KEY, isMediaPlacementKey };
