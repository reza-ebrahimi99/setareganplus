import { prisma } from "@/lib/prisma";
import { normalizeStudentSlug } from "@/lib/website/student-slug";

/** Persian default grades — editable seed defaults, not hardcoded forever. */
export const DEFAULT_STUDENT_GRADES = [
  { slug: "pre-school", name: "پیش‌دبستانی" },
  { slug: "grade-1", name: "پایه اول" },
  { slug: "grade-2", name: "پایه دوم" },
  { slug: "grade-3", name: "پایه سوم" },
  { slug: "grade-4", name: "پایه چهارم" },
  { slug: "grade-5", name: "پایه پنجم" },
  { slug: "grade-6", name: "پایه ششم" },
  { slug: "other", name: "سایر" },
] as const;

export async function ensureDefaultStudentGrades(
  organizationId: string,
): Promise<void> {
  const existing = await prisma.studentGrade.count({
    where: { organizationId, deletedAt: null },
  });
  if (existing > 0) return;

  await prisma.studentGrade.createMany({
    data: DEFAULT_STUDENT_GRADES.map((grade, index) => ({
      organizationId,
      slug: grade.slug,
      name: grade.name,
      sortOrder: index,
      isActive: true,
    })),
  });
}

export async function listAdminStudentGrades(organizationId: string) {
  await ensureDefaultStudentGrades(organizationId);
  return prisma.studentGrade.findMany({
    where: { organizationId, deletedAt: null },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      sortOrder: true,
      isActive: true,
      archivedAt: true,
      _count: { select: { students: { where: { deletedAt: null } } } },
    },
  });
}

/** Public filter chips — read-only; does not seed/write grades. */
export async function listPublicStudentGrades(organizationId: string) {
  return prisma.studentGrade.findMany({
    where: {
      organizationId,
      deletedAt: null,
      archivedAt: null,
      isActive: true,
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, slug: true, name: true },
  });
}

export function gradeSlugFromName(name: string): string {
  return normalizeStudentSlug(name);
}
