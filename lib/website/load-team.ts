import {
  publicPortraitUrl,
  type TeamPortraitVariantSize,
} from "@/lib/media/team-portrait";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";
import { prisma } from "@/lib/prisma";
import { listPublicTeamDepartments } from "@/lib/website/team-departments";

export { listPublicTeamDepartments };

export const HOMEPAGE_FEATURED_TEAM_LIMIT = 4;
/** Initial /team page size — keep card count bounded. */
export const PUBLIC_TEAM_PAGE_SIZE = 30;

export type PublicTeamMemberCard = {
  id: string;
  slug: string;
  fullName: string;
  roleTitle: string;
  specialty: string | null;
  departmentName: string;
  departmentSlug: string;
  portraitUrl: string | null;
  portraitAlt: string;
};

type PortraitMediaSelect = {
  storageKey: string;
  altText: string | null;
  metadata: unknown;
} | null;

function mapPortrait(
  media: PortraitMediaSelect,
  fullName: string,
  size: TeamPortraitVariantSize,
): { portraitUrl: string | null; portraitAlt: string } {
  return {
    portraitUrl: publicPortraitUrl(media, size),
    portraitAlt: media?.altText?.trim() || fullName,
  };
}

const portraitSelect = {
  storageKey: true,
  altText: true,
  metadata: true,
} as const;

/** Homepage only: active + featured, take 4, no bio/contact/SEO. */
export async function loadFeaturedTeamMembers(): Promise<PublicTeamMemberCard[]> {
  try {
    const organization = await getCurrentOrganization();
    if (!organization) return [];

    const rows = await prisma.teamMember.findMany({
      where: {
        organizationId: organization.id,
        deletedAt: null,
        archivedAt: null,
        isActive: true,
        isFeatured: true,
        department: { deletedAt: null, archivedAt: null, isActive: true },
      },
      orderBy: [
        { featuredPriority: "asc" },
        { displayOrder: "asc" },
        { fullName: "asc" },
      ],
      take: HOMEPAGE_FEATURED_TEAM_LIMIT,
      select: {
        id: true,
        slug: true,
        fullName: true,
        roleTitle: true,
        portraitMedia: { select: portraitSelect },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      fullName: row.fullName,
      roleTitle: row.roleTitle,
      specialty: null,
      departmentName: "",
      departmentSlug: "",
      ...mapPortrait(row.portraitMedia, row.fullName, "w480"),
    }));
  } catch {
    return [];
  }
}

export type PublicTeamPageData = {
  departments: Array<{
    id: string;
    slug: string;
    name: string;
    members: PublicTeamMemberCard[];
  }>;
  members: PublicTeamMemberCard[];
  totalMembers: number;
  page: number;
  pageSize: number;
  pageCount: number;
  departmentCount: number;
};

function publicMemberWhere(
  organizationId: string,
  filters?: { departmentSlug?: string; q?: string },
) {
  const q = filters?.q?.trim() ?? "";
  const departmentSlug = filters?.departmentSlug?.trim() ?? "";

  return {
    organizationId,
    deletedAt: null,
    archivedAt: null,
    isActive: true,
    department: {
      deletedAt: null,
      archivedAt: null,
      isActive: true,
      ...(departmentSlug ? { slug: departmentSlug } : {}),
    },
    ...(q
      ? {
          OR: [
            { fullName: { contains: q, mode: "insensitive" as const } },
            { roleTitle: { contains: q, mode: "insensitive" as const } },
            { specialty: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
}

export async function loadPublicTeamPage(filters?: {
  departmentSlug?: string;
  q?: string;
  page?: number;
}): Promise<PublicTeamPageData | null> {
  const organization = await getCurrentOrganization();
  if (!organization) return null;

  const pageSize = PUBLIC_TEAM_PAGE_SIZE;
  const where = publicMemberWhere(organization.id, filters);

  const [totalMembers, departmentCount] = await Promise.all([
    prisma.teamMember.count({ where }),
    prisma.teamDepartment.count({
      where: {
        organizationId: organization.id,
        deletedAt: null,
        archivedAt: null,
        isActive: true,
      },
    }),
  ]);

  const pageCount = Math.max(1, Math.ceil(totalMembers / pageSize));
  const requested = filters?.page && filters.page > 0 ? filters.page : 1;
  const page = Math.min(requested, pageCount);

  const rows = await prisma.teamMember.findMany({
    where,
    orderBy: [
      { department: { sortOrder: "asc" } },
      { displayOrder: "asc" },
      { fullName: "asc" },
    ],
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: {
      id: true,
      slug: true,
      fullName: true,
      roleTitle: true,
      specialty: true,
      department: { select: { id: true, name: true, slug: true } },
      portraitMedia: { select: portraitSelect },
    },
  });

  const departmentMap = new Map<
    string,
    {
      id: string;
      slug: string;
      name: string;
      members: PublicTeamMemberCard[];
    }
  >();
  const members: PublicTeamMemberCard[] = [];

  for (const row of rows) {
    const member: PublicTeamMemberCard = {
      id: row.id,
      slug: row.slug,
      fullName: row.fullName,
      roleTitle: row.roleTitle,
      specialty: row.specialty,
      departmentName: row.department.name,
      departmentSlug: row.department.slug,
      ...mapPortrait(row.portraitMedia, row.fullName, "w480"),
    };
    members.push(member);

    const existing = departmentMap.get(row.department.id);
    if (existing) {
      existing.members.push(member);
    } else {
      departmentMap.set(row.department.id, {
        id: row.department.id,
        slug: row.department.slug,
        name: row.department.name,
        members: [member],
      });
    }
  }

  return {
    departments: Array.from(departmentMap.values()),
    members,
    totalMembers,
    page,
    pageSize,
    pageCount,
    departmentCount,
  };
}

export type PublicTeamMemberDetail = PublicTeamMemberCard & {
  biography: string;
  email: string | null;
  phone: string | null;
  instagramUrl: string | null;
  linkedinUrl: string | null;
  websiteUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
};

export async function loadPublicTeamMemberBySlug(
  slug: string,
): Promise<PublicTeamMemberDetail | null> {
  const organization = await getCurrentOrganization();
  if (!organization) return null;

  const member = await prisma.teamMember.findFirst({
    where: {
      organizationId: organization.id,
      slug,
      deletedAt: null,
      archivedAt: null,
      isActive: true,
      department: { deletedAt: null, archivedAt: null, isActive: true },
    },
    select: {
      id: true,
      slug: true,
      fullName: true,
      roleTitle: true,
      specialty: true,
      biography: true,
      email: true,
      phone: true,
      instagramUrl: true,
      linkedinUrl: true,
      websiteUrl: true,
      seoTitle: true,
      seoDescription: true,
      department: { select: { name: true, slug: true } },
      portraitMedia: { select: portraitSelect },
    },
  });

  if (!member) return null;

  return {
    id: member.id,
    slug: member.slug,
    fullName: member.fullName,
    roleTitle: member.roleTitle,
    specialty: member.specialty,
    biography: member.biography,
    email: member.email,
    phone: member.phone,
    instagramUrl: member.instagramUrl,
    linkedinUrl: member.linkedinUrl,
    websiteUrl: member.websiteUrl,
    seoTitle: member.seoTitle,
    seoDescription: member.seoDescription,
    departmentName: member.department.name,
    departmentSlug: member.department.slug,
    ...mapPortrait(member.portraitMedia, member.fullName, "w960"),
  };
}
