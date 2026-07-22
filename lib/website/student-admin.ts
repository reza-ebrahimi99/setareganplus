import { prisma } from "@/lib/prisma";
import {
  publicStudentPortraitUrl,
  type StudentPortraitVariantSize,
} from "@/lib/media/student-portrait";
import { ensureDefaultStudentGrades } from "@/lib/website/student-grades";
import { ensureDefaultStudentMajors } from "@/lib/website/student-majors";

export const ADMIN_STUDENT_PAGE_SIZE = 30;

export async function listAdminStudents(
  organizationId: string,
  options?: { page?: number; q?: string },
) {
  await Promise.all([
    ensureDefaultStudentGrades(organizationId),
    ensureDefaultStudentMajors(organizationId),
  ]);

  const q = options?.q?.trim() ?? "";
  const where = {
    organizationId,
    deletedAt: null,
    ...(q
      ? {
          OR: [
            { fullName: { contains: q, mode: "insensitive" as const } },
            { firstName: { contains: q, mode: "insensitive" as const } },
            { lastName: { contains: q, mode: "insensitive" as const } },
            { slug: { contains: q, mode: "insensitive" as const } },
            { kanoonStudentId: { contains: q } },
            { parentName: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const total = await prisma.student.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / ADMIN_STUDENT_PAGE_SIZE));
  const requested = options?.page && options.page > 0 ? options.page : 1;
  const page = Math.min(requested, pageCount);

  const students = await prisma.student.findMany({
    where,
    orderBy: [
      { isFeatured: "desc" },
      { featuredPriority: "asc" },
      { displayOrder: "asc" },
      { fullName: "asc" },
    ],
    skip: (page - 1) * ADMIN_STUDENT_PAGE_SIZE,
    take: ADMIN_STUDENT_PAGE_SIZE,
    select: {
      id: true,
      fullName: true,
      firstName: true,
      lastName: true,
      slug: true,
      kanoonStudentId: true,
      schoolYear: true,
      displayOrder: true,
      featuredPriority: true,
      isActive: true,
      isFeatured: true,
      archivedAt: true,
      grade: { select: { id: true, name: true } },
      major: { select: { id: true, name: true } },
    },
  });

  return { students, total, page, pageCount, pageSize: ADMIN_STUDENT_PAGE_SIZE };
}

export async function loadAdminStudent(
  organizationId: string,
  studentId: string,
) {
  return prisma.student.findFirst({
    where: { id: studentId, organizationId, deletedAt: null },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      fullName: true,
      gradeId: true,
      majorId: true,
      biography: true,
      parentName: true,
      schoolYear: true,
      slug: true,
      kanoonStudentId: true,
      seoTitle: true,
      seoDescription: true,
      displayOrder: true,
      featuredPriority: true,
      isActive: true,
      isFeatured: true,
      archivedAt: true,
      grade: { select: { id: true, name: true, slug: true } },
      major: { select: { id: true, name: true, slug: true } },
      portraitMedia: {
        select: { id: true, storageKey: true, altText: true, metadata: true },
      },
    },
  });
}

export function studentPortraitPublicUrl(
  media: {
    storageKey: string;
    metadata?: unknown;
  } | null
    | undefined,
  size: StudentPortraitVariantSize = "w480",
): string | null {
  if (!media) return null;
  return publicStudentPortraitUrl(media, size);
}
