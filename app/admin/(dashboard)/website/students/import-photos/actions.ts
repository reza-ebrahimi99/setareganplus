"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/require-admin";
import {
  buildStudentPortraitMetadata,
  generateStudentPortraitVariantKeys,
  processStudentPortraitUpload,
  studentPortraitMetadataToJson,
  studentPortraitStorageKeysToUnlink,
} from "@/lib/media/student-portrait";
import { tryUnlinkMediaFile, writeMediaFile } from "@/lib/media/storage";
import { prisma } from "@/lib/prisma";
import {
  STUDENT_PHOTO_IMPORT_BATCH_SIZE,
  extractKanoonIdFromFilename,
  type StudentPhotoImportBatchItemResult,
  type StudentPhotoImportMatchedStudent,
} from "@/lib/website/student-photo-import";

export type PreviewStudentPhotosResult =
  | {
      ok: true;
      students: StudentPhotoImportMatchedStudent[];
    }
  | { ok: false; error: string };

export type ImportStudentPhotoBatchResult =
  | {
      ok: true;
      results: StudentPhotoImportBatchItemResult[];
    }
  | { ok: false; error: string };

function revalidateStudentPhotoImport() {
  revalidatePath("/admin/website/students");
  revalidatePath("/admin/website/students/import-photos");
}

function readReplaceExisting(formData: FormData): boolean {
  const raw = formData.get("replaceExisting");
  return raw === "1" || raw === "true" || raw === "on";
}

/**
 * Lookup students by extracted Kanoon IDs for the preview table.
 * Never matches on Student.id.
 */
export async function previewStudentPhotoImportAction(
  extractedIds: string[],
): Promise<PreviewStudentPhotosResult> {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;

  const uniqueIds = Array.from(
    new Set(
      extractedIds
        .map((id) => id.trim())
        .filter((id) => id.length > 0 && /^\d{1,32}$/.test(id)),
    ),
  ).slice(0, 500);

  if (uniqueIds.length === 0) {
    return { ok: true, students: [] };
  }

  try {
    const students = await prisma.student.findMany({
      where: {
        organizationId,
        deletedAt: null,
        kanoonStudentId: { in: uniqueIds },
      },
      select: {
        id: true,
        fullName: true,
        kanoonStudentId: true,
        portraitMediaId: true,
        grade: { select: { name: true } },
      },
    });

    const mapped: StudentPhotoImportMatchedStudent[] = students
      .filter(
        (student): student is typeof student & { kanoonStudentId: string } =>
          typeof student.kanoonStudentId === "string" &&
          student.kanoonStudentId.length > 0,
      )
      .map((student) => ({
        id: student.id,
        fullName: student.fullName,
        gradeName: student.grade.name,
        kanoonStudentId: student.kanoonStudentId,
        hasPortrait: Boolean(student.portraitMediaId),
      }));

    return { ok: true, students: mapped };
  } catch {
    return {
      ok: false,
      error: "بارگذاری اطلاعات دانش‌آموزان برای پیش‌نمایش ممکن نشد.",
    };
  }
}

/**
 * Persist one portrait using the same pipeline as uploadPortrait
 * (processStudentPortraitUpload → writeMediaFile → MediaAsset → portraitMediaId).
 */
async function persistStudentPortrait(params: {
  organizationId: string;
  actorUserId: string;
  student: {
    id: string;
    fullName: string;
    portraitMediaId: string | null;
  };
  file: File;
}): Promise<{ ok: true; replaced: boolean } | { ok: false; error: string }> {
  const processed = await processStudentPortraitUpload(params.file);
  if (!processed.ok) return { ok: false, error: processed.error };

  const keys = generateStudentPortraitVariantKeys();
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
      ok: false,
      error: "ذخیره‌سازی فایل انجام نشد. مسیر رسانه را روی سرور بررسی کنید.",
    };
  }

  const metadata = buildStudentPortraitMetadata({
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
      organizationId: params.organizationId,
      storageKey: keys.w960,
      originalName: processed.originalName,
      mimeType: processed.mimeType,
      byteSize: written960.byteSize,
      checksum: written960.checksum,
      width: processed.variants.w960.width,
      height: processed.variants.w960.height,
      altText: params.student.fullName.slice(0, 200),
      metadata: studentPortraitMetadataToJson(metadata),
      createdByUserId: params.actorUserId,
    },
    select: { id: true },
  });

  const previousMediaId = params.student.portraitMediaId;
  const replaced = Boolean(previousMediaId);

  await prisma.student.update({
    where: { id: params.student.id },
    data: { portraitMediaId: media.id },
  });

  if (previousMediaId) {
    const [
      stillUsedTeam,
      stillUsedStudent,
      formUse,
      achievementCover,
      achievementCert,
    ] = await Promise.all([
      prisma.teamMember.count({
        where: { portraitMediaId: previousMediaId, deletedAt: null },
      }),
      prisma.student.count({
        where: { portraitMediaId: previousMediaId, deletedAt: null },
      }),
      prisma.formVersion.count({
        where: { posterMediaId: previousMediaId },
      }),
      prisma.achievement.count({
        where: { coverMediaId: previousMediaId, deletedAt: null },
      }),
      prisma.achievement.count({
        where: { certificateMediaId: previousMediaId, deletedAt: null },
      }),
    ]);

    if (
      stillUsedTeam === 0 &&
      stillUsedStudent === 0 &&
      formUse === 0 &&
      achievementCover === 0 &&
      achievementCert === 0
    ) {
      const old = await prisma.mediaAsset.findFirst({
        where: { id: previousMediaId },
        select: { storageKey: true, metadata: true },
      });
      await prisma.mediaAsset.update({
        where: { id: previousMediaId },
        data: { deletedAt: new Date() },
      });
      if (old) {
        for (const key of studentPortraitStorageKeysToUnlink(old)) {
          await tryUnlinkMediaFile(key);
        }
      }
    }
  }

  return { ok: true, replaced };
}

/**
 * Process a small batch of portrait files (one Server Action call).
 * Continues on per-file failures.
 */
export async function importStudentPhotoBatchAction(
  formData: FormData,
): Promise<ImportStudentPhotoBatchResult> {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;
  const actorUserId = session.user.id;
  const replaceExisting = readReplaceExisting(formData);

  const entries: Array<{
    clientKey: string;
    kanoonStudentId: string;
    file: File;
  }> = [];

  for (let index = 0; index < STUDENT_PHOTO_IMPORT_BATCH_SIZE; index += 1) {
    const file = formData.get(`file_${index}`);
    const clientKeyRaw = formData.get(`clientKey_${index}`);
    const kanoonRaw = formData.get(`kanoonStudentId_${index}`);
    if (!(file instanceof File) || file.size === 0) continue;
    if (typeof clientKeyRaw !== "string" || !clientKeyRaw.trim()) continue;
    if (typeof kanoonRaw !== "string" || !kanoonRaw.trim()) continue;

    entries.push({
      clientKey: clientKeyRaw.trim(),
      kanoonStudentId: kanoonRaw.trim(),
      file,
    });
  }

  if (entries.length === 0) {
    return { ok: false, error: "هیچ فایلی برای این دسته ارسال نشده است." };
  }

  const results: StudentPhotoImportBatchItemResult[] = [];

  for (const entry of entries) {
    const filename = entry.file.name || "unknown";
    const extracted = extractKanoonIdFromFilename(filename);

    if (!extracted || extracted !== entry.kanoonStudentId) {
      results.push({
        clientKey: entry.clientKey,
        filename,
        outcome: "invalid",
        error: "شناسه استخراج‌شده از نام فایل با مقدار ارسالی هم‌خوانی ندارد.",
      });
      continue;
    }

    try {
      const student = await prisma.student.findFirst({
        where: {
          organizationId,
          deletedAt: null,
          kanoonStudentId: entry.kanoonStudentId,
        },
        select: {
          id: true,
          fullName: true,
          portraitMediaId: true,
        },
      });

      if (!student) {
        results.push({
          clientKey: entry.clientKey,
          filename,
          outcome: "not_found",
        });
        continue;
      }

      if (student.portraitMediaId && !replaceExisting) {
        results.push({
          clientKey: entry.clientKey,
          filename,
          outcome: "skipped",
        });
        continue;
      }

      const persisted = await persistStudentPortrait({
        organizationId,
        actorUserId,
        student,
        file: entry.file,
      });

      if (!persisted.ok) {
        results.push({
          clientKey: entry.clientKey,
          filename,
          outcome: "failed",
          error: persisted.error,
        });
        continue;
      }

      results.push({
        clientKey: entry.clientKey,
        filename,
        outcome: persisted.replaced ? "replaced" : "imported",
      });
    } catch {
      results.push({
        clientKey: entry.clientKey,
        filename,
        outcome: "failed",
        error: "خطای غیرمنتظره هنگام ذخیره تصویر.",
      });
    }
  }

  revalidateStudentPhotoImport();
  return { ok: true, results };
}
