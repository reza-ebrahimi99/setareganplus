import { prisma } from "@/lib/prisma";
import { normalizeStudentSlug } from "@/lib/website/student-slug";

/** Persian default majors — editable seed defaults, not hardcoded forever. */
export const DEFAULT_STUDENT_MAJORS = [
  { slug: "math", name: "ریاضی" },
  { slug: "experimental", name: "تجربی" },
  { slug: "humanities", name: "انسانی" },
  { slug: "technical", name: "فنی" },
  { slug: "other", name: "سایر" },
] as const;

/**
 * Ensures default majors exist for an org.
 * Inserts any missing default slugs without wiping admin-customized rows.
 */
export async function ensureDefaultStudentMajors(
  organizationId: string,
): Promise<void> {
  const existing = await prisma.studentMajor.findMany({
    where: { organizationId, deletedAt: null },
    select: { slug: true },
  });
  const existingSlugs = new Set(existing.map((row) => row.slug));
  const missing = DEFAULT_STUDENT_MAJORS.filter(
    (major) => !existingSlugs.has(major.slug),
  );
  if (missing.length === 0) return;

  const maxSort = await prisma.studentMajor.aggregate({
    where: { organizationId, deletedAt: null },
    _max: { sortOrder: true },
  });
  let nextSort = (maxSort._max.sortOrder ?? -1) + 1;

  await prisma.studentMajor.createMany({
    data: missing.map((major) => {
      const defaultIndex = DEFAULT_STUDENT_MAJORS.findIndex(
        (item) => item.slug === major.slug,
      );
      return {
        organizationId,
        slug: major.slug,
        name: major.name,
        sortOrder: defaultIndex >= 0 ? defaultIndex : nextSort++,
        isActive: true,
      };
    }),
  });
}

export async function listAdminStudentMajors(organizationId: string) {
  await ensureDefaultStudentMajors(organizationId);
  return prisma.studentMajor.findMany({
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

export function majorSlugFromName(name: string): string {
  return normalizeStudentSlug(name);
}
