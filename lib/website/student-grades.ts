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
  { slug: "grade-7", name: "پایه هفتم" },
  { slug: "grade-8", name: "پایه هشتم" },
  { slug: "grade-9", name: "پایه نهم" },
  { slug: "grade-10", name: "پایه دهم" },
  { slug: "grade-11", name: "پایه یازدهم" },
  { slug: "grade-12", name: "پایه دوازدهم" },
  { slug: "other", name: "سایر" },
] as const;

/** High-school grades that require a major (رشته). Driven by slug, not display name. */
export const MAJOR_REQUIRED_GRADE_SLUGS = [
  "grade-10",
  "grade-11",
  "grade-12",
] as const;

export type MajorRequiredGradeSlug =
  (typeof MAJOR_REQUIRED_GRADE_SLUGS)[number];

export function gradeRequiresMajor(slug: string): boolean {
  return (MAJOR_REQUIRED_GRADE_SLUGS as readonly string[]).includes(slug);
}

/**
 * Ensures default grades exist for an org.
 * Inserts any missing default slugs so existing orgs pick up new grades (7–12)
 * without wiping or renaming admin-customized rows.
 */
export async function ensureDefaultStudentGrades(
  organizationId: string,
): Promise<void> {
  const existing = await prisma.studentGrade.findMany({
    where: { organizationId, deletedAt: null },
    select: { slug: true },
  });
  const existingSlugs = new Set(existing.map((row) => row.slug));
  const missing = DEFAULT_STUDENT_GRADES.filter(
    (grade) => !existingSlugs.has(grade.slug),
  );
  if (missing.length === 0) return;

  const maxSort = await prisma.studentGrade.aggregate({
    where: { organizationId, deletedAt: null },
    _max: { sortOrder: true },
  });
  let nextSort = (maxSort._max.sortOrder ?? -1) + 1;

  await prisma.studentGrade.createMany({
    data: missing.map((grade) => {
      const defaultIndex = DEFAULT_STUDENT_GRADES.findIndex(
        (item) => item.slug === grade.slug,
      );
      return {
        organizationId,
        slug: grade.slug,
        name: grade.name,
        sortOrder: defaultIndex >= 0 ? defaultIndex : nextSort++,
        isActive: true,
      };
    }),
  });

  // Keep the default "other" grade after 1–12 when backfilling high-school grades.
  const otherIndex = DEFAULT_STUDENT_GRADES.findIndex(
    (grade) => grade.slug === "other",
  );
  if (
    otherIndex >= 0 &&
    missing.some((grade) => grade.slug.startsWith("grade-"))
  ) {
    await prisma.studentGrade.updateMany({
      where: { organizationId, slug: "other", deletedAt: null },
      data: { sortOrder: otherIndex },
    });
  }
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
