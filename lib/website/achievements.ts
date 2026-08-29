import {
  publicCertificateUrl,
  publicCoverUrl,
} from "@/lib/media/achievement-media";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";
import { prisma } from "@/lib/prisma";
import { listPublicAchievementCategories } from "@/lib/website/achievement-categories";
import {
  HOMEPAGE_ACHIEVEMENT_GRID_LIMIT,
  HOMEPAGE_FEATURED_ACHIEVEMENT_LIMIT,
  HOMEPAGE_HERO_SLIDER_LIMIT,
  PUBLIC_ACHIEVEMENT_PAGE_SIZE,
} from "@/lib/website/achievement-limits";
import type { TeamPortraitVariantSize } from "@/lib/media/team-portrait";

export { listPublicAchievementCategories };
export {
  HOMEPAGE_ACHIEVEMENT_GRID_LIMIT,
  HOMEPAGE_FEATURED_ACHIEVEMENT_LIMIT,
  HOMEPAGE_HERO_SLIDER_LIMIT,
  PUBLIC_ACHIEVEMENT_PAGE_SIZE,
} from "@/lib/website/achievement-limits";

export type AchievementHeroPlacement =
  | "homepageHero"
  | "homepageSlider"
  | "homepageTicker"
  | "achievementHero"
  | "achievementGallery";

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
  size: TeamPortraitVariantSize = "w480",
): { coverUrl: string | null; coverAlt: string } {
  return {
    coverUrl: publicCoverUrl(media, size),
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

function heroScheduleWhere(now = new Date()) {
  return {
    AND: [
      {
        OR: [{ heroPublishFrom: null }, { heroPublishFrom: { lte: now } }],
      },
      {
        OR: [{ heroPublishUntil: null }, { heroPublishUntil: { gte: now } }],
      },
    ],
  };
}

const placementField: Record<
  AchievementHeroPlacement,
  | "showInHomepageHero"
  | "showInHomepageSlider"
  | "showInHomepageTicker"
  | "showInAchievementHero"
  | "showInAchievementGallery"
> = {
  homepageHero: "showInHomepageHero",
  homepageSlider: "showInHomepageSlider",
  homepageTicker: "showInHomepageTicker",
  achievementHero: "showInAchievementHero",
  achievementGallery: "showInAchievementGallery",
};

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

function toPublicAchievementCard(
  row: PublicCardRow,
  coverSize: TeamPortraitVariantSize = "w480",
): PublicAchievementCard {
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
    ...mapCover(row.coverMedia, row.title, coverSize),
  };
}

export async function loadAchievementsByPlacement(
  placement: AchievementHeroPlacement,
  options?: { limit?: number; coverSize?: TeamPortraitVariantSize },
): Promise<PublicAchievementCard[]> {
  try {
    const organization = await getCurrentOrganization();
    if (!organization) return [];

    const field = placementField[placement];
    const limit = options?.limit ?? HOMEPAGE_HERO_SLIDER_LIMIT;
    const coverSize = options?.coverSize ?? "w960";

    const rows = await prisma.achievement.findMany({
      where: {
        ...publicAchievementWhere(organization.id),
        ...heroScheduleWhere(),
        [field]: true,
      },
      orderBy: [
        { featuredPriority: "asc" },
        { achievementDate: "desc" },
        { displayOrder: "asc" },
        { createdAt: "desc" },
      ],
      take: limit,
      select: publicCardSelect,
    });

    return rows.map((row) => toPublicAchievementCard(row, coverSize));
  } catch {
    return [];
  }
}

/** @deprecated Prefer loadAchievementsByPlacement("homepageSlider") */
export async function loadFeaturedAchievements(): Promise<
  PublicAchievementCard[]
> {
  const placed = await loadAchievementsByPlacement("homepageSlider", {
    limit: HOMEPAGE_FEATURED_ACHIEVEMENT_LIMIT,
    coverSize: "w960",
  });
  if (placed.length > 0) return placed;

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

    return rows.map((row) => toPublicAchievementCard(row, "w960"));
  } catch {
    return [];
  }
}

export type HomepageAchievementsData = {
  /**
   * Single ordered CMS collection for the homepage showcase.
   * Grid renders this list; slider must use the first N of the same array.
   */
  achievements: PublicAchievementCard[];
};

/**
 * Single CMS loader for the homepage achievements showcase.
 * One query — grid and slider share this exact ordered collection.
 */
export async function loadHomepageAchievements(): Promise<HomepageAchievementsData> {
  try {
    const organization = await getCurrentOrganization();
    if (!organization) {
      return { achievements: [] };
    }

    const rows = await prisma.achievement.findMany({
      where: publicAchievementWhere(organization.id),
      orderBy: [
        { isFeatured: "desc" },
        { featuredPriority: "asc" },
        { achievementDate: "desc" },
        { createdAt: "desc" },
        { displayOrder: "asc" },
      ],
      take: HOMEPAGE_ACHIEVEMENT_GRID_LIMIT,
      select: publicCardSelect,
    });

    return {
      achievements: rows.map((row) => toPublicAchievementCard(row, "w960")),
    };
  } catch {
    return { achievements: [] };
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
  try {
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
      achievements: rows.map((row) => toPublicAchievementCard(row, "w480")),
      total,
      page,
      pageSize,
      pageCount,
      schoolYears: schoolYearRows
        .map((row) => row.schoolYear)
        .filter((value): value is string => Boolean(value)),
    };
  } catch {
    return null;
  }
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
        select: {
          storageKey: true,
          altText: true,
          metadata: true,
          mimeType: true,
        },
      },
    },
  });

  if (!row) return null;

  const cover = mapCover(row.coverMedia, row.title, "w480");
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
