import { prisma } from "@/lib/prisma";
import { normalizeAssessmentSlug } from "@/lib/assessment/slug";

export const DEFAULT_SUBJECTS = [
  { slug: "math", name: "ریاضی", shortName: "ریاضی" },
  { slug: "science", name: "علوم", shortName: "علوم" },
  { slug: "persian", name: "فارسی", shortName: "فارسی" },
  { slug: "quran", name: "قرآن", shortName: "قرآن" },
  { slug: "social", name: "مطالعات اجتماعی", shortName: "اجتماعی" },
  { slug: "english", name: "انگلیسی", shortName: "انگلیسی" },
] as const;

export async function ensureDefaultSubjects(
  organizationId: string,
): Promise<void> {
  const existing = await prisma.subject.count({
    where: { organizationId, deletedAt: null },
  });
  if (existing > 0) return;

  await prisma.subject.createMany({
    data: DEFAULT_SUBJECTS.map((subject, index) => ({
      organizationId,
      slug: subject.slug,
      name: subject.name,
      shortName: subject.shortName,
      displayOrder: index,
      isActive: true,
    })),
  });
}

export async function listAdminSubjects(organizationId: string) {
  await ensureDefaultSubjects(organizationId);
  return prisma.subject.findMany({
    where: { organizationId, deletedAt: null },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      shortName: true,
      displayOrder: true,
      isActive: true,
      _count: {
        select: { subjectResults: true },
      },
    },
  });
}

export async function listActiveSubjects(organizationId: string) {
  await ensureDefaultSubjects(organizationId);
  return prisma.subject.findMany({
    where: { organizationId, deletedAt: null, isActive: true },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      shortName: true,
    },
  });
}

export function subjectSlugFromName(name: string): string {
  return normalizeAssessmentSlug(name);
}
