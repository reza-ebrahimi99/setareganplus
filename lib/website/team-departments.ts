import { prisma } from "@/lib/prisma";
import { normalizeTeamSlug } from "@/lib/website/team-slug";

/** Persian default departments for مؤسسه علمی ستارگان — editable after seed. */
export const DEFAULT_TEAM_DEPARTMENTS = [
  { slug: "management", name: "مدیریت مؤسسه" },
  { slug: "unit-managers", name: "مدیران واحدها" },
  { slug: "deputies", name: "معاونان" },
  { slug: "teachers", name: "آموزگاران و معلمان" },
  { slug: "consultants", name: "مشاوران" },
  { slug: "educators", name: "مدرسان و همکاران آموزشی" },
  { slug: "administration", name: "امور اداری و اجرایی" },
  { slug: "support", name: "پشتیبانی" },
  { slug: "other", name: "سایر همکاران" },
] as const;

export async function ensureDefaultTeamDepartments(
  organizationId: string,
): Promise<void> {
  const existing = await prisma.teamDepartment.count({
    where: { organizationId, deletedAt: null },
  });
  if (existing > 0) return;

  await prisma.teamDepartment.createMany({
    data: DEFAULT_TEAM_DEPARTMENTS.map((department, index) => ({
      organizationId,
      slug: department.slug,
      name: department.name,
      sortOrder: index,
      isActive: true,
    })),
  });
}

export async function listAdminTeamDepartments(organizationId: string) {
  await ensureDefaultTeamDepartments(organizationId);
  return prisma.teamDepartment.findMany({
    where: { organizationId, deletedAt: null },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      sortOrder: true,
      isActive: true,
      archivedAt: true,
      _count: { select: { members: { where: { deletedAt: null } } } },
    },
  });
}

/** Public filter chips — read-only; does not seed/write departments. */
export async function listPublicTeamDepartments(organizationId: string) {
  return prisma.teamDepartment.findMany({
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

export function departmentSlugFromName(name: string): string {
  return normalizeTeamSlug(name);
}
