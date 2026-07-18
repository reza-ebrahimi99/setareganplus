import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";
import { ASSESSMENT_TYPE_LABELS } from "@/lib/assessment/types";

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

export async function loadFeaturedAssessmentResults(): Promise<
  PublicAssessmentResultCard[]
> {
  try {
    const organization = await getCurrentOrganization();
    if (!organization) return [];

    const rows = await prisma.assessmentResult.findMany({
      where: {
        organizationId: organization.id,
        deletedAt: null,
        isFeatured: true,
        assessment: {
          deletedAt: null,
          archivedAt: null,
          isPublished: true,
        },
        student: {
          deletedAt: null,
          archivedAt: null,
          isActive: true,
        },
      },
      orderBy: [
        { assessment: { assessmentDate: "desc" } },
        { score: "desc" },
      ],
      take: HOMEPAGE_FEATURED_RESULT_LIMIT,
      select: {
        id: true,
        score: true,
        scaledScore: true,
        rankSchool: true,
        rankCity: true,
        rankProvince: true,
        rankCountry: true,
        percentile: true,
        growth: true,
        isFeatured: true,
        student: {
          select: {
            fullName: true,
            slug: true,
            grade: { select: { name: true } },
          },
        },
        assessment: {
          select: {
            title: true,
            slug: true,
            assessmentDate: true,
            schoolYear: true,
            assessmentType: true,
            provider: { select: { name: true, color: true } },
          },
        },
      },
    });

    return rows.map(mapPublicResultCard);
  } catch {
    return [];
  }
}

export async function loadPublicAssessmentHistoryForStudent(
  studentId: string,
): Promise<PublicAssessmentResultCard[]> {
  const organization = await getCurrentOrganization();
  if (!organization) return [];

  const rows = await prisma.assessmentResult.findMany({
    where: {
      organizationId: organization.id,
      studentId,
      deletedAt: null,
      assessment: {
        deletedAt: null,
        archivedAt: null,
        isPublished: true,
      },
    },
    orderBy: [
      { assessment: { assessmentDate: "desc" } },
      { createdAt: "desc" },
    ],
    select: {
      id: true,
      score: true,
      scaledScore: true,
      rankSchool: true,
      rankCity: true,
      rankProvince: true,
      rankCountry: true,
      percentile: true,
      growth: true,
      isFeatured: true,
      student: {
        select: {
          fullName: true,
          slug: true,
          grade: { select: { name: true } },
        },
      },
      assessment: {
        select: {
          title: true,
          slug: true,
          assessmentDate: true,
          schoolYear: true,
          assessmentType: true,
          provider: { select: { name: true, color: true } },
        },
      },
      subjectResults: {
        select: {
          percentage: true,
          subject: { select: { name: true, shortName: true } },
        },
        orderBy: { subject: { displayOrder: "asc" } },
      },
    },
  });

  return rows.map(mapPublicResultCard);
}

function mapPublicResultCard(row: {
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
  student: {
    fullName: string;
    slug: string;
    grade: { name: string };
  };
  assessment: {
    title: string;
    slug: string;
    assessmentDate: Date | null;
    schoolYear: string | null;
    assessmentType: keyof typeof ASSESSMENT_TYPE_LABELS;
    provider: { name: string; color: string | null };
  };
}): PublicAssessmentResultCard {
  return {
    id: row.id,
    score: row.score,
    scaledScore: row.scaledScore,
    rankSchool: row.rankSchool,
    rankCity: row.rankCity,
    rankProvince: row.rankProvince,
    rankCountry: row.rankCountry,
    percentile: row.percentile,
    growth: row.growth,
    isFeatured: row.isFeatured,
    studentName: row.student.fullName,
    studentSlug: row.student.slug,
    gradeName: row.student.grade.name,
    assessmentTitle: row.assessment.title,
    assessmentSlug: row.assessment.slug,
    assessmentDate: row.assessment.assessmentDate,
    schoolYear: row.assessment.schoolYear,
    providerName: row.assessment.provider.name,
    providerColor: row.assessment.provider.color,
    assessmentTypeLabel: ASSESSMENT_TYPE_LABELS[row.assessment.assessmentType],
  };
}
