/**
 * Org-scoped Media Library admin queries and mutations helpers.
 */

import type { MediaAssetStatus, Prisma } from "@/generated/prisma/client";
import {
  LIBRARY_ALT_MAX,
  LIBRARY_DESCRIPTION_MAX,
  LIBRARY_TITLE_MAX,
  libraryMediaMetadataToJson,
  normalizeMediaCategory,
  normalizeOptionalText,
  publicLibraryUrl,
} from "@/lib/media/library-image";
import { getMediaAssetDependencies } from "@/lib/media/media-dependencies";
import { prisma } from "@/lib/prisma";

export const MEDIA_LIBRARY_PAGE_SIZE = 24;

export type AdminMediaSort = "newest" | "oldest" | "title";

export type AdminMediaListItem = {
  id: string;
  title: string | null;
  description: string | null;
  altText: string | null;
  category: string | null;
  status: MediaAssetStatus;
  mimeType: string;
  byteSize: number;
  width: number | null;
  height: number | null;
  url: string;
  createdAt: Date;
  updatedAt: Date;
};

export type AdminMediaListResult = {
  items: AdminMediaListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function mapAdminMedia(row: {
  id: string;
  title: string | null;
  description: string | null;
  altText: string | null;
  category: string | null;
  status: MediaAssetStatus;
  mimeType: string;
  byteSize: number;
  width: number | null;
  height: number | null;
  storageKey: string;
  createdAt: Date;
  updatedAt: Date;
}): AdminMediaListItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    altText: row.altText,
    category: row.category,
    status: row.status,
    mimeType: row.mimeType,
    byteSize: row.byteSize,
    width: row.width,
    height: row.height,
    url: publicLibraryUrl(row.storageKey),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listAdminMediaAssets(
  organizationId: string,
  options: {
    q?: string;
    status?: "all" | "ACTIVE" | "INACTIVE";
    category?: string;
    sort?: AdminMediaSort;
    page?: number;
  } = {},
): Promise<AdminMediaListResult> {
  const pageSize = MEDIA_LIBRARY_PAGE_SIZE;
  const page = Math.max(1, options.page ?? 1);
  const q = options.q?.trim() ?? "";
  const category = normalizeMediaCategory(options.category);
  const statusFilter = options.status ?? "all";
  const sort = options.sort ?? "newest";

  const where: Prisma.MediaAssetWhereInput = {
    organizationId,
    deletedAt: null,
    ...(statusFilter !== "all" ? { status: statusFilter } : {}),
    ...(category ? { category } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
            { altText: { contains: q, mode: "insensitive" } },
            { category: { contains: q, mode: "insensitive" } },
            { originalName: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const orderBy: Prisma.MediaAssetOrderByWithRelationInput[] =
    sort === "oldest"
      ? [{ createdAt: "asc" }]
      : sort === "title"
        ? [{ title: "asc" }, { createdAt: "desc" }]
        : [{ createdAt: "desc" }];

  const [total, rows] = await Promise.all([
    prisma.mediaAsset.count({ where }),
    prisma.mediaAsset.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        title: true,
        description: true,
        altText: true,
        category: true,
        status: true,
        mimeType: true,
        byteSize: true,
        width: true,
        height: true,
        storageKey: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    items: rows.map(mapAdminMedia),
    total,
    page,
    pageSize,
    totalPages,
  };
}

export async function getAdminMediaAsset(
  organizationId: string,
  mediaId: string,
) {
  const row = await prisma.mediaAsset.findFirst({
    where: { id: mediaId, organizationId, deletedAt: null },
    select: {
      id: true,
      title: true,
      description: true,
      altText: true,
      category: true,
      status: true,
      mimeType: true,
      byteSize: true,
      width: true,
      height: true,
      storageKey: true,
      originalName: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!row) return null;

  const dependencies = await getMediaAssetDependencies(organizationId, mediaId);
  return {
    ...mapAdminMedia(row),
    originalName: row.originalName,
    dependencies: dependencies.dependencies,
    canDelete: dependencies.canDelete,
  };
}

export async function listAdminMediaCategories(
  organizationId: string,
): Promise<string[]> {
  const rows = await prisma.mediaAsset.findMany({
    where: {
      organizationId,
      deletedAt: null,
      category: { not: null },
    },
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
    take: 200,
  });
  return rows
    .map((row) => row.category)
    .filter((value): value is string => Boolean(value));
}

export function buildMediaEditorialUpdate(input: {
  title?: string | null;
  description?: string | null;
  altText?: string | null;
  category?: string | null;
  status?: MediaAssetStatus;
}): Prisma.MediaAssetUpdateInput {
  const data: Prisma.MediaAssetUpdateInput = {};
  if (input.title !== undefined) {
    data.title = normalizeOptionalText(input.title, LIBRARY_TITLE_MAX);
  }
  if (input.description !== undefined) {
    data.description = normalizeOptionalText(
      input.description,
      LIBRARY_DESCRIPTION_MAX,
    );
  }
  if (input.altText !== undefined) {
    data.altText = normalizeOptionalText(input.altText, LIBRARY_ALT_MAX);
  }
  if (input.category !== undefined) {
    data.category = normalizeMediaCategory(input.category);
  }
  if (input.status !== undefined) {
    data.status = input.status;
  }
  return data;
}

export { libraryMediaMetadataToJson, publicLibraryUrl };
