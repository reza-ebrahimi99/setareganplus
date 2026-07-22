"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/require-admin";
import { tryUnlinkMediaFile, writeMediaFile } from "@/lib/media/storage";
import {
  buildStudentPortraitMetadata,
  generateStudentPortraitVariantKeys,
  processStudentPortraitUpload,
  studentPortraitMetadataToJson,
  studentPortraitStorageKeysToUnlink,
} from "@/lib/media/student-portrait";
import { prisma } from "@/lib/prisma";
import { normalizeKanoonStudentId } from "@/lib/website/kanoon-student-id";
import {
  ensureDefaultStudentGrades,
  gradeRequiresMajor,
  gradeSlugFromName,
} from "@/lib/website/student-grades";
import { ensureDefaultStudentMajors } from "@/lib/website/student-majors";
import {
  composeStudentFullName,
  normalizeStudentSlug,
  slugFromStudentName,
} from "@/lib/website/student-slug";

export type StudentActionState = {
  formError?: string;
  successMessage?: string;
  fieldErrors?: Record<string, string>;
};

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function revalidateStudents() {
  revalidatePath("/admin/website/students");
  revalidatePath("/admin/website/students/grades");
}

async function uniqueStudentSlug(
  organizationId: string,
  desired: string,
  excludeId?: string,
): Promise<string> {
  let base = normalizeStudentSlug(desired);
  if (base.length < 2) base = `student-${Date.now().toString(36)}`;
  let candidate = base;
  for (let i = 0; i < 20; i += 1) {
    const hit = await prisma.student.findFirst({
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

async function resolveKanoonStudentId(options: {
  organizationId: string;
  raw: string;
  excludeId?: string;
  fieldErrors: Record<string, string>;
}): Promise<string | null> {
  const parsed = normalizeKanoonStudentId(options.raw);
  if (!parsed.ok) {
    options.fieldErrors.kanoonStudentId = parsed.error;
    return null;
  }
  if (!parsed.value) return null;

  const duplicate = await prisma.student.findFirst({
    where: {
      organizationId: options.organizationId,
      kanoonStudentId: parsed.value,
      ...(options.excludeId ? { id: { not: options.excludeId } } : {}),
    },
    select: { id: true },
  });
  if (duplicate) {
    options.fieldErrors.kanoonStudentId =
      "شناسه قلم‌چی در این سازمان قبلاً ثبت شده است.";
    return null;
  }
  return parsed.value;
}

/** Resolve majorId from form: required for grades 10–12; cleared otherwise. */
async function resolveStudentMajorId(options: {
  organizationId: string;
  gradeSlug: string | undefined;
  majorIdInput: string;
  fieldErrors: Record<string, string>;
}): Promise<string | null> {
  const { organizationId, gradeSlug, majorIdInput, fieldErrors } = options;
  const requiresMajor = gradeSlug ? gradeRequiresMajor(gradeSlug) : false;

  if (!requiresMajor) return null;

  if (!majorIdInput) {
    fieldErrors.majorId = "رشته تحصیلی برای پایه‌های دهم تا دوازدهم الزامی است.";
    return null;
  }

  const major = await prisma.studentMajor.findFirst({
    where: {
      id: majorIdInput,
      organizationId,
      deletedAt: null,
    },
    select: { id: true },
  });
  if (!major) {
    fieldErrors.majorId = "رشته تحصیلی معتبر نیست.";
    return null;
  }
  return major.id;
}

export async function createStudent(
  _prev: StudentActionState,
  formData: FormData,
): Promise<StudentActionState> {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;
  await Promise.all([
    ensureDefaultStudentGrades(organizationId),
    ensureDefaultStudentMajors(organizationId),
  ]);

  const firstName = readString(formData, "firstName").trim().slice(0, 80);
  const lastName = readString(formData, "lastName").trim().slice(0, 80);
  const gradeId = readString(formData, "gradeId").trim();
  const majorIdInput = readString(formData, "majorId").trim();
  const biography = readString(formData, "biography").trim().slice(0, 5000);
  const parentName =
    readString(formData, "parentName").trim().slice(0, 120) || null;
  const schoolYear =
    readString(formData, "schoolYear").trim().slice(0, 40) || null;
  const slugInput = readString(formData, "slug").trim();
  const fieldErrors: Record<string, string> = {};

  if (!firstName) fieldErrors.firstName = "نام الزامی است.";
  if (!lastName) fieldErrors.lastName = "نام خانوادگی الزامی است.";
  if (!gradeId) fieldErrors.gradeId = "پایه تحصیلی الزامی است.";

  const grade = gradeId
    ? await prisma.studentGrade.findFirst({
        where: { id: gradeId, organizationId, deletedAt: null },
        select: { id: true, slug: true },
      })
    : null;
  if (gradeId && !grade) fieldErrors.gradeId = "پایه تحصیلی معتبر نیست.";

  const majorId = await resolveStudentMajorId({
    organizationId,
    gradeSlug: grade?.slug,
    majorIdInput,
    fieldErrors,
  });

  const kanoonStudentId = await resolveKanoonStudentId({
    organizationId,
    raw: readString(formData, "kanoonStudentId"),
    fieldErrors,
  });

  if (Object.keys(fieldErrors).length > 0) {
    return { formError: "لطفاً خطاهای فرم را برطرف کنید.", fieldErrors };
  }

  const fullName = composeStudentFullName(firstName, lastName);
  const slug = await uniqueStudentSlug(
    organizationId,
    slugInput || slugFromStudentName(fullName),
  );
  const displayOrder = Number(readString(formData, "displayOrder") || "0");
  const featuredPriority = Number(
    readString(formData, "featuredPriority") || "0",
  );

  await prisma.student.create({
    data: {
      organizationId,
      gradeId: grade!.id,
      majorId,
      firstName,
      lastName,
      fullName,
      kanoonStudentId,
      biography,
      parentName,
      schoolYear,
      slug,
      seoTitle: readString(formData, "seoTitle").trim().slice(0, 160) || null,
      seoDescription:
        readString(formData, "seoDescription").trim().slice(0, 320) || null,
      displayOrder: Number.isFinite(displayOrder) ? displayOrder : 0,
      featuredPriority: Number.isFinite(featuredPriority)
        ? featuredPriority
        : 0,
      isActive: readString(formData, "isActive") === "true",
      isFeatured: readString(formData, "isFeatured") === "true",
    },
  });

  revalidateStudents();
  return { successMessage: "دانش‌آموز با موفقیت ثبت شد." };
}

export async function updateStudent(
  _prev: StudentActionState,
  formData: FormData,
): Promise<StudentActionState> {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;
  const studentId = readString(formData, "studentId").trim();

  const existing = await prisma.student.findFirst({
    where: { id: studentId, organizationId, deletedAt: null },
    select: { id: true, slug: true },
  });
  if (!existing) return { formError: "دانش‌آموز یافت نشد." };

  await ensureDefaultStudentMajors(organizationId);

  const firstName = readString(formData, "firstName").trim().slice(0, 80);
  const lastName = readString(formData, "lastName").trim().slice(0, 80);
  const gradeId = readString(formData, "gradeId").trim();
  const majorIdInput = readString(formData, "majorId").trim();
  const fieldErrors: Record<string, string> = {};
  if (!firstName) fieldErrors.firstName = "نام الزامی است.";
  if (!lastName) fieldErrors.lastName = "نام خانوادگی الزامی است.";
  if (!gradeId) fieldErrors.gradeId = "پایه تحصیلی الزامی است.";

  const grade = await prisma.studentGrade.findFirst({
    where: { id: gradeId, organizationId, deletedAt: null },
    select: { id: true, slug: true },
  });
  if (!grade) fieldErrors.gradeId = "پایه تحصیلی معتبر نیست.";

  const majorId = await resolveStudentMajorId({
    organizationId,
    gradeSlug: grade?.slug,
    majorIdInput,
    fieldErrors,
  });

  const kanoonStudentId = await resolveKanoonStudentId({
    organizationId,
    raw: readString(formData, "kanoonStudentId"),
    excludeId: existing.id,
    fieldErrors,
  });

  if (Object.keys(fieldErrors).length > 0) {
    return { formError: "لطفاً خطاهای فرم را برطرف کنید.", fieldErrors };
  }

  const fullName = composeStudentFullName(firstName, lastName);
  const slug = await uniqueStudentSlug(
    organizationId,
    readString(formData, "slug").trim() || slugFromStudentName(fullName),
    existing.id,
  );
  const displayOrder = Number(readString(formData, "displayOrder") || "0");
  const featuredPriority = Number(
    readString(formData, "featuredPriority") || "0",
  );

  await prisma.student.update({
    where: { id: existing.id },
    data: {
      gradeId: grade!.id,
      majorId,
      firstName,
      lastName,
      fullName,
      kanoonStudentId,
      biography: readString(formData, "biography").trim().slice(0, 5000),
      parentName:
        readString(formData, "parentName").trim().slice(0, 120) || null,
      schoolYear:
        readString(formData, "schoolYear").trim().slice(0, 40) || null,
      slug,
      seoTitle: readString(formData, "seoTitle").trim().slice(0, 160) || null,
      seoDescription:
        readString(formData, "seoDescription").trim().slice(0, 320) || null,
      displayOrder: Number.isFinite(displayOrder) ? displayOrder : 0,
      featuredPriority: Number.isFinite(featuredPriority)
        ? featuredPriority
        : 0,
      isActive: readString(formData, "isActive") === "true",
      isFeatured: readString(formData, "isFeatured") === "true",
      archivedAt:
        readString(formData, "archived") === "true" ? new Date() : null,
    },
  });

  revalidateStudents();
  revalidateStudents();
  return { successMessage: "تغییرات ذخیره شد." };
}

export async function archiveStudent(formData: FormData) {
  const session = await requirePermission("website.manage");
  const studentId = readString(formData, "studentId").trim();
  const student = await prisma.student.findFirst({
    where: {
      id: studentId,
      organizationId: session.organization.id,
      deletedAt: null,
    },
    select: { id: true, slug: true, archivedAt: true },
  });
  if (!student || student.archivedAt) return;
  await prisma.student.update({
    where: { id: student.id },
    data: { archivedAt: new Date(), isFeatured: false },
  });
  revalidateStudents();
}

export async function restoreStudent(formData: FormData) {
  const session = await requirePermission("website.manage");
  const studentId = readString(formData, "studentId").trim();
  const student = await prisma.student.findFirst({
    where: {
      id: studentId,
      organizationId: session.organization.id,
      deletedAt: null,
    },
    select: { id: true, slug: true, archivedAt: true },
  });
  if (!student || !student.archivedAt) return;
  await prisma.student.update({
    where: { id: student.id },
    data: { archivedAt: null },
  });
  revalidateStudents();
}

export async function deleteStudent(formData: FormData) {
  const session = await requirePermission("website.manage");
  const studentId = readString(formData, "studentId").trim();
  const student = await prisma.student.findFirst({
    where: {
      id: studentId,
      organizationId: session.organization.id,
      deletedAt: null,
    },
    select: { id: true, slug: true },
  });
  if (!student) return;
  await prisma.student.update({
    where: { id: student.id },
    data: {
      deletedAt: new Date(),
      isActive: false,
      isFeatured: false,
      slug: `${student.slug}-deleted-${Date.now().toString(36)}`,
    },
  });
  revalidateStudents();
}

export async function uploadPortrait(
  _prev: StudentActionState,
  formData: FormData,
): Promise<StudentActionState> {
  const session = await requirePermission("website.manage");
  const studentId = readString(formData, "studentId").trim();
  const student = await prisma.student.findFirst({
    where: {
      id: studentId,
      organizationId: session.organization.id,
      deletedAt: null,
    },
    select: { id: true, slug: true, portraitMediaId: true, fullName: true },
  });
  if (!student) return { formError: "دانش‌آموز یافت نشد." };

  const file = formData.get("portrait");
  const processed = await processStudentPortraitUpload(
    file instanceof File ? file : null,
  );
  if (!processed.ok) return { formError: processed.error };

  const altText =
    readString(formData, "altText").trim().slice(0, 200) || student.fullName;
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
      formError:
        "ذخیره‌سازی فایل انجام نشد. مسیر رسانه را روی سرور بررسی کنید.",
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
      organizationId: session.organization.id,
      storageKey: keys.w960,
      originalName: processed.originalName,
      mimeType: processed.mimeType,
      byteSize: written960.byteSize,
      checksum: written960.checksum,
      width: processed.variants.w960.width,
      height: processed.variants.w960.height,
      altText,
      metadata: studentPortraitMetadataToJson(metadata),
      createdByUserId: session.user.id,
    },
    select: { id: true },
  });

  const previousMediaId = student.portraitMediaId;
  await prisma.student.update({
    where: { id: student.id },
    data: { portraitMediaId: media.id },
  });

  if (previousMediaId) {
    const [stillUsedTeam, stillUsedStudent, formUse, achievementCover, achievementCert] =
      await Promise.all([
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

  revalidateStudents();
  return {
    successMessage: "تصویر پروفایل ذخیره شد.",
    formError: undefined,
  };
}

export async function createStudentGrade(formData: FormData) {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;
  await ensureDefaultStudentGrades(organizationId);

  const name = readString(formData, "name").trim().slice(0, 120);
  if (!name) return;

  let slug = gradeSlugFromName(
    readString(formData, "slug").trim() || name,
  );
  const clash = await prisma.studentGrade.findFirst({
    where: { organizationId, slug, deletedAt: null },
    select: { id: true },
  });
  if (clash) slug = `${slug}-${Date.now().toString(36)}`;

  const maxSort = await prisma.studentGrade.aggregate({
    where: { organizationId, deletedAt: null },
    _max: { sortOrder: true },
  });

  await prisma.studentGrade.create({
    data: {
      organizationId,
      name,
      slug,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      isActive: true,
    },
  });
  revalidateStudents();
}

export async function updateStudentGrade(formData: FormData) {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;
  const gradeId = readString(formData, "gradeId").trim();
  const grade = await prisma.studentGrade.findFirst({
    where: { id: gradeId, organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!grade) return;

  const name = readString(formData, "name").trim().slice(0, 120);
  const sortOrder = Number(readString(formData, "sortOrder") || "0");
  if (!name) return;

  await prisma.studentGrade.update({
    where: { id: grade.id },
    data: {
      name,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
      isActive: readString(formData, "isActive") === "true",
      archivedAt:
        readString(formData, "archived") === "true" ? new Date() : null,
    },
  });
  revalidateStudents();
}

export async function deleteStudentGrade(formData: FormData) {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;
  const gradeId = readString(formData, "gradeId").trim();
  const grade = await prisma.studentGrade.findFirst({
    where: { id: gradeId, organizationId, deletedAt: null },
    select: {
      id: true,
      slug: true,
      _count: { select: { students: { where: { deletedAt: null } } } },
    },
  });
  if (!grade) return;

  if (grade._count.students > 0) {
    await prisma.studentGrade.update({
      where: { id: grade.id },
      data: { archivedAt: new Date(), isActive: false },
    });
  } else {
    await prisma.studentGrade.update({
      where: { id: grade.id },
      data: {
        deletedAt: new Date(),
        isActive: false,
        slug: `${grade.slug}-deleted-${Date.now().toString(36)}`,
      },
    });
  }
  revalidateStudents();
}
