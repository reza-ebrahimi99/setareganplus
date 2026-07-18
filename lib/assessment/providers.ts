import { prisma } from "@/lib/prisma";
import { normalizeAssessmentSlug } from "@/lib/assessment/slug";

export const DEFAULT_ASSESSMENT_PROVIDERS = [
  { slug: "qalamchi", name: "قلم‌چی", icon: "book", color: "#7c3aed" },
  { slug: "school", name: "آزمون‌های مدرسه", icon: "school", color: "#0f766e" },
  { slug: "olympiad", name: "المپیاد", icon: "trophy", color: "#b45309" },
  { slug: "entrance", name: "آزمون ورودی", icon: "door", color: "#1d4ed8" },
  { slug: "other", name: "سایر", icon: "spark", color: "#475569" },
] as const;

export async function ensureDefaultAssessmentProviders(
  organizationId: string,
): Promise<void> {
  const existing = await prisma.assessmentProvider.count({
    where: { organizationId, deletedAt: null },
  });
  if (existing > 0) return;

  await prisma.assessmentProvider.createMany({
    data: DEFAULT_ASSESSMENT_PROVIDERS.map((provider, index) => ({
      organizationId,
      slug: provider.slug,
      name: provider.name,
      icon: provider.icon,
      color: provider.color,
      displayOrder: index,
      isActive: true,
    })),
  });
}

export async function listAdminAssessmentProviders(organizationId: string) {
  await ensureDefaultAssessmentProviders(organizationId);
  return prisma.assessmentProvider.findMany({
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
      _count: { select: { assessments: { where: { deletedAt: null } } } },
    },
  });
}

export async function listPublicAssessmentProviders(organizationId: string) {
  return prisma.assessmentProvider.findMany({
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

export function providerSlugFromName(name: string): string {
  return normalizeAssessmentSlug(name);
}
