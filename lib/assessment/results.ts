import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const ADMIN_RESULT_PAGE_SIZE = 30;
export const HOMEPAGE_FEATURED_RESULT_LIMIT = 6;

export type PublicAssessmentResultCard = {
  id: string;
  score: number | null;
  scaledScore: number | null;
  rankSchool: number | null;
  rankCity: number | null;
  rankProvince: number | null;
  rankCountry: number | null;
  percentile: number | null;
  growth: number | null;
  isFeatured: boolean;
  studentName: string;
  studentSlug: string;
  /** Public portrait URL when media is active; never a profile route. */
  studentPortraitUrl: string | null;
  gradeName: string;
  assessmentTitle: string;
  assessmentSlug: string;
  assessmentDate: Date | null;
  schoolYear: string | null;
  providerName: string;
  providerColor: string | null;
  assessmentTypeLabel: string;
};

export async function listAdminAssessmentResults(
  organizationId: string,
  options?: {
    page?: number;
    q?: string;
    assessmentId?: string;
    studentId?: string;
    gradeId?: string;
    providerId?: string;
    schoolYear?: string;
    featured?: "all" | "yes" | "no";
  },
) {
  const q = options?.q?.trim() ?? "";
  const where: Prisma.AssessmentResultWhereInput = {
    organizationId,
    deletedAt: null,
    ...(options?.assessmentId ? { assessmentId: options.assessmentId } : {}),
    ...(options?.studentId ? { studentId: options.studentId } : {}),
    ...(options?.featured === "yes"
      ? { isFeatured: true }
      : options?.featured === "no"
        ? { isFeatured: false }
        : {}),
    assessment: {
      deletedAt: null,
      ...(options?.providerId ? { providerId: options.providerId } : {}),
      ...(options?.schoolYear ? { schoolYear: options.schoolYear } : {}),
      ...(options?.gradeId ? { gradeId: options.gradeId } : {}),
    },
    ...(q
      ? {
          OR: [
            {
              student: {
                fullName: { contains: q, mode: "insensitive" },
              },
            },
            {
              assessment: {
                title: { contains: q, mode: "insensitive" },
              },
            },
          ],
        }
      : {}),
  };

  const total = await prisma.assessmentResult.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / ADMIN_RESULT_PAGE_SIZE));
  const requested = options?.page && options.page > 0 ? options.page : 1;
  const page = Math.min(requested, pageCount);

  const results = await prisma.assessmentResult.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
    skip: (page - 1) * ADMIN_RESULT_PAGE_SIZE,
    take: ADMIN_RESULT_PAGE_SIZE,
    select: {
      id: true,
      score: true,
      scaledScore: true,
      rankSchool: true,
      percentile: true,
      isFeatured: true,
      student: {
        select: {
          id: true,
          fullName: true,
          grade: { select: { name: true } },
        },
      },
      assessment: {
        select: {
          id: true,
          title: true,
          schoolYear: true,
          assessmentDate: true,
          provider: { select: { name: true } },
        },
      },
      _count: { select: { subjectResults: true } },
    },
  });

  return { results, total, page, pageCount, pageSize: ADMIN_RESULT_PAGE_SIZE };
}

export async function loadAdminAssessmentResult(
  organizationId: string,
  resultId: string,
) {
  return prisma.assessmentResult.findFirst({
    where: { id: resultId, organizationId, deletedAt: null },
    select: {
      id: true,
      studentId: true,
      assessmentId: true,
      score: true,
      scaledScore: true,
      rankSchool: true,
      rankCity: true,
      rankProvince: true,
      rankCountry: true,
      percentile: true,
      growth: true,
      averageClass: true,
      averageGrade: true,
      notes: true,
      isFeatured: true,
      student: { select: { id: true, fullName: true, slug: true } },
      assessment: {
        select: {
          id: true,
          title: true,
          slug: true,
          schoolYear: true,
        },
      },
      subjectResults: {
        select: {
          id: true,
          subjectId: true,
          percentage: true,
          correctAnswers: true,
          wrongAnswers: true,
          blankAnswers: true,
          timeSpent: true,
          subject: { select: { id: true, name: true, shortName: true } },
        },
        orderBy: { subject: { displayOrder: "asc" } },
      },
    },
  });
}

export async function loadFeaturedAssessmentResults(
  options?: {
    organizationId?: string;
    assessmentId?: string;
    providerSlug?: string;
    limit?: number;
  },
): Promise<PublicAssessmentResultCard[]> {
  const { loadPublicFeaturedAssessmentResults } = await import(
    "@/lib/assessment/featured-results"
  );
  return loadPublicFeaturedAssessmentResults(options);
}

export async function loadPublicAssessmentHistoryForStudent(
  _studentId: string,
): Promise<PublicAssessmentResultCard[]> {
  /** Privacy: public per-student assessment history remains disabled. */
  return [];
}
