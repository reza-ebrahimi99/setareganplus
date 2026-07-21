"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/require-admin";
import { tryUnlinkMediaFile, writeMediaFile } from "@/lib/media/storage";
import {
  achievementImageMetadataToJson,
  achievementMediaKeysToUnlink,
  achievementPdfMetadataToJson,
  buildAchievementImageMetadata,
  buildAchievementPdfMetadata,
  generateAchievementImageKeys,
  generateAchievementPdfKey,
  processAchievementCertificateUpload,
  processAchievementImageUpload,
} from "@/lib/media/achievement-media";
import { prisma } from "@/lib/prisma";
import {
  categorySlugFromName,
  ensureDefaultAchievementCategories,
} from "@/lib/website/achievement-categories";
import {
  normalizeAchievementSlug,
  slugFromAchievementTitle,
} from "@/lib/website/achievement-slug";

export type AchievementActionState = {
  formError?: string;
  successMessage?: string;
  fieldErrors?: Record<string, string>;
};

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function revalidateAchievements(slug?: string) {
  revalidatePath("/admin/website/achievements");
  revalidatePath("/admin/website/achievement-categories");
  revalidatePath("/achievements");
  if (slug) revalidatePath(`/achievements/${slug}`);
}

async function uniqueAchievementSlug(
  organizationId: string,
  desired: string,
  excludeId?: string,
): Promise<string> {
  let base = normalizeAchievementSlug(desired);
  if (base.length < 2) base = `achievement-${Date.now().toString(36)}`;
  let candidate = base;
  for (let i = 0; i < 20; i += 1) {
    const hit = await prisma.achievement.findFirst({
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

function parseAchievementDate(raw: string): Date | null {
  const value = raw.trim();
  if (!value) return null;
  const date = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

async function cleanupUnusedMedia(mediaId: string | null | undefined) {
  if (!mediaId) return;
  const [teamUse, studentUse, formUse, certUse, coverUse] = await Promise.all([
    prisma.teamMember.count({
      where: { portraitMediaId: mediaId, deletedAt: null },
    }),
    prisma.student.count({
      where: { portraitMediaId: mediaId, deletedAt: null },
    }),
    prisma.formVersion.count({ where: { posterMediaId: mediaId } }),
    prisma.achievement.count({
      where: { certificateMediaId: mediaId, deletedAt: null },
    }),
    prisma.achievement.count({
      where: { coverMediaId: mediaId, deletedAt: null },
    }),
  ]);
  if (teamUse + studentUse + formUse + certUse + coverUse > 0) return;

  const old = await prisma.mediaAsset.findFirst({
    where: { id: mediaId },
    select: { storageKey: true, metadata: true },
  });
  await prisma.mediaAsset.update({
    where: { id: mediaId },
    data: { deletedAt: new Date() },
  });
  if (old) {
    for (const key of achievementMediaKeysToUnlink(old)) {
      await tryUnlinkMediaFile(key);
    }
  }
}

export async function createAchievement(
  _prev: AchievementActionState,
  formData: FormData,
): Promise<AchievementActionState> {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;
  await ensureDefaultAchievementCategories(organizationId);

  const title = readString(formData, "title").trim().slice(0, 200);
  const studentId = readString(formData, "studentId").trim();
  const categoryId = readString(formData, "categoryId").trim();
  const fieldErrors: Record<string, string> = {};

  if (!title) fieldErrors.title = "عنوان الزامی است.";
  if (!studentId) fieldErrors.studentId = "دانش‌آموز الزامی است.";
  if (!categoryId) fieldErrors.categoryId = "دسته‌بندی الزامی است.";

  const [student, category] = await Promise.all([
    studentId
      ? prisma.student.findFirst({
          where: { id: studentId, organizationId, deletedAt: null },
          select: { id: true, slug: true },
        })
      : Promise.resolve(null),
    categoryId
      ? prisma.achievementCategory.findFirst({
          where: { id: categoryId, organizationId, deletedAt: null },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);

  if (studentId && !student) fieldErrors.studentId = "دانش‌آموز معتبر نیست.";
  if (categoryId && !category) fieldErrors.categoryId = "دسته‌بندی معتبر نیست.";
  if (Object.keys(fieldErrors).length > 0) {
    return { formError: "لطفاً خطاهای فرم را برطرف کنید.", fieldErrors };
  }

  const slug = await uniqueAchievementSlug(
    organizationId,
    readString(formData, "slug").trim() || slugFromAchievementTitle(title),
  );
  const displayOrder = Number(readString(formData, "displayOrder") || "0");
  const featuredPriority = Number(
    readString(formData, "featuredPriority") || "0",
  );

  await prisma.achievement.create({
    data: {
      organizationId,
      studentId: student!.id,
      categoryId: category!.id,
      title,
      slug,
      shortDescription: readString(formData, "shortDescription")
        .trim()
        .slice(0, 400),
      description: readString(formData, "description").trim().slice(0, 8000),
      achievementDate: parseAchievementDate(
        readString(formData, "achievementDate"),
      ),
      schoolYear:
        readString(formData, "schoolYear").trim().slice(0, 40) || null,
      issuer: readString(formData, "issuer").trim().slice(0, 160) || null,
      level: readString(formData, "level").trim().slice(0, 120) || null,
      place: readString(formData, "place").trim().slice(0, 120) || null,
      score: readString(formData, "score").trim().slice(0, 80) || null,
      seoTitle: readString(formData, "seoTitle").trim().slice(0, 160) || null,
      seoDescription:
        readString(formData, "seoDescription").trim().slice(0, 320) || null,
      displayOrder: Number.isFinite(displayOrder) ? displayOrder : 0,
      featuredPriority: Number.isFinite(featuredPriority)
        ? featuredPriority
        : 0,
      isFeatured: readString(formData, "isFeatured") === "true",
      isPublished: readString(formData, "isPublished") === "true",
    },
  });

  revalidateAchievements(slug);
  return { successMessage: "افتخار با موفقیت ثبت شد." };
}

export async function updateAchievement(
  _prev: AchievementActionState,
  formData: FormData,
): Promise<AchievementActionState> {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;
  const achievementId = readString(formData, "achievementId").trim();

  const existing = await prisma.achievement.findFirst({
    where: { id: achievementId, organizationId, deletedAt: null },
    select: {
      id: true,
      slug: true,
      student: { select: { slug: true } },
    },
  });
  if (!existing) return { formError: "افتخار یافت نشد." };

  const title = readString(formData, "title").trim().slice(0, 200);
  const studentId = readString(formData, "studentId").trim();
  const categoryId = readString(formData, "categoryId").trim();
  const fieldErrors: Record<string, string> = {};
  if (!title) fieldErrors.title = "عنوان الزامی است.";
  if (!studentId) fieldErrors.studentId = "دانش‌آموز الزامی است.";
  if (!categoryId) fieldErrors.categoryId = "دسته‌بندی الزامی است.";

  const [student, category] = await Promise.all([
    prisma.student.findFirst({
      where: { id: studentId, organizationId, deletedAt: null },
      select: { id: true, slug: true },
    }),
    prisma.achievementCategory.findFirst({
      where: { id: categoryId, organizationId, deletedAt: null },
      select: { id: true },
    }),
  ]);
  if (!student) fieldErrors.studentId = "دانش‌آموز معتبر نیست.";
  if (!category) fieldErrors.categoryId = "دسته‌بندی معتبر نیست.";
  if (Object.keys(fieldErrors).length > 0) {
    return { formError: "لطفاً خطاهای فرم را برطرف کنید.", fieldErrors };
  }

  const slug = await uniqueAchievementSlug(
    organizationId,
    readString(formData, "slug").trim() || slugFromAchievementTitle(title),
    existing.id,
  );
  const displayOrder = Number(readString(formData, "displayOrder") || "0");
  const featuredPriority = Number(
    readString(formData, "featuredPriority") || "0",
  );

  await prisma.achievement.update({
    where: { id: existing.id },
    data: {
      studentId: student!.id,
      categoryId: category!.id,
      title,
      slug,
      shortDescription: readString(formData, "shortDescription")
        .trim()
        .slice(0, 400),
      description: readString(formData, "description").trim().slice(0, 8000),
      achievementDate: parseAchievementDate(
        readString(formData, "achievementDate"),
      ),
      schoolYear:
        readString(formData, "schoolYear").trim().slice(0, 40) || null,
      issuer: readString(formData, "issuer").trim().slice(0, 160) || null,
      level: readString(formData, "level").trim().slice(0, 120) || null,
      place: readString(formData, "place").trim().slice(0, 120) || null,
      score: readString(formData, "score").trim().slice(0, 80) || null,
      seoTitle: readString(formData, "seoTitle").trim().slice(0, 160) || null,
      seoDescription:
        readString(formData, "seoDescription").trim().slice(0, 320) || null,
      displayOrder: Number.isFinite(displayOrder) ? displayOrder : 0,
      featuredPriority: Number.isFinite(featuredPriority)
        ? featuredPriority
        : 0,
      isFeatured: readString(formData, "isFeatured") === "true",
      isPublished: readString(formData, "isPublished") === "true",
      archivedAt:
        readString(formData, "archived") === "true" ? new Date() : null,
    },
  });

  revalidateAchievements(slug);
  revalidateAchievements(existing.slug);
  return { successMessage: "تغییرات ذخیره شد." };
}

export async function archiveAchievement(formData: FormData) {
  const session = await requirePermission("website.manage");
  const achievementId = readString(formData, "achievementId").trim();
  const achievement = await prisma.achievement.findFirst({
    where: {
      id: achievementId,
      organizationId: session.organization.id,
      deletedAt: null,
    },
    select: {
      id: true,
      slug: true,
      archivedAt: true,
      student: { select: { slug: true } },
    },
  });
  if (!achievement || achievement.archivedAt) return;
  await prisma.achievement.update({
    where: { id: achievement.id },
    data: { archivedAt: new Date(), isFeatured: false, isPublished: false },
  });
  revalidateAchievements(achievement.slug);
}

export async function restoreAchievement(formData: FormData) {
  const session = await requirePermission("website.manage");
  const achievementId = readString(formData, "achievementId").trim();
  const achievement = await prisma.achievement.findFirst({
    where: {
      id: achievementId,
      organizationId: session.organization.id,
      deletedAt: null,
    },
    select: {
      id: true,
      slug: true,
      archivedAt: true,
      student: { select: { slug: true } },
    },
  });
  if (!achievement || !achievement.archivedAt) return;
  await prisma.achievement.update({
    where: { id: achievement.id },
    data: { archivedAt: null },
  });
  revalidateAchievements(achievement.slug);
}

export async function deleteAchievement(formData: FormData) {
  const session = await requirePermission("website.manage");
  const achievementId = readString(formData, "achievementId").trim();
  const achievement = await prisma.achievement.findFirst({
    where: {
      id: achievementId,
      organizationId: session.organization.id,
      deletedAt: null,
    },
    select: {
      id: true,
      slug: true,
      student: { select: { slug: true } },
    },
  });
  if (!achievement) return;
  await prisma.achievement.update({
    where: { id: achievement.id },
    data: {
      deletedAt: new Date(),
      isPublished: false,
      isFeatured: false,
      slug: `${achievement.slug}-deleted-${Date.now().toString(36)}`,
    },
  });
  revalidateAchievements(achievement.slug);
}

export async function uploadCover(
  _prev: AchievementActionState,
  formData: FormData,
): Promise<AchievementActionState> {
  const session = await requirePermission("website.manage");
  const achievementId = readString(formData, "achievementId").trim();
  const achievement = await prisma.achievement.findFirst({
    where: {
      id: achievementId,
      organizationId: session.organization.id,
      deletedAt: null,
    },
    select: {
      id: true,
      slug: true,
      title: true,
      coverMediaId: true,
      student: { select: { slug: true } },
    },
  });
  if (!achievement) return { formError: "افتخار یافت نشد." };

  const processed = await processAchievementImageUpload(
    formData.get("cover") instanceof File
      ? (formData.get("cover") as File)
      : null,
  );
  if (!processed.ok) return { formError: processed.error };

  const altText =
    readString(formData, "altText").trim().slice(0, 200) || achievement.title;
  const keys = generateAchievementImageKeys("cover");

  let written960;
  try {
    await writeMediaFile({
      storageKey: keys.w480,
      data: processed.variants.w480.buffer,
    });
    written960 = await writeMediaFile({
      storageKey: keys.w960,
      data: processed.variants.w960.buffer,
    });
  } catch {
    await tryUnlinkMediaFile(keys.w480);
    await tryUnlinkMediaFile(keys.w960);
    return {
      formError:
        "ذخیره‌سازی فایل انجام نشد. مسیر رسانه را روی سرور بررسی کنید.",
    };
  }

  const metadata = buildAchievementImageMetadata("achievement-cover", {
    w480: {
      storageKey: keys.w480,
      width: processed.variants.w480.width,
      height: processed.variants.w480.height,
      byteSize: processed.variants.w480.buffer.byteLength,
    },
    w960: {
      storageKey: keys.w960,
      width: processed.variants.w960.width,
      height: processed.variants.w960.height,
      byteSize: processed.variants.w960.buffer.byteLength,
    },
  });

  const media = await prisma.mediaAsset.create({
    data: {
      organizationId: session.organization.id,
      storageKey: keys.w960,
      originalName: processed.originalName,
      mimeType: processed.mimeType,
      byteSize: written960.byteSize,
      checksum: written960.checksum,
      width: processed.variants.w960.width,
      height: processed.variants.w960.height,
      altText,
      metadata: achievementImageMetadataToJson(metadata),
      createdByUserId: session.user.id,
    },
    select: { id: true },
  });

  const previous = achievement.coverMediaId;
  await prisma.achievement.update({
    where: { id: achievement.id },
    data: { coverMediaId: media.id },
  });
  await cleanupUnusedMedia(previous);

  revalidateAchievements(achievement.slug);
  return { successMessage: "تصویر کاور ذخیره شد." };
}

export async function uploadCertificate(
  _prev: AchievementActionState,
  formData: FormData,
): Promise<AchievementActionState> {
  const session = await requirePermission("website.manage");
  const achievementId = readString(formData, "achievementId").trim();
  const achievement = await prisma.achievement.findFirst({
    where: {
      id: achievementId,
      organizationId: session.organization.id,
      deletedAt: null,
    },
    select: {
      id: true,
      slug: true,
      title: true,
      certificateMediaId: true,
      student: { select: { slug: true } },
    },
  });
  if (!achievement) return { formError: "افتخار یافت نشد." };

  const processed = await processAchievementCertificateUpload(
    formData.get("certificate") instanceof File
      ? (formData.get("certificate") as File)
      : null,
  );
  if (!processed.ok) return { formError: processed.error };

  const altText =
    readString(formData, "altText").trim().slice(0, 200) || achievement.title;

  let mediaId: string;
  if (processed.kind === "pdf") {
    const storageKey = generateAchievementPdfKey();
    let written;
    try {
      written = await writeMediaFile({
        storageKey,
        data: processed.buffer,
      });
    } catch {
      return {
        formError:
          "ذخیره‌سازی فایل انجام نشد. مسیر رسانه را روی سرور بررسی کنید.",
      };
    }
    const metadata = buildAchievementPdfMetadata(storageKey, written.byteSize);
    const media = await prisma.mediaAsset.create({
      data: {
        organizationId: session.organization.id,
        storageKey,
        originalName: processed.originalName,
        mimeType: processed.mimeType,
        byteSize: written.byteSize,
        checksum: written.checksum,
        altText,
        metadata: achievementPdfMetadataToJson(metadata),
        createdByUserId: session.user.id,
      },
      select: { id: true },
    });
    mediaId = media.id;
  } else {
    const keys = generateAchievementImageKeys("certificate");
    let written960;
    try {
      await writeMediaFile({
        storageKey: keys.w480,
        data: processed.variants.w480.buffer,
      });
      written960 = await writeMediaFile({
        storageKey: keys.w960,
        data: processed.variants.w960.buffer,
      });
    } catch {
      await tryUnlinkMediaFile(keys.w480);
      await tryUnlinkMediaFile(keys.w960);
      return {
        formError:
          "ذخیره‌سازی فایل انجام نشد. مسیر رسانه را روی سرور بررسی کنید.",
      };
    }
    const metadata = buildAchievementImageMetadata(
      "achievement-certificate-image",
      {
        w480: {
          storageKey: keys.w480,
          width: processed.variants.w480.width,
          height: processed.variants.w480.height,
          byteSize: processed.variants.w480.buffer.byteLength,
        },
        w960: {
          storageKey: keys.w960,
          width: processed.variants.w960.width,
          height: processed.variants.w960.height,
          byteSize: processed.variants.w960.buffer.byteLength,
        },
      },
    );
    const media = await prisma.mediaAsset.create({
      data: {
        organizationId: session.organization.id,
        storageKey: keys.w960,
        originalName: processed.originalName,
        mimeType: processed.mimeType,
        byteSize: written960.byteSize,
        checksum: written960.checksum,
        width: processed.variants.w960.width,
        height: processed.variants.w960.height,
        altText,
        metadata: achievementImageMetadataToJson(metadata),
        createdByUserId: session.user.id,
      },
      select: { id: true },
    });
    mediaId = media.id;
  }

  const previous = achievement.certificateMediaId;
  await prisma.achievement.update({
    where: { id: achievement.id },
    data: { certificateMediaId: mediaId },
  });
  await cleanupUnusedMedia(previous);

  revalidateAchievements(achievement.slug);
  return { successMessage: "گواهی ذخیره شد." };
}

export async function createAchievementCategory(formData: FormData) {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;
  await ensureDefaultAchievementCategories(organizationId);

  const name = readString(formData, "name").trim().slice(0, 120);
  if (!name) return;

  let slug = categorySlugFromName(
    readString(formData, "slug").trim() || name,
  );
  const clash = await prisma.achievementCategory.findFirst({
    where: { organizationId, slug, deletedAt: null },
    select: { id: true },
  });
  if (clash) slug = `${slug}-${Date.now().toString(36)}`;

  const maxSort = await prisma.achievementCategory.aggregate({
    where: { organizationId, deletedAt: null },
    _max: { displayOrder: true },
  });

  await prisma.achievementCategory.create({
    data: {
      organizationId,
      name,
      slug,
      icon: readString(formData, "icon").trim().slice(0, 40) || null,
      color: readString(formData, "color").trim().slice(0, 20) || null,
      displayOrder: (maxSort._max.displayOrder ?? -1) + 1,
      isActive: true,
    },
  });
  revalidateAchievements();
}

export async function updateAchievementCategory(formData: FormData) {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;
  const categoryId = readString(formData, "categoryId").trim();
  const category = await prisma.achievementCategory.findFirst({
    where: { id: categoryId, organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!category) return;

  const name = readString(formData, "name").trim().slice(0, 120);
  const displayOrder = Number(readString(formData, "displayOrder") || "0");
  if (!name) return;

  await prisma.achievementCategory.update({
    where: { id: category.id },
    data: {
      name,
      icon: readString(formData, "icon").trim().slice(0, 40) || null,
      color: readString(formData, "color").trim().slice(0, 20) || null,
      displayOrder: Number.isFinite(displayOrder) ? displayOrder : 0,
      isActive: readString(formData, "isActive") === "true",
      archivedAt:
        readString(formData, "archived") === "true" ? new Date() : null,
    },
  });
  revalidateAchievements();
}

export async function deleteAchievementCategory(formData: FormData) {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;
  const categoryId = readString(formData, "categoryId").trim();
  const category = await prisma.achievementCategory.findFirst({
    where: { id: categoryId, organizationId, deletedAt: null },
    select: {
      id: true,
      slug: true,
      _count: { select: { achievements: { where: { deletedAt: null } } } },
    },
  });
  if (!category) return;

  if (category._count.achievements > 0) {
    await prisma.achievementCategory.update({
      where: { id: category.id },
      data: { archivedAt: new Date(), isActive: false },
    });
  } else {
    await prisma.achievementCategory.update({
      where: { id: category.id },
      data: {
        deletedAt: new Date(),
        isActive: false,
        slug: `${category.slug}-deleted-${Date.now().toString(36)}`,
      },
    });
  }
  revalidateAchievements();
}
