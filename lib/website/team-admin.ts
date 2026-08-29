import { prisma } from "@/lib/prisma";
import {
  publicPortraitUrl,
  type TeamPortraitVariantSize,
} from "@/lib/media/team-portrait";
import { ensureDefaultTeamDepartments } from "@/lib/website/team-departments";

export const ADMIN_TEAM_PAGE_SIZE = 30;

export async function listAdminTeamMembers(
  organizationId: string,
  options?: { page?: number; q?: string },
) {
  await ensureDefaultTeamDepartments(organizationId);

  const q = options?.q?.trim() ?? "";
  const where = {
    organizationId,
    deletedAt: null,
    ...(q
      ? {
          OR: [
            { fullName: { contains: q, mode: "insensitive" as const } },
            { roleTitle: { contains: q, mode: "insensitive" as const } },
            { slug: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const total = await prisma.teamMember.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / ADMIN_TEAM_PAGE_SIZE));
  const requested = options?.page && options.page > 0 ? options.page : 1;
  const page = Math.min(requested, pageCount);

  const members = await prisma.teamMember.findMany({
    where,
    orderBy: [
      { isFeatured: "desc" },
      { featuredPriority: "asc" },
      { displayOrder: "asc" },
      { fullName: "asc" },
    ],
    skip: (page - 1) * ADMIN_TEAM_PAGE_SIZE,
    take: ADMIN_TEAM_PAGE_SIZE,
    select: {
      id: true,
      fullName: true,
      roleTitle: true,
      slug: true,
      displayOrder: true,
      featuredPriority: true,
      isActive: true,
      isFeatured: true,
      archivedAt: true,
      department: { select: { id: true, name: true } },
    },
  });

  return { members, total, page, pageCount, pageSize: ADMIN_TEAM_PAGE_SIZE };
}

export async function loadAdminTeamMember(
  organizationId: string,
  memberId: string,
) {
  return prisma.teamMember.findFirst({
    where: { id: memberId, organizationId, deletedAt: null },
    select: {
      id: true,
      fullName: true,
      roleTitle: true,
      departmentId: true,
      biography: true,
      specialty: true,
      email: true,
      phone: true,
      instagramUrl: true,
      linkedinUrl: true,
      websiteUrl: true,
      slug: true,
      seoTitle: true,
      seoDescription: true,
      displayOrder: true,
      featuredPriority: true,
      isActive: true,
      isFeatured: true,
      archivedAt: true,
      department: { select: { id: true, name: true, slug: true } },
      portraitMedia: {
        select: { id: true, storageKey: true, altText: true, metadata: true },
      },
    },
  });
}

export function portraitPublicUrl(
  media: {
    storageKey: string;
    metadata?: unknown;
  } | null
    | undefined,
  size: TeamPortraitVariantSize = "w480",
): string | null {
  if (!media) return null;
  return publicPortraitUrl(media, size);
}
