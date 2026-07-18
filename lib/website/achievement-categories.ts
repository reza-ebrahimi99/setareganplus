import { prisma } from "@/lib/prisma";
import { normalizeAchievementSlug } from "@/lib/website/achievement-slug";

/** Seed defaults for future admissions / olympiads / honors — editable after seed. */
export const DEFAULT_ACHIEVEMENT_CATEGORIES = [
  { slug: "gifted-admissions", name: "پذیرش مدارس استعداد", icon: "star", color: "#0f766e" },
  { slug: "olympiads", name: "المپیادها", icon: "trophy", color: "#b45309" },
  { slug: "competitions", name: "مسابقات", icon: "flag", color: "#1d4ed8" },
  { slug: "qalamchi", name: "افتخارات قلم‌چی", icon: "book", color: "#7c3aed" },
  { slug: "school-awards", name: "جوایز مدرسه", icon: "award", color: "#be123c" },
  { slug: "certificates", name: "گواهی‌نامه‌ها", icon: "certificate", color: "#334155" },
  { slug: "other", name: "سایر", icon: "spark", color: "#475569" },
] as const;

export async function ensureDefaultAchievementCategories(
  organizationId: string,
): Promise<void> {
  const existing = await prisma.achievementCategory.count({
    where: { organizationId, deletedAt: null },
  });
  if (existing > 0) return;

  await prisma.achievementCategory.createMany({
    data: DEFAULT_ACHIEVEMENT_CATEGORIES.map((category, index) => ({
      organizationId,
      slug: category.slug,
      name: category.name,
      icon: category.icon,
      color: category.color,
      displayOrder: index,
      isActive: true,
    })),
  });
}

export async function listAdminAchievementCategories(organizationId: string) {
  await ensureDefaultAchievementCategories(organizationId);
  return prisma.achievementCategory.findMany({
    where: { organizationId, deletedAt: null },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      icon: true,
      color: true,
      displayOrder: true,
      isActive: true,
      archivedAt: true,
      _count: { select: { achievements: { where: { deletedAt: null } } } },
    },
  });
}

export async function listPublicAchievementCategories(organizationId: string) {
  return prisma.achievementCategory.findMany({
    where: {
      organizationId,
      deletedAt: null,
      archivedAt: null,
      isActive: true,
    },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      icon: true,
      color: true,
    },
  });
}

export function categorySlugFromName(name: string): string {
  return normalizeAchievementSlug(name);
}
