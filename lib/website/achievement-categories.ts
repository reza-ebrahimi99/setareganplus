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

/**
 * Ensures default categories exist for an org.
 * Inserts any missing default slugs so existing orgs pick up new defaults
 * without wiping or renaming admin-customized rows.
 */
export async function ensureDefaultAchievementCategories(
  organizationId: string,
): Promise<void> {
  const existing = await prisma.achievementCategory.findMany({
    where: { organizationId, deletedAt: null },
    select: { slug: true },
  });
  const existingSlugs = new Set(existing.map((row) => row.slug));
  const missing = DEFAULT_ACHIEVEMENT_CATEGORIES.filter(
    (category) => !existingSlugs.has(category.slug),
  );
  if (missing.length === 0) return;

  const maxSort = await prisma.achievementCategory.aggregate({
    where: { organizationId, deletedAt: null },
    _max: { displayOrder: true },
  });
  let nextSort = (maxSort._max.displayOrder ?? -1) + 1;

  await prisma.achievementCategory.createMany({
    data: missing.map((category) => {
      const defaultIndex = DEFAULT_ACHIEVEMENT_CATEGORIES.findIndex(
        (item) => item.slug === category.slug,
      );
      return {
        organizationId,
        slug: category.slug,
        name: category.name,
        icon: category.icon,
        color: category.color,
        displayOrder: defaultIndex >= 0 ? defaultIndex : nextSort++,
        isActive: true,
      };
    }),
  });
}

export type AdminAchievementCategoryOption = {
  id: string;
  name: string;
  isActive: boolean;
  archivedAt: Date | null;
};

/** Active categories plus the currently assigned one when editing. */
export function categoriesForAchievementForm(
  categories: AdminAchievementCategoryOption[],
  selectedCategoryId?: string,
): Array<{ id: string; name: string }> {
  const active = categories.filter(
    (category) => category.isActive && !category.archivedAt,
  );
  const selected = categories.find(
    (category) => category.id === selectedCategoryId,
  );
  if (
    selected &&
    !active.some((category) => category.id === selected.id)
  ) {
    return [
      ...active,
      { id: selected.id, name: `${selected.name} (غیرفعال)` },
    ];
  }
  return active.map((category) => ({
    id: category.id,
    name: category.name,
  }));
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
