"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/require-admin";
import {
  generateLibraryStorageKey,
  LIBRARY_ALT_MAX,
  LIBRARY_CATEGORY_MAX,
  LIBRARY_DESCRIPTION_MAX,
  LIBRARY_TITLE_MAX,
  libraryMediaMetadataToJson,
  normalizeMediaCategory,
  normalizeOptionalText,
  processLibraryImageUpload,
} from "@/lib/media/library-image";
import { getMediaAssetDependencies } from "@/lib/media/media-dependencies";
import { writeMediaFile } from "@/lib/media/storage";
import { prisma } from "@/lib/prisma";
import { buildMediaEditorialUpdate } from "@/lib/website/media-library-admin";

export type MediaLibraryActionState = {
  formError?: string;
  successMessage?: string;
  fieldErrors?: Record<string, string>;
  dependencies?: Array<{ label: string; detail: string; href?: string }>;
  uploadedCount?: number;
};

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function revalidateMediaLibrary(slug?: string) {
  revalidatePath("/admin/website/media");
  revalidatePath("/admin/website/gallery");
  revalidatePath("/admin/website/media/placements");
  revalidatePath("/gallery");
  revalidatePath("/");
  if (slug) revalidatePath(`/gallery/${slug}`);
}

export async function uploadLibraryMediaAction(
  _prev: MediaLibraryActionState,
  formData: FormData,
): Promise<MediaLibraryActionState> {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;

  const files = formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (files.length === 0) {
    return { formError: "لطفاً حداقل یک تصویر انتخاب کنید." };
  }

  if (files.length > 20) {
    return { formError: "حداکثر ۲۰ فایل در هر بارگذاری مجاز است." };
  }

  const sharedTitle = normalizeOptionalText(
    readString(formData, "title"),
    LIBRARY_TITLE_MAX,
  );
  const sharedDescription = normalizeOptionalText(
    readString(formData, "description"),
    LIBRARY_DESCRIPTION_MAX,
  );
  const sharedAlt = normalizeOptionalText(
    readString(formData, "altText"),
    LIBRARY_ALT_MAX,
  );
  const sharedCategory = normalizeMediaCategory(
    readString(formData, "category"),
  );

  let uploadedCount = 0;
  const errors: string[] = [];

  for (const file of files) {
    const processed = await processLibraryImageUpload(file);
    if (!processed.ok) {
      errors.push(`${file.name || "فایل"}: ${processed.error}`);
      continue;
    }

    try {
      const storageKey = generateLibraryStorageKey(processed.extension);
      const written = await writeMediaFile({
        storageKey,
        data: processed.buffer,
      });

      await prisma.mediaAsset.create({
        data: {
          organizationId,
          storageKey,
          originalName: processed.originalName,
          mimeType: processed.mimeType,
          byteSize: written.byteSize,
          checksum: written.checksum,
          width: processed.width,
          height: processed.height,
          title: sharedTitle,
          description: sharedDescription,
          altText: sharedAlt,
          category: sharedCategory,
          status: "ACTIVE",
          metadata: libraryMediaMetadataToJson(),
          createdByUserId: session.user.id,
        },
      });
      uploadedCount += 1;
    } catch {
      errors.push(`${file.name || "فایل"}: ذخیره فایل ناموفق بود.`);
    }
  }

  revalidateMediaLibrary();

  if (uploadedCount === 0) {
    return {
      formError:
        errors[0] || "هیچ فایلی بارگذاری نشد. لطفاً دوباره تلاش کنید.",
    };
  }

  return {
    successMessage:
      uploadedCount === 1
        ? "۱ تصویر با موفقیت به کتابخانه اضافه شد."
        : `${uploadedCount} تصویر با موفقیت به کتابخانه اضافه شد.`,
    uploadedCount,
    formError: errors.length > 0 ? errors.join(" ") : undefined,
  };
}

export async function updateLibraryMediaAction(
  _prev: MediaLibraryActionState,
  formData: FormData,
): Promise<MediaLibraryActionState> {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;
  const mediaId = readString(formData, "mediaId").trim();

  if (!mediaId) {
    return { formError: "شناسه رسانه نامعتبر است." };
  }

  const existing = await prisma.mediaAsset.findFirst({
    where: { id: mediaId, organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) {
    return { formError: "رسانه یافت نشد." };
  }

  const statusRaw = readString(formData, "status").trim();
  if (statusRaw !== "ACTIVE" && statusRaw !== "INACTIVE") {
    return {
      fieldErrors: { status: "وضعیت نامعتبر است." },
    };
  }

  const title = normalizeOptionalText(
    readString(formData, "title"),
    LIBRARY_TITLE_MAX,
  );
  const description = normalizeOptionalText(
    readString(formData, "description"),
    LIBRARY_DESCRIPTION_MAX,
  );
  const altText = normalizeOptionalText(
    readString(formData, "altText"),
    LIBRARY_ALT_MAX,
  );
  const category = normalizeMediaCategory(readString(formData, "category"));

  if (readString(formData, "category").trim().length > LIBRARY_CATEGORY_MAX) {
    return {
      fieldErrors: {
        category: `دسته حداکثر ${LIBRARY_CATEGORY_MAX} نویسه می‌تواند باشد.`,
      },
    };
  }

  await prisma.mediaAsset.update({
    where: { id: mediaId },
    data: buildMediaEditorialUpdate({
      title,
      description,
      altText,
      category,
      status: statusRaw,
    }),
  });

  revalidateMediaLibrary();
  return { successMessage: "اطلاعات رسانه به‌روزرسانی شد." };
}

export async function setLibraryMediaStatusAction(
  formData: FormData,
): Promise<void> {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;
  const mediaId = readString(formData, "mediaId").trim();
  const statusRaw = readString(formData, "status").trim();

  if (!mediaId || (statusRaw !== "ACTIVE" && statusRaw !== "INACTIVE")) {
    return;
  }

  const existing = await prisma.mediaAsset.findFirst({
    where: { id: mediaId, organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) return;

  await prisma.mediaAsset.update({
    where: { id: mediaId },
    data: { status: statusRaw },
  });
  revalidateMediaLibrary();
}

export async function bulkSetLibraryMediaStatusAction(
  formData: FormData,
): Promise<void> {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;
  const statusRaw = readString(formData, "status").trim();
  const ids = formData
    .getAll("mediaIds")
    .filter((value): value is string => typeof value === "string" && value.length > 0);

  if (
    ids.length === 0 ||
    (statusRaw !== "ACTIVE" && statusRaw !== "INACTIVE")
  ) {
    return;
  }

  await prisma.mediaAsset.updateMany({
    where: {
      organizationId,
      deletedAt: null,
      id: { in: ids.slice(0, 100) },
    },
    data: { status: statusRaw },
  });
  revalidateMediaLibrary();
}

export async function deleteLibraryMediaAction(
  _prev: MediaLibraryActionState,
  formData: FormData,
): Promise<MediaLibraryActionState> {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;
  const mediaId = readString(formData, "mediaId").trim();

  if (!mediaId) {
    return { formError: "شناسه رسانه نامعتبر است." };
  }

  const existing = await prisma.mediaAsset.findFirst({
    where: { id: mediaId, organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) {
    return { formError: "رسانه یافت نشد." };
  }

  const report = await getMediaAssetDependencies(organizationId, mediaId);
  if (!report.canDelete) {
    return {
      formError:
        "حذف ممکن نیست؛ این رسانه هنوز در بخش‌های زیر استفاده می‌شود. ابتدا وابستگی‌ها را حذف یا جایگزین کنید.",
      dependencies: report.dependencies.map((dep) => ({
        label: dep.label,
        detail: dep.detail,
        href: dep.href,
      })),
    };
  }

  await prisma.mediaAsset.update({
    where: { id: mediaId },
    data: { deletedAt: new Date(), status: "INACTIVE" },
  });

  revalidateMediaLibrary();
  return { successMessage: "رسانه حذف شد (حذف نرم)." };
}
