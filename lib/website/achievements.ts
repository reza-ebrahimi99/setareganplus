import { utcToJalaliInTehran } from "@/lib/datetime/jalali";
import {
  publicCertificateUrl,
  publicCoverUrl,
} from "@/lib/media/achievement-media";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";
import { prisma } from "@/lib/prisma";
import { listPublicAchievementCategories } from "@/lib/website/achievement-categories";
import { toPersianDigits } from "@/lib/persian";

export { listPublicAchievementCategories };

export const HOMEPAGE_FEATURED_ACHIEVEMENT_LIMIT = 6;
export const HOMEPAGE_ACHIEVEMENT_TIMELINE_LIMIT = 10;
export const PUBLIC_ACHIEVEMENT_TIMELINE_LIMIT = 36;
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
          ],
        }
      : {}),
  };
}

const publicCardSelect = {
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
      grade: { select: { name: true } },
    },
  },
  coverMedia: { select: mediaSelect },
} as const;

type PublicCardRow = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  schoolYear: string | null;
  place: string | null;
  level: string | null;
  achievementDate: Date | null;
  isFeatured: boolean;
  category: { name: string; slug: string; color: string | null };
  student: { grade: { name: string } };
  coverMedia: {
    storageKey: string;
    altText: string | null;
    metadata: unknown;
  } | null;
};

function toPublicAchievementCard(row: PublicCardRow): PublicAchievementCard {
  return {
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
    gradeName: row.student.grade.name,
    ...mapCover(row.coverMedia, row.title),
  };
}

export type AchievementTimelineGroup = {
  key: string;
  label: string;
  achievements: PublicAchievementCard[];
};

function timelineBucket(achievement: PublicAchievementCard): {
  key: string;
  label: string;
  sortKey: string;
} {
  const schoolYear = achievement.schoolYear?.trim();
  if (schoolYear) {
    return {
      key: `sy:${schoolYear}`,
      label: toPersianDigits(schoolYear),
      sortKey: `2:${schoolYear}`,
    };
  }
  if (achievement.achievementDate) {
    const year = utcToJalaliInTehran(achievement.achievementDate).jy;
    return {
      key: `jy:${year}`,
      label: toPersianDigits(year),
      sortKey: `1:${year}`,
    };
  }
  return { key: "other", label: "سایر", sortKey: "0:other" };
}

export function groupAchievementsByTimeline(
  achievements: PublicAchievementCard[],
): AchievementTimelineGroup[] {
  const groups = new Map<
    string,
    AchievementTimelineGroup & { sortKey: string }
  >();

  for (const achievement of achievements) {
    const bucket = timelineBucket(achievement);
    const existing = groups.get(bucket.key);
    if (existing) {
      existing.achievements.push(achievement);
    } else {
      groups.set(bucket.key, {
        key: bucket.key,
        label: bucket.label,
        sortKey: bucket.sortKey,
        achievements: [achievement],
      });
    }
  }

  return [...groups.values()]
    .sort((a, b) => b.sortKey.localeCompare(a.sortKey, "en"))
    .map(({ key, label, achievements: items }) => ({
      key,
      label,
      achievements: items,
    }));
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
      select: publicCardSelect,
    });

    return rows.map(toPublicAchievementCard);
  } catch {
    return [];
  }
}

export async function loadPublicAchievementTimeline(options?: {
  limit?: number;
}): Promise<AchievementTimelineGroup[]> {
  try {
    const organization = await getCurrentOrganization();
    if (!organization) return [];

    const limit = options?.limit ?? PUBLIC_ACHIEVEMENT_TIMELINE_LIMIT;
    const rows = await prisma.achievement.findMany({
      where: publicAchievementWhere(organization.id),
      orderBy: [
        { isFeatured: "desc" },
        { achievementDate: "desc" },
        { featuredPriority: "asc" },
        { displayOrder: "asc" },
      ],
      take: limit,
      select: publicCardSelect,
    });

    return groupAchievementsByTimeline(rows.map(toPublicAchievementCard));
  } catch {
    return [];
  }
}

export async function loadHomepageAchievementShowcase(): Promise<{
  featured: PublicAchievementCard[];
  timeline: AchievementTimelineGroup[];
}> {
  const [featured, timeline] = await Promise.all([
    loadFeaturedAchievements(),
    loadPublicAchievementTimeline({
      limit: HOMEPAGE_ACHIEVEMENT_TIMELINE_LIMIT,
    }),
  ]);
  return { featured, timeline };
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
    select: publicCardSelect,
  });

  return {
    achievements: rows.map(toPublicAchievementCard),
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
    gradeName: row.student.grade.name,
    ...cover,
    coverUrlLarge: publicCoverUrl(row.coverMedia, "w960"),
    certificateUrl: publicCertificateUrl(row.certificateMedia),
    certificateIsPdf,
  };
}

/** Privacy: per-student public achievement lists are disabled. */
export async function loadPublicAchievementsForStudent(
  _studentId: string,
): Promise<PublicAchievementCard[]> {
  return [];
}
