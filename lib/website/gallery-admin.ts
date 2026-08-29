/**
 * Org-scoped gallery album admin queries.
 */

import type { Prisma } from "@/generated/prisma/client";
import { publicLibraryUrl } from "@/lib/media/library-image";
import { prisma } from "@/lib/prisma";
import {
  normalizeGalleryAlbumSlug,
  slugFromGalleryAlbumTitle,
} from "@/lib/website/gallery-slug";

export const GALLERY_ADMIN_PAGE_SIZE = 20;

export type AdminGalleryAlbumListItem = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  publishedAt: Date | null;
  itemCount: number;
  coverUrl: string | null;
  coverAlt: string;
  updatedAt: Date;
};

export async function uniqueGalleryAlbumSlug(
  organizationId: string,
  desired: string,
  excludeId?: string,
): Promise<string> {
  let base = normalizeGalleryAlbumSlug(desired);
  if (base.length < 2) base = `album-${Date.now().toString(36)}`;
  let candidate = base;
  for (let i = 0; i < 20; i += 1) {
    const hit = await prisma.galleryAlbum.findFirst({
      where: {
        organizationId,
        slug: candidate,
        deletedAt: null,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (!hit) return candidate;
    candidate = `${base}-${i + 2}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function listAdminGalleryAlbums(
  organizationId: string,
  options: {
    q?: string;
    active?: "all" | "yes" | "no";
    page?: number;
  } = {},
) {
  const pageSize = GALLERY_ADMIN_PAGE_SIZE;
  const page = Math.max(1, options.page ?? 1);
  const q = options.q?.trim() ?? "";
  const active = options.active ?? "all";

  const where: Prisma.GalleryAlbumWhereInput = {
    organizationId,
    deletedAt: null,
    ...(active === "yes"
      ? { isActive: true }
      : active === "no"
        ? { isActive: false }
        : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
            { slug: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.galleryAlbum.count({ where }),
    prisma.galleryAlbum.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        isActive: true,
        sortOrder: true,
        publishedAt: true,
        updatedAt: true,
        coverMedia: {
          select: { storageKey: true, altText: true, title: true },
        },
        _count: { select: { items: true } },
      },
    }),
  ]);

  const items: AdminGalleryAlbumListItem[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    publishedAt: row.publishedAt,
    itemCount: row._count.items,
    coverUrl: row.coverMedia
      ? publicLibraryUrl(row.coverMedia.storageKey)
      : null,
    coverAlt:
      row.coverMedia?.altText?.trim() ||
      row.coverMedia?.title?.trim() ||
      row.title,
    updatedAt: row.updatedAt,
  }));

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getAdminGalleryAlbum(
  organizationId: string,
  albumId: string,
) {
  const album = await prisma.galleryAlbum.findFirst({
    where: { id: albumId, organizationId, deletedAt: null },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      isActive: true,
      sortOrder: true,
      publishedAt: true,
      coverMediaId: true,
      coverMedia: {
        select: {
          id: true,
          storageKey: true,
          altText: true,
          title: true,
          status: true,
          deletedAt: true,
        },
      },
      items: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          mediaId: true,
          caption: true,
          sortOrder: true,
          media: {
            select: {
              id: true,
              title: true,
              altText: true,
              category: true,
              status: true,
              deletedAt: true,
              storageKey: true,
              width: true,
              height: true,
            },
          },
        },
      },
    },
  });

  if (!album) return null;

  return {
    id: album.id,
    title: album.title,
    slug: album.slug,
    description: album.description,
    isActive: album.isActive,
    sortOrder: album.sortOrder,
    publishedAt: album.publishedAt,
    coverMediaId: album.coverMediaId,
    coverUrl: album.coverMedia
      ? publicLibraryUrl(album.coverMedia.storageKey)
      : null,
    coverAlt:
      album.coverMedia?.altText?.trim() ||
      album.coverMedia?.title?.trim() ||
      album.title,
    items: album.items.map((item) => ({
      id: item.id,
      mediaId: item.mediaId,
      caption: item.caption,
      sortOrder: item.sortOrder,
      mediaActive:
        item.media.deletedAt == null && item.media.status === "ACTIVE",
      title: item.media.title,
      altText: item.media.altText,
      category: item.media.category,
      url: publicLibraryUrl(item.media.storageKey),
      width: item.media.width,
      height: item.media.height,
    })),
  };
}

export { slugFromGalleryAlbumTitle, normalizeGalleryAlbumSlug };
