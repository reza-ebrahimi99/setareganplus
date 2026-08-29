"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/require-admin";
import {
  LIBRARY_DESCRIPTION_MAX,
  LIBRARY_TITLE_MAX,
  normalizeOptionalText,
} from "@/lib/media/library-image";
import {
  HOME_GALLERY_PLACEMENT_KEY,
  isMediaPlacementKey,
} from "@/lib/media/placement-keys";
import { prisma } from "@/lib/prisma";
import {
  validatePlacementSchedule,
  validatePlacementTarget,
} from "@/lib/website/media-placements-admin";

export type PlacementActionState = {
  formError?: string;
  successMessage?: string;
  fieldErrors?: Record<string, string>;
};

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function revalidatePlacements() {
  revalidatePath("/admin/website/media/placements");
  revalidatePath("/admin/website/media");
  revalidatePath("/admin/website/gallery");
  revalidatePath("/gallery");
  revalidatePath("/");
}

function parseOptionalDateTime(raw: string): Date | null {
  const value = raw.trim();
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export async function createMediaPlacementAction(
  formData: FormData,
): Promise<void> {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;

  const placementKeyRaw =
    readString(formData, "placementKey").trim() || HOME_GALLERY_PLACEMENT_KEY;
  if (!isMediaPlacementKey(placementKeyRaw)) {
    return;
  }

  const target = validatePlacementTarget({
    mediaId: readString(formData, "mediaId"),
    albumId: readString(formData, "albumId"),
  });
  if (!target.ok) {
    return;
  }

  if (target.mediaId) {
    const media = await prisma.mediaAsset.findFirst({
      where: { id: target.mediaId, organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!media) {
      return;
    }
  }

  if (target.albumId) {
    const album = await prisma.galleryAlbum.findFirst({
      where: { id: target.albumId, organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!album) {
      return;
    }
  }

  const startAt = parseOptionalDateTime(readString(formData, "startAt"));
  const endAt = parseOptionalDateTime(readString(formData, "endAt"));
  const schedule = validatePlacementSchedule(startAt, endAt);
  if (!schedule.ok) {
    return;
  }

  const sortOrder = Number.parseInt(readString(formData, "sortOrder") || "0", 10);
  const isActive = readString(formData, "isActive") === "true";

  await prisma.mediaPlacement.create({
    data: {
      organizationId,
      placementKey: placementKeyRaw,
      mediaId: target.mediaId,
      albumId: target.albumId,
      titleOverride: normalizeOptionalText(
        readString(formData, "titleOverride"),
        LIBRARY_TITLE_MAX,
      ),
      descriptionOverride: normalizeOptionalText(
        readString(formData, "descriptionOverride"),
        LIBRARY_DESCRIPTION_MAX,
      ),
      sortOrder: Number.isSafeInteger(sortOrder) ? sortOrder : 0,
      isActive,
      startAt,
      endAt,
    },
  });

  revalidatePlacements();
}

export async function updateMediaPlacementAction(
  _prev: PlacementActionState,
  formData: FormData,
): Promise<PlacementActionState> {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;
  const placementId = readString(formData, "placementId").trim();

  const existing = await prisma.mediaPlacement.findFirst({
    where: { id: placementId, organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) {
    return { formError: "جایگاه یافت نشد." };
  }

  const target = validatePlacementTarget({
    mediaId: readString(formData, "mediaId"),
    albumId: readString(formData, "albumId"),
  });
  if (!target.ok) {
    return { formError: target.error };
  }

  if (target.mediaId) {
    const media = await prisma.mediaAsset.findFirst({
      where: { id: target.mediaId, organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!media) {
      return { formError: "تصویر انتخاب‌شده در این سازمان یافت نشد." };
    }
  }

  if (target.albumId) {
    const album = await prisma.galleryAlbum.findFirst({
      where: { id: target.albumId, organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!album) {
      return { formError: "آلبوم انتخاب‌شده در این سازمان یافت نشد." };
    }
  }

  const startAt = parseOptionalDateTime(readString(formData, "startAt"));
  const endAt = parseOptionalDateTime(readString(formData, "endAt"));
  const schedule = validatePlacementSchedule(startAt, endAt);
  if (!schedule.ok) {
    return { formError: schedule.error };
  }

  const sortOrder = Number.parseInt(readString(formData, "sortOrder") || "0", 10);
  const isActive = readString(formData, "isActive") === "true";

  await prisma.$transaction(async (tx) => {
    await tx.mediaPlacement.update({
      where: { id: placementId },
      data: {
        mediaId: target.mediaId,
        albumId: target.albumId,
        titleOverride: normalizeOptionalText(
          readString(formData, "titleOverride"),
          LIBRARY_TITLE_MAX,
        ),
        descriptionOverride: normalizeOptionalText(
          readString(formData, "descriptionOverride"),
          LIBRARY_DESCRIPTION_MAX,
        ),
        sortOrder: Number.isSafeInteger(sortOrder) ? sortOrder : 0,
        isActive,
        startAt,
        endAt,
      },
    });
  });

  revalidatePlacements();
  return { successMessage: "جایگاه به‌روزرسانی شد." };
}

export async function deleteMediaPlacementAction(
  formData: FormData,
): Promise<void> {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;
  const placementId = readString(formData, "placementId").trim();

  const existing = await prisma.mediaPlacement.findFirst({
    where: { id: placementId, organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) return;

  await prisma.mediaPlacement.update({
    where: { id: placementId },
    data: { deletedAt: new Date(), isActive: false },
  });
  revalidatePlacements();
}

export async function reorderMediaPlacementsAction(
  _prev: PlacementActionState,
  formData: FormData,
): Promise<PlacementActionState> {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;
  const placementKey =
    readString(formData, "placementKey").trim() || HOME_GALLERY_PLACEMENT_KEY;
  const orderedIds = formData
    .getAll("placementIds")
    .filter((value): value is string => typeof value === "string" && value.length > 0);

  if (!isMediaPlacementKey(placementKey) || orderedIds.length === 0) {
    return { formError: "ترتیب جایگاه نامعتبر است." };
  }

  const rows = await prisma.mediaPlacement.findMany({
    where: {
      organizationId,
      placementKey,
      deletedAt: null,
    },
    select: { id: true },
  });
  const idSet = new Set(rows.map((row) => row.id));

  if (
    orderedIds.length !== rows.length ||
    orderedIds.some((id) => !idSet.has(id))
  ) {
    return {
      formError:
        "ترتیب نامعتبر است؛ همه جایگاه‌ها باید متعلق به همین کلید و سازمان باشند.",
    };
  }

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.mediaPlacement.update({
        where: { id },
        data: { sortOrder: index },
      }),
    ),
  );

  revalidatePlacements();
  return { successMessage: "ترتیب جایگاه‌ها به‌روزرسانی شد." };
}
