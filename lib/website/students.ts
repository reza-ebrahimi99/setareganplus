import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";
import { prisma } from "@/lib/prisma";
import { listPublicStudentGrades } from "@/lib/website/student-grades";

export { listPublicStudentGrades };

export const HOMEPAGE_FEATURED_STUDENT_LIMIT = 4;
export const PUBLIC_STUDENT_PAGE_SIZE = 30;

/**
 * @deprecated Public student identity cards are disabled for privacy.
 * Kept only so legacy imports type-check; never populate with real PII.
 */
export type PublicStudentCard = {
  id: string;
  slug: string;
  fullName: string;
  firstName: string;
  lastName: string;
  gradeName: string;
  gradeSlug: string;
  majorName: string | null;
  schoolYear: string | null;
  portraitUrl: string | null;
  portraitAlt: string;
};

export type PublicStudentDetail = PublicStudentCard & {
  biography: string;
  parentName: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
};

export type PublicStudentOverview = {
  totalStudents: number;
  gradeCount: number;
  publishedAchievementCount: number;
  grades: Array<{ id: string; slug: string; name: string }>;
};

/** Aggregate-only public overview — no names, photos, or profile links. */
export async function loadPublicStudentOverview(): Promise<PublicStudentOverview | null> {
  try {
    const organization = await getCurrentOrganization();
    if (!organization) return null;

    const studentWhere = {
      organizationId: organization.id,
      deletedAt: null,
      archivedAt: null,
      isActive: true,
      grade: { deletedAt: null, archivedAt: null, isActive: true },
    };

    const [totalStudents, grades, publishedAchievementCount] = await Promise.all([
      prisma.student.count({ where: studentWhere }),
      listPublicStudentGrades(organization.id),
      prisma.achievement.count({
        where: {
          organizationId: organization.id,
          deletedAt: null,
          archivedAt: null,
          isPublished: true,
        },
      }),
    ]);

    return {
      totalStudents,
      gradeCount: grades.length,
      publishedAchievementCount,
      grades,
    };
  } catch {
    return null;
  }
}

/** Privacy: public featured student strips are disabled. */
export async function loadFeaturedStudents(): Promise<PublicStudentCard[]> {
  return [];
}

/**
 * @deprecated Individual public student directories are disabled.
 * Always returns null so callers cannot leak PII.
 */
export async function loadPublicStudentBySlug(
  _slug: string,
): Promise<PublicStudentDetail | null> {
  return null;
}

/**
 * @deprecated Public student directories are disabled.
 * Always returns null — use {@link loadPublicStudentOverview} instead.
 */
export async function loadPublicStudentPage(_filters?: {
  gradeSlug?: string;
  q?: string;
  page?: number;
}): Promise<PublicStudentPageData | null> {
  return null;
}

/** @deprecated Directory payloads are no longer produced for the public site. */
export type PublicStudentPageData = {
  grades: Array<{
    id: string;
    slug: string;
    name: string;
    students: PublicStudentCard[];
  }>;
  students: PublicStudentCard[];
  totalStudents: number;
  page: number;
  pageSize: number;
  pageCount: number;
  gradeCount: number;
};
