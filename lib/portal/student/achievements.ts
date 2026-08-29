import { prisma } from "@/lib/prisma";
import type { PortalContext } from "@/lib/portal/auth/types";
import { assertStudentVisible } from "@/lib/portal/auth";
import {
  achievementCertificatePublicUrl,
  achievementCoverPublicUrl,
} from "@/lib/website/achievement-admin";

export type PortalAchievementDto = {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  achievementDate: Date | null;
  schoolYear: string | null;
  categoryName: string;
  coverUrl: string | null;
  certificateUrl: string | null;
};

export async function loadPortalStudentAchievements(
  context: PortalContext,
  studentId: string,
  options?: { includeCertificates?: boolean },
): Promise<PortalAchievementDto[]> {
  const access = assertStudentVisible(context, studentId, {
    requireAchievements: true,
  });
  const includeCertificates =
    options?.includeCertificates !== false && access.canViewCertificates;

  const rows = await prisma.achievement.findMany({
    where: {
      organizationId: context.organization.id,
      studentId,
      deletedAt: null,
      archivedAt: null,
      isPublished: true,
    },
    orderBy: [
      { isFeatured: "desc" },
      { achievementDate: "desc" },
      { createdAt: "desc" },
    ],
    select: {
      id: true,
      title: true,
      slug: true,
      shortDescription: true,
      achievementDate: true,
      schoolYear: true,
      category: { select: { name: true } },
      coverMedia: {
        select: { storageKey: true, metadata: true, altText: true },
      },
      certificateMedia: {
        select: { storageKey: true, metadata: true, mimeType: true },
      },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    shortDescription: row.shortDescription,
    achievementDate: row.achievementDate,
    schoolYear: row.schoolYear,
    categoryName: row.category.name,
    coverUrl: achievementCoverPublicUrl(row.coverMedia),
    certificateUrl: includeCertificates
      ? achievementCertificatePublicUrl(row.certificateMedia)
      : null,
  }));
}
