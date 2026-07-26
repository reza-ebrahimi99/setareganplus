/**
 * Admin loaders / write helpers for WebsiteTopRankArchive.
 */

import { prisma } from "@/lib/prisma";
import { publicLibraryUrl } from "@/lib/media/library-image";
import {
  TOP_RANK_DESCRIPTION_MAX,
  TOP_RANK_TITLE_MAX,
  defaultTopRankTitle,
  normalizeOptionalText,
  parseJalaliYear,
} from "@/lib/website/top-rank-archive-constants";

export type TopRankArchiveAdminRow = {
  id: string;
  year: number;
  title: string | null;
  displayTitle: string;
  description: string | null;
  sortOrder: number;
  isPublished: boolean;
  mediaId: string;
  imageUrl: string | null;
  imageAlt: string;
  updatedAt: Date;
};

export type TopRankArchiveWriteInput = {
  year: number;
  title: string | null;
  description: string | null;
  mediaId: string;
  sortOrder: number;
  isPublished: boolean;
};

export async function listAdminTopRankArchives(
  organizationId: string,
): Promise<TopRankArchiveAdminRow[]> {
  const rows = await prisma.websiteTopRankArchive.findMany({
    where: { organizationId, deletedAt: null },
    orderBy: [{ year: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      year: true,
      title: true,
      description: true,
      sortOrder: true,
      isPublished: true,
      mediaId: true,
      updatedAt: true,
      media: {
        select: {
          storageKey: true,
          altText: true,
          title: true,
          status: true,
          deletedAt: true,
        },
      },
    },
  });

  return rows.map((row) => {
    const mediaOk =
      row.media.deletedAt == null && row.media.status === "ACTIVE";
    const displayTitle = row.title?.trim() || defaultTopRankTitle(row.year);
    return {
      id: row.id,
      year: row.year,
      title: row.title,
      displayTitle,
      description: row.description,
      sortOrder: row.sortOrder,
      isPublished: row.isPublished,
      mediaId: row.mediaId,
      imageUrl: mediaOk ? publicLibraryUrl(row.media.storageKey) : null,
      imageAlt:
        row.media.altText?.trim() ||
        row.media.title?.trim() ||
        displayTitle,
      updatedAt: row.updatedAt,
    };
  });
}

export async function loadAdminTopRankArchive(
  organizationId: string,
  id: string,
): Promise<TopRankArchiveAdminRow | null> {
  const row = await prisma.websiteTopRankArchive.findFirst({
    where: { id, organizationId, deletedAt: null },
    select: {
      id: true,
      year: true,
      title: true,
      description: true,
      sortOrder: true,
      isPublished: true,
      mediaId: true,
      updatedAt: true,
      media: {
        select: {
          storageKey: true,
          altText: true,
          title: true,
          status: true,
          deletedAt: true,
        },
      },
    },
  });
  if (!row) return null;

  const mediaOk =
    row.media.deletedAt == null && row.media.status === "ACTIVE";
  const displayTitle = row.title?.trim() || defaultTopRankTitle(row.year);

  return {
    id: row.id,
    year: row.year,
    title: row.title,
    displayTitle,
    description: row.description,
    sortOrder: row.sortOrder,
    isPublished: row.isPublished,
    mediaId: row.mediaId,
    imageUrl: mediaOk ? publicLibraryUrl(row.media.storageKey) : null,
    imageAlt:
      row.media.altText?.trim() || row.media.title?.trim() || displayTitle,
    updatedAt: row.updatedAt,
  };
}

export async function nextTopRankSortOrder(
  organizationId: string,
): Promise<number> {
  const max = await prisma.websiteTopRankArchive.aggregate({
    where: { organizationId, deletedAt: null },
    _max: { sortOrder: true },
  });
  return (max._max.sortOrder ?? 0) + 10;
}

export async function findLiveTopRankByYear(
  organizationId: string,
  year: number,
  excludeId?: string,
) {
  return prisma.websiteTopRankArchive.findFirst({
    where: {
      organizationId,
      year,
      deletedAt: null,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
}

export function parseTopRankWriteInput(input: {
  yearRaw: string;
  titleRaw: string;
  descriptionRaw: string;
  mediaIdRaw: string;
  sortOrderRaw: string;
  isPublished: boolean;
}):
  | { ok: true; data: TopRankArchiveWriteInput }
  | { ok: false; formError: string; fieldErrors?: Record<string, string> } {
  const yearParsed = parseJalaliYear(input.yearRaw);
  if (!yearParsed.ok) {
    return {
      ok: false,
      formError: yearParsed.error,
      fieldErrors: { year: yearParsed.error },
    };
  }

  const mediaId = input.mediaIdRaw.trim();
  if (!mediaId) {
    return {
      ok: false,
      formError: "انتخاب تصویر الزامی است.",
      fieldErrors: { mediaId: "یک تصویر از کتابخانه رسانه انتخاب کنید." },
    };
  }

  const sortParsed = Number.parseInt(input.sortOrderRaw.trim() || "0", 10);
  const sortOrder = Number.isSafeInteger(sortParsed) ? sortParsed : 0;

  return {
    ok: true,
    data: {
      year: yearParsed.year,
      title: normalizeOptionalText(input.titleRaw, TOP_RANK_TITLE_MAX),
      description: normalizeOptionalText(
        input.descriptionRaw,
        TOP_RANK_DESCRIPTION_MAX,
      ),
      mediaId,
      sortOrder,
      isPublished: input.isPublished,
    },
  };
}
