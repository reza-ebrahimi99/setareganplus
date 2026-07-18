import {
  publicCertificateUrl,
  publicCoverUrl,
} from "@/lib/media/achievement-media";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";
import { prisma } from "@/lib/prisma";
import { listPublicAchievementCategories } from "@/lib/website/achievement-categories";

export { listPublicAchievementCategories };

export const HOMEPAGE_FEATURED_ACHIEVEMENT_LIMIT = 6;
export const PUBLIC_ACHIEVEMENT_PAGE_SIZE = 24;

export type PublicAchievementCard = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  schoolYear: string | null;
  place: string | null;
  level: string | null;
  achievementDate: Date | null;
  isFeatured: boolean;
  categoryName: string;
  categorySlug: string;
  categoryColor: string | null;
  studentName: string;
  studentSlug: string;
  gradeName: string;
  coverUrl: string | null;
  coverAlt: string;
};

type MediaSelect = {
  storageKey: true;
  altText: true;
  metadata: true;
};

const mediaSelect = {
  storageKey: true,
  altText: true,
  metadata: true,
} satisfies MediaSelect;

function mapCover(
  media: {
    storageKey: string;
    altText: string | null;
    metadata: unknown;
  } | null,
  title: string,
): { coverUrl: string | null; coverAlt: string } {
  return {
    coverUrl: publicCoverUrl(media, "w480"),
    coverAlt: media?.altText?.trim() || title,
  };
}

function publicAchievementWhere(
  organizationId: string,
  filters?: {
    categorySlug?: string;
    gradeSlug?: string;
    schoolYear?: string;
    q?: string;
  },
) {
  const q = filters?.q?.trim() ?? "";
  const categorySlug = filters?.categorySlug?.trim() ?? "";
  const gradeSlug = filters?.gradeSlug?.trim() ?? "";
  const schoolYear = filters?.schoolYear?.trim() ?? "";

  return {
    organizationId,
    deletedAt: null,
    archivedAt: null,
    isPublished: true,
    category: {
      deletedAt: null,
      archivedAt: null,
      isActive: true,
      ...(categorySlug ? { slug: categorySlug } : {}),
    },
    student: {
      deletedAt: null,
      archivedAt: null,
      isActive: true,
      ...(gradeSlug
        ? {
            grade: {
              deletedAt: null,
              archivedAt: null,
              isActive: true,
              slug: gradeSlug,
            },
          }
        : {
            grade: { deletedAt: null, archivedAt: null, isActive: true },
          }),
    },
    ...(schoolYear ? { schoolYear } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { shortDescription: { contains: q, mode: "insensitive" as const } },
            { issuer: { contains: q, mode: "insensitive" as const } },
            { place: { contains: q, mode: "insensitive" as const } },
            {
              student: {
                fullName: { contains: q, mode: "insensitive" as const },
              },
            },
          ],
        }
      : {}),
  };
}

export async function loadFeaturedAchievements(): Promise<
  PublicAchievementCard[]
> {
  try {
    const organization = await getCurrentOrganization();
    if (!organization) return [];

    const rows = await prisma.achievement.findMany({
      where: {
        ...publicAchievementWhere(organization.id),
        isFeatured: true,
      },
      orderBy: [
        { featuredPriority: "asc" },
        { achievementDate: "desc" },
        { displayOrder: "asc" },
      ],
      take: HOMEPAGE_FEATURED_ACHIEVEMENT_LIMIT,
      select: {
        id: true,
        slug: true,
        title: true,
        shortDescription: true,
        schoolYear: true,
        place: true,
        level: true,
        achievementDate: true,
        isFeatured: true,
        category: { select: { name: true, slug: true, color: true } },
        student: {
          select: {
            fullName: true,
            slug: true,
            grade: { select: { name: true } },
          },
        },
        coverMedia: { select: mediaSelect },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      shortDescription: row.shortDescription,
      schoolYear: row.schoolYear,
      place: row.place,
      level: row.level,
      achievementDate: row.achievementDate,
      isFeatured: row.isFeatured,
      categoryName: row.category.name,
      categorySlug: row.category.slug,
      categoryColor: row.category.color,
      studentName: row.student.fullName,
      studentSlug: row.student.slug,
      gradeName: row.student.grade.name,
      ...mapCover(row.coverMedia, row.title),
    }));
  } catch {
    return [];
  }
}

export type PublicAchievementPageData = {
  achievements: PublicAchievementCard[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  schoolYears: string[];
};

export async function loadPublicAchievementPage(filters?: {
  categorySlug?: string;
  gradeSlug?: string;
  schoolYear?: string;
  q?: string;
  page?: number;
}): Promise<PublicAchievementPageData | null> {
  const organization = await getCurrentOrganization();
  if (!organization) return null;

  const pageSize = PUBLIC_ACHIEVEMENT_PAGE_SIZE;
  const where = publicAchievementWhere(organization.id, filters);

  const [total, schoolYearRows] = await Promise.all([
    prisma.achievement.count({ where }),
    prisma.achievement.findMany({
      where: {
        organizationId: organization.id,
        deletedAt: null,
        archivedAt: null,
        isPublished: true,
        schoolYear: { not: null },
      },
      distinct: ["schoolYear"],
      select: { schoolYear: true },
      orderBy: { schoolYear: "desc" },
    }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const requested = filters?.page && filters.page > 0 ? filters.page : 1;
  const page = Math.min(requested, pageCount);

  const rows = await prisma.achievement.findMany({
    where,
    orderBy: [
      { isFeatured: "desc" },
      { featuredPriority: "asc" },
      { achievementDate: "desc" },
      { displayOrder: "asc" },
    ],
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: {
      id: true,
      slug: true,
      title: true,
      shortDescription: true,
      schoolYear: true,
      place: true,
      level: true,
      achievementDate: true,
      isFeatured: true,
      category: { select: { name: true, slug: true, color: true } },
      student: {
        select: {
          fullName: true,
          slug: true,
          grade: { select: { name: true } },
        },
      },
      coverMedia: { select: mediaSelect },
    },
  });

  return {
    achievements: rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      shortDescription: row.shortDescription,
      schoolYear: row.schoolYear,
      place: row.place,
      level: row.level,
      achievementDate: row.achievementDate,
      isFeatured: row.isFeatured,
      categoryName: row.category.name,
      categorySlug: row.category.slug,
      categoryColor: row.category.color,
      studentName: row.student.fullName,
      studentSlug: row.student.slug,
      gradeName: row.student.grade.name,
      ...mapCover(row.coverMedia, row.title),
    })),
    total,
    page,
    pageSize,
    pageCount,
    schoolYears: schoolYearRows
      .map((row) => row.schoolYear)
      .filter((value): value is string => Boolean(value)),
  };
}

export type PublicAchievementDetail = PublicAchievementCard & {
  description: string;
  issuer: string | null;
  score: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  certificateUrl: string | null;
  certificateIsPdf: boolean;
  coverUrlLarge: string | null;
};

export async function loadPublicAchievementBySlug(
  slug: string,
): Promise<PublicAchievementDetail | null> {
  const organization = await getCurrentOrganization();
  if (!organization) return null;

  const row = await prisma.achievement.findFirst({
    where: {
      organizationId: organization.id,
      slug,
      deletedAt: null,
      archivedAt: null,
      isPublished: true,
      category: { deletedAt: null, archivedAt: null, isActive: true },
      student: {
        deletedAt: null,
        archivedAt: null,
        isActive: true,
        grade: { deletedAt: null, archivedAt: null, isActive: true },
      },
    },
    select: {
      id: true,
      slug: true,
      title: true,
      shortDescription: true,
      description: true,
      schoolYear: true,
      place: true,
      level: true,
      score: true,
      issuer: true,
      achievementDate: true,
      isFeatured: true,
      seoTitle: true,
      seoDescription: true,
      category: { select: { name: true, slug: true, color: true } },
      student: {
        select: {
          fullName: true,
          slug: true,
          grade: { select: { name: true } },
        },
      },
      coverMedia: { select: mediaSelect },
      certificateMedia: {
        select: { storageKey: true, altText: true, metadata: true, mimeType: true },
      },
    },
  });

  if (!row) return null;

  const cover = mapCover(row.coverMedia, row.title);
  const certificateMeta = row.certificateMedia?.metadata;
  const certificateIsPdf =
    Boolean(
      certificateMeta &&
        typeof certificateMeta === "object" &&
        !Array.isArray(certificateMeta) &&
        (certificateMeta as { kind?: string }).kind ===
          "achievement-certificate-pdf",
    ) || row.certificateMedia?.mimeType === "application/pdf";

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    shortDescription: row.shortDescription,
    description: row.description,
    schoolYear: row.schoolYear,
    place: row.place,
    level: row.level,
    score: row.score,
    issuer: row.issuer,
    achievementDate: row.achievementDate,
    isFeatured: row.isFeatured,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    categoryName: row.category.name,
    categorySlug: row.category.slug,
    categoryColor: row.category.color,
    studentName: row.student.fullName,
    studentSlug: row.student.slug,
    gradeName: row.student.grade.name,
    ...cover,
    coverUrlLarge: publicCoverUrl(row.coverMedia, "w960"),
    certificateUrl: publicCertificateUrl(row.certificateMedia),
    certificateIsPdf,
  };
}

/** Student profile: published achievements, featured first then date. */
export async function loadPublicAchievementsForStudent(
  studentId: string,
): Promise<PublicAchievementCard[]> {
  const organization = await getCurrentOrganization();
  if (!organization) return [];

  const rows = await prisma.achievement.findMany({
    where: {
      organizationId: organization.id,
      studentId,
      deletedAt: null,
      archivedAt: null,
      isPublished: true,
      category: { deletedAt: null, archivedAt: null, isActive: true },
    },
    orderBy: [
      { isFeatured: "desc" },
      { featuredPriority: "asc" },
      { achievementDate: "desc" },
      { displayOrder: "asc" },
    ],
    select: {
      id: true,
      slug: true,
      title: true,
      shortDescription: true,
      schoolYear: true,
      place: true,
      level: true,
      achievementDate: true,
      isFeatured: true,
      category: { select: { name: true, slug: true, color: true } },
      student: {
        select: {
          fullName: true,
          slug: true,
          grade: { select: { name: true } },
        },
      },
      coverMedia: { select: mediaSelect },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    shortDescription: row.shortDescription,
    schoolYear: row.schoolYear,
    place: row.place,
    level: row.level,
    achievementDate: row.achievementDate,
    isFeatured: row.isFeatured,
    categoryName: row.category.name,
    categorySlug: row.category.slug,
    categoryColor: row.category.color,
    studentName: row.student.fullName,
    studentSlug: row.student.slug,
    gradeName: row.student.grade.name,
    ...mapCover(row.coverMedia, row.title),
  }));
}
