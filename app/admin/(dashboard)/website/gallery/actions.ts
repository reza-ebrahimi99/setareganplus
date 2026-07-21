"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/require-admin";
import {
  LIBRARY_CAPTION_MAX,
  LIBRARY_DESCRIPTION_MAX,
  LIBRARY_TITLE_MAX,
  normalizeOptionalText,
} from "@/lib/media/library-image";
import { prisma } from "@/lib/prisma";
import {
  slugFromGalleryAlbumTitle,
  uniqueGalleryAlbumSlug,
} from "@/lib/website/gallery-admin";

export type GalleryActionState = {
  formError?: string;
  successMessage?: string;
  fieldErrors?: Record<string, string>;
  albumId?: string;
};

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function revalidateGallery(slug?: string) {
  revalidatePath("/admin/website/gallery");
  revalidatePath("/admin/website/media");
  revalidatePath("/admin/website/media/placements");
  revalidatePath("/gallery");
  revalidatePath("/");
  if (slug) revalidatePath(`/gallery/${slug}`);
}

function parseOptionalDate(raw: string): Date | null {
  const value = raw.trim();
  if (!value) return null;
  const date = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export async function createGalleryAlbumAction(
  formData: FormData,
): Promise<void> {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;

  const title =
    normalizeOptionalText(readString(formData, "title"), LIBRARY_TITLE_MAX) ||
    "";
  const description = normalizeOptionalText(
    readString(formData, "description"),
    LIBRARY_DESCRIPTION_MAX,
  );
  const slugInput = readString(formData, "slug").trim();
  const isActive = readString(formData, "isActive") === "true";
  const sortOrder = Number.parseInt(readString(formData, "sortOrder") || "0", 10);
  const publishedAt = parseOptionalDate(readString(formData, "publishedAt"));

  if (title.length < 2) {
    return;
  }

  const slug = await uniqueGalleryAlbumSlug(
    organizationId,
    slugInput || slugFromGalleryAlbumTitle(title),
  );

  const album = await prisma.galleryAlbum.create({
    data: {
      organizationId,
      title,
      slug,
      description,
      isActive,
      sortOrder: Number.isSafeInteger(sortOrder) ? sortOrder : 0,
      publishedAt: publishedAt ?? (isActive ? new Date() : null),
    },
    select: { id: true, slug: true },
  });

  revalidateGallery(album.slug);
  redirect(`/admin/website/gallery/${album.id}`);
}

export async function updateGalleryAlbumAction(
  _prev: GalleryActionState,
  formData: FormData,
): Promise<GalleryActionState> {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;
  const albumId = readString(formData, "albumId").trim();

  const existing = await prisma.galleryAlbum.findFirst({
    where: { id: albumId, organizationId, deletedAt: null },
    select: { id: true, slug: true },
  });
  if (!existing) {
    return { formError: "آلبوم یافت نشد." };
  }

  const title =
    normalizeOptionalText(readString(formData, "title"), LIBRARY_TITLE_MAX) ||
    "";
  const description = normalizeOptionalText(
    readString(formData, "description"),
    LIBRARY_DESCRIPTION_MAX,
  );
  const slugInput = readString(formData, "slug").trim();
  const isActive = readString(formData, "isActive") === "true";
  const sortOrder = Number.parseInt(readString(formData, "sortOrder") || "0", 10);
  const publishedAt = parseOptionalDate(readString(formData, "publishedAt"));
  const coverMediaIdRaw = readString(formData, "coverMediaId").trim();
  const coverMediaId = coverMediaIdRaw.length > 0 ? coverMediaIdRaw : null;

  const fieldErrors: Record<string, string> = {};
  if (title.length < 2) {
    fieldErrors.title = "عنوان آلبوم حداقل ۲ نویسه باشد.";
  }

  if (coverMediaId) {
    const cover = await prisma.mediaAsset.findFirst({
      where: {
        id: coverMediaId,
        organizationId,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!cover) {
      fieldErrors.coverMediaId = "تصویر کاور در کتابخانه این سازمان یافت نشد.";
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  const slug = await uniqueGalleryAlbumSlug(
    organizationId,
    slugInput || slugFromGalleryAlbumTitle(title),
    albumId,
  );

  await prisma.galleryAlbum.update({
    where: { id: albumId },
    data: {
      title,
      slug,
      description,
      isActive,
      sortOrder: Number.isSafeInteger(sortOrder) ? sortOrder : 0,
      publishedAt,
      coverMediaId,
    },
  });

  revalidateGallery(slug);
  revalidateGallery(existing.slug);
  return { successMessage: "آلبوم به‌روزرسانی شد.", albumId };
}

export async function deleteGalleryAlbumAction(
  _prev: GalleryActionState,
  formData: FormData,
): Promise<GalleryActionState> {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;
  const albumId = readString(formData, "albumId").trim();

  const existing = await prisma.galleryAlbum.findFirst({
    where: { id: albumId, organizationId, deletedAt: null },
    select: { id: true, slug: true },
  });
  if (!existing) {
    return { formError: "آلبوم یافت نشد." };
  }

  const placementCount = await prisma.mediaPlacement.count({
    where: { organizationId, albumId, deletedAt: null },
  });
  if (placementCount > 0) {
    return {
      formError: `این آلبوم در ${placementCount} جایگاه رسانه استفاده شده است. ابتدا جایگاه‌ها را حذف کنید.`,
    };
  }

  const stamp = Date.now().toString(36);
  await prisma.$transaction(async (tx) => {
    await tx.galleryAlbumItem.deleteMany({ where: { albumId } });
    await tx.galleryAlbum.update({
      where: { id: albumId },
      data: {
        deletedAt: new Date(),
        isActive: false,
        slug: `${existing.slug}-deleted-${stamp}`.slice(0, 80),
      },
    });
  });

  revalidateGallery(existing.slug);
  return { successMessage: "آلبوم حذف شد." };
}

export async function addGalleryAlbumItemsAction(
  _prev: GalleryActionState,
  formData: FormData,
): Promise<GalleryActionState> {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;
  const albumId = readString(formData, "albumId").trim();
  const mediaIds = formData
    .getAll("mediaIds")
    .filter((value): value is string => typeof value === "string" && value.length > 0);

  if (!albumId || mediaIds.length === 0) {
    return { formError: "آلبوم و حداقل یک تصویر را انتخاب کنید." };
  }

  const album = await prisma.galleryAlbum.findFirst({
    where: { id: albumId, organizationId, deletedAt: null },
    select: { id: true, slug: true },
  });
  if (!album) {
    return { formError: "آلبوم یافت نشد." };
  }

  const uniqueMediaIds = [...new Set(mediaIds)].slice(0, 50);
  const mediaRows = await prisma.mediaAsset.findMany({
    where: {
      organizationId,
      deletedAt: null,
      id: { in: uniqueMediaIds },
    },
    select: { id: true },
  });
  if (mediaRows.length !== uniqueMediaIds.length) {
    return {
      formError: "برخی تصاویر در کتابخانه این سازمان یافت نشدند.",
    };
  }

  const existingItems = await prisma.galleryAlbumItem.findMany({
    where: { albumId, mediaId: { in: uniqueMediaIds } },
    select: { mediaId: true },
  });
  const existingSet = new Set(existingItems.map((item) => item.mediaId));
  const toAdd = uniqueMediaIds.filter((id) => !existingSet.has(id));
  if (toAdd.length === 0) {
    return { formError: "این تصاویر از قبل در آلبوم هستند." };
  }

  const maxSort = await prisma.galleryAlbumItem.aggregate({
    where: { albumId },
    _max: { sortOrder: true },
  });
  let nextSort = (maxSort._max.sortOrder ?? -1) + 1;

  await prisma.$transaction(
    toAdd.map((mediaId) => {
      const sortOrder = nextSort;
      nextSort += 1;
      return prisma.galleryAlbumItem.create({
        data: { albumId, mediaId, sortOrder },
      });
    }),
  );

  revalidateGallery(album.slug);
  return {
    successMessage: `${toAdd.length} تصویر به آلبوم اضافه شد.`,
    albumId,
  };
}

export async function updateGalleryAlbumItemAction(
  formData: FormData,
): Promise<void> {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;
  const itemId = readString(formData, "itemId").trim();
  const caption = normalizeOptionalText(
    readString(formData, "caption"),
    LIBRARY_CAPTION_MAX,
  );

  const item = await prisma.galleryAlbumItem.findFirst({
    where: {
      id: itemId,
      album: { organizationId, deletedAt: null },
    },
    select: {
      id: true,
      album: { select: { id: true, slug: true } },
    },
  });
  if (!item) return;

  await prisma.galleryAlbumItem.update({
    where: { id: itemId },
    data: { caption },
  });

  revalidateGallery(item.album.slug);
}

export async function removeGalleryAlbumItemAction(
  formData: FormData,
): Promise<void> {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;
  const itemId = readString(formData, "itemId").trim();

  const item = await prisma.galleryAlbumItem.findFirst({
    where: {
      id: itemId,
      album: { organizationId, deletedAt: null },
    },
    select: {
      id: true,
      album: { select: { slug: true } },
    },
  });
  if (!item) return;

  await prisma.galleryAlbumItem.delete({ where: { id: itemId } });
  revalidateGallery(item.album.slug);
}

export async function reorderGalleryAlbumItemsAction(
  _prev: GalleryActionState,
  formData: FormData,
): Promise<GalleryActionState> {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;
  const albumId = readString(formData, "albumId").trim();
  const orderedIds = formData
    .getAll("itemIds")
    .filter((value): value is string => typeof value === "string" && value.length > 0);

  if (!albumId || orderedIds.length === 0) {
    return { formError: "ترتیب نامعتبر است." };
  }

  const album = await prisma.galleryAlbum.findFirst({
    where: { id: albumId, organizationId, deletedAt: null },
    select: { id: true, slug: true },
  });
  if (!album) {
    return { formError: "آلبوم یافت نشد." };
  }

  const items = await prisma.galleryAlbumItem.findMany({
    where: { albumId },
    select: { id: true },
  });
  const itemIdSet = new Set(items.map((item) => item.id));

  if (
    orderedIds.length !== items.length ||
    orderedIds.some((id) => !itemIdSet.has(id))
  ) {
    return {
      formError:
        "ترتیب نامعتبر است؛ همه آیتم‌ها باید متعلق به همین آلبوم و سازمان باشند.",
    };
  }

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.galleryAlbumItem.update({
        where: { id },
        data: { sortOrder: index },
      }),
    ),
  );

  revalidateGallery(album.slug);
  return { successMessage: "ترتیب تصاویر به‌روزرسانی شد.", albumId };
}

export async function setGalleryAlbumActiveAction(
  formData: FormData,
): Promise<void> {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;
  const albumId = readString(formData, "albumId").trim();
  const isActive = readString(formData, "isActive") === "true";

  const existing = await prisma.galleryAlbum.findFirst({
    where: { id: albumId, organizationId, deletedAt: null },
    select: { id: true, slug: true, publishedAt: true },
  });
  if (!existing) return;

  await prisma.galleryAlbum.update({
    where: { id: albumId },
    data: {
      isActive,
      ...(isActive && !existing.publishedAt
        ? { publishedAt: new Date() }
        : {}),
    },
  });
  revalidateGallery(existing.slug);
}
