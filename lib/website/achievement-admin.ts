import { prisma } from "@/lib/prisma";
import {
  publicCertificateUrl,
  publicCoverUrl,
} from "@/lib/media/achievement-media";
import { ensureDefaultAchievementCategories } from "@/lib/website/achievement-categories";

export const ADMIN_ACHIEVEMENT_PAGE_SIZE = 30;

export type AdminAchievementSort =
  | "date_desc"
  | "date_asc"
  | "featured"
  | "title"
  | "displayOrder";

export async function listAdminAchievements(
  organizationId: string,
  options?: {
    page?: number;
    q?: string;
    studentId?: string;
    gradeId?: string;
    categoryId?: string;
    schoolYear?: string;
    published?: "all" | "yes" | "no";
    featured?: "all" | "yes" | "no";
    sort?: AdminAchievementSort;
  },
) {
  await ensureDefaultAchievementCategories(organizationId);

  const q = options?.q?.trim() ?? "";
  const studentId = options?.studentId?.trim() ?? "";
  const gradeId = options?.gradeId?.trim() ?? "";
  const categoryId = options?.categoryId?.trim() ?? "";
  const schoolYear = options?.schoolYear?.trim() ?? "";
  const published = options?.published ?? "all";
  const featured = options?.featured ?? "all";
  const sort = options?.sort ?? "date_desc";

  const where = {
    organizationId,
    deletedAt: null,
    ...(studentId ? { studentId } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(schoolYear ? { schoolYear } : {}),
    ...(published === "yes"
      ? { isPublished: true }
      : published === "no"
        ? { isPublished: false }
        : {}),
    ...(featured === "yes"
      ? { isFeatured: true }
      : featured === "no"
        ? { isFeatured: false }
        : {}),
    ...(gradeId
      ? { student: { gradeId, deletedAt: null } }
      : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { slug: { contains: q, mode: "insensitive" as const } },
            { issuer: { contains: q, mode: "insensitive" as const } },
            {
              student: {
                fullName: { contains: q, mode: "insensitive" as const },
              },
            },
          ],
        }
      : {}),
  };

  const orderBy =
    sort === "date_asc"
      ? [{ achievementDate: "asc" as const }, { title: "asc" as const }]
      : sort === "featured"
        ? [
            { isFeatured: "desc" as const },
            { featuredPriority: "asc" as const },
            { achievementDate: "desc" as const },
          ]
        : sort === "title"
          ? [{ title: "asc" as const }]
          : sort === "displayOrder"
            ? [{ displayOrder: "asc" as const }, { title: "asc" as const }]
            : [
                { achievementDate: "desc" as const },
                { createdAt: "desc" as const },
              ];

  const total = await prisma.achievement.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / ADMIN_ACHIEVEMENT_PAGE_SIZE));
  const requested = options?.page && options.page > 0 ? options.page : 1;
  const page = Math.min(requested, pageCount);

  const achievements = await prisma.achievement.findMany({
    where,
    orderBy,
    skip: (page - 1) * ADMIN_ACHIEVEMENT_PAGE_SIZE,
    take: ADMIN_ACHIEVEMENT_PAGE_SIZE,
    select: {
      id: true,
      title: true,
      slug: true,
      schoolYear: true,
      place: true,
      achievementDate: true,
      isPublished: true,
      isFeatured: true,
      featuredPriority: true,
      displayOrder: true,
      archivedAt: true,
      category: { select: { id: true, name: true } },
      student: {
        select: {
          id: true,
          fullName: true,
          grade: { select: { id: true, name: true } },
        },
      },
    },
  });

  return {
    achievements,
    total,
    page,
    pageCount,
    pageSize: ADMIN_ACHIEVEMENT_PAGE_SIZE,
  };
}

export async function loadAdminAchievement(
  organizationId: string,
  achievementId: string,
) {
  return prisma.achievement.findFirst({
    where: { id: achievementId, organizationId, deletedAt: null },
    select: {
      id: true,
      studentId: true,
      categoryId: true,
      title: true,
      slug: true,
      shortDescription: true,
      description: true,
      achievementDate: true,
      schoolYear: true,
      issuer: true,
      level: true,
      place: true,
      score: true,
      isFeatured: true,
      featuredPriority: true,
      displayOrder: true,
      seoTitle: true,
      seoDescription: true,
      isPublished: true,
      archivedAt: true,
      category: { select: { id: true, name: true, slug: true } },
      student: {
        select: {
          id: true,
          fullName: true,
          slug: true,
          grade: { select: { name: true } },
        },
      },
      coverMedia: {
        select: { id: true, storageKey: true, altText: true, metadata: true },
      },
      certificateMedia: {
        select: {
          id: true,
          storageKey: true,
          altText: true,
          metadata: true,
          mimeType: true,
        },
      },
    },
  });
}

export async function listAdminStudentOptions(organizationId: string) {
  return prisma.student.findMany({
    where: { organizationId, deletedAt: null },
    orderBy: [{ fullName: "asc" }],
    select: {
      id: true,
      fullName: true,
      grade: { select: { id: true, name: true } },
    },
  });
}

export function achievementCoverPublicUrl(
  media: {
    storageKey: string;
    metadata?: unknown;
  } | null
    | undefined,
) {
  if (!media) return null;
  return publicCoverUrl(media, "w480");
}

export function achievementCertificatePublicUrl(
  media: {
    storageKey: string;
    metadata?: unknown;
  } | null
    | undefined,
) {
  if (!media) return null;
  return publicCertificateUrl(media);
}
