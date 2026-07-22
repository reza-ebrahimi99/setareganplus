import type { AssessmentType, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";
import { ensureDefaultAssessmentProviders } from "@/lib/assessment/providers";
import { ASSESSMENT_TYPE_LABELS } from "@/lib/assessment/types";
import { listPublicAssessmentProviders } from "@/lib/assessment/providers";
import { publicLibraryUrl } from "@/lib/media/library-image";

export { listPublicAssessmentProviders };
export { ASSESSMENT_TYPE_LABELS };

export const ADMIN_ASSESSMENT_PAGE_SIZE = 30;
export const PUBLIC_ASSESSMENT_PAGE_SIZE = 24;

export async function listAdminAssessments(
  organizationId: string,
  options?: {
    page?: number;
    q?: string;
    providerId?: string;
    gradeId?: string;
    assessmentType?: AssessmentType | "";
    schoolYear?: string;
    published?: "all" | "yes" | "no";
  },
) {
  await ensureDefaultAssessmentProviders(organizationId);

  const q = options?.q?.trim() ?? "";
  const where: Prisma.AssessmentWhereInput = {
    organizationId,
    deletedAt: null,
    ...(options?.providerId ? { providerId: options.providerId } : {}),
    ...(options?.gradeId ? { gradeId: options.gradeId } : {}),
    ...(options?.assessmentType ? { assessmentType: options.assessmentType } : {}),
    ...(options?.schoolYear ? { schoolYear: options.schoolYear } : {}),
    ...(options?.published === "yes"
      ? { isPublished: true }
      : options?.published === "no"
        ? { isPublished: false }
        : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { slug: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const total = await prisma.assessment.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / ADMIN_ASSESSMENT_PAGE_SIZE));
  const requested = options?.page && options.page > 0 ? options.page : 1;
  const page = Math.min(requested, pageCount);

  const assessments = await prisma.assessment.findMany({
    where,
    orderBy: [{ assessmentDate: "desc" }, { createdAt: "desc" }],
    skip: (page - 1) * ADMIN_ASSESSMENT_PAGE_SIZE,
    take: ADMIN_ASSESSMENT_PAGE_SIZE,
    select: {
      id: true,
      title: true,
      slug: true,
      assessmentType: true,
      assessmentDate: true,
      schoolYear: true,
      participants: true,
      isPublished: true,
      archivedAt: true,
      provider: { select: { id: true, name: true, color: true } },
      grade: { select: { id: true, name: true } },
      _count: { select: { results: { where: { deletedAt: null } } } },
    },
  });

  return { assessments, total, page, pageCount, pageSize: ADMIN_ASSESSMENT_PAGE_SIZE };
}

export async function listAdminAssessmentOptions(organizationId: string) {
  return prisma.assessment.findMany({
    where: { organizationId, deletedAt: null },
    orderBy: [{ assessmentDate: "desc" }, { createdAt: "desc" }],
    take: 500,
    select: {
      id: true,
      title: true,
      schoolYear: true,
      provider: { select: { name: true } },
    },
  });
}

export async function loadAdminAssessment(
  organizationId: string,
  assessmentId: string,
) {
  const assessment = await prisma.assessment.findFirst({
    where: { id: assessmentId, organizationId, deletedAt: null },
    select: {
      id: true,
      providerId: true,
      gradeId: true,
      title: true,
      slug: true,
      assessmentType: true,
      assessmentDate: true,
      schoolYear: true,
      participants: true,
      maxScore: true,
      description: true,
      isPublished: true,
      publishFeaturedResults: true,
      featuredResultsLimit: true,
      archivedAt: true,
      provider: { select: { id: true, name: true, slug: true } },
      grade: { select: { id: true, name: true, slug: true } },
      _count: {
        select: {
          results: { where: { deletedAt: null } },
        },
      },
    },
  });

  if (!assessment) return null;

  const featuredCount = await prisma.assessmentResult.count({
    where: {
      organizationId,
      assessmentId: assessment.id,
      deletedAt: null,
      isFeatured: true,
    },
  });

  return { ...assessment, featuredCount };
}

export type PublicAssessmentCard = {
  id: string;
  slug: string;
  title: string;
  assessmentType: AssessmentType;
  assessmentTypeLabel: string;
  assessmentDate: Date | null;
  schoolYear: string | null;
  participants: number | null;
  providerName: string;
  providerSlug: string;
  providerColor: string | null;
  gradeName: string;
  gradeSlug: string;
  resultCount: number;
};

function publicAssessmentWhere(
  organizationId: string,
  filters?: {
    providerSlug?: string;
    gradeSlug?: string;
    assessmentType?: AssessmentType;
    schoolYear?: string;
    q?: string;
  },
) {
  const q = filters?.q?.trim() ?? "";
  return {
    organizationId,
    deletedAt: null,
    archivedAt: null,
    isPublished: true,
    provider: {
      deletedAt: null,
      archivedAt: null,
      isActive: true,
      ...(filters?.providerSlug ? { slug: filters.providerSlug } : {}),
    },
    grade: {
      deletedAt: null,
      archivedAt: null,
      isActive: true,
      ...(filters?.gradeSlug ? { slug: filters.gradeSlug } : {}),
    },
    ...(filters?.assessmentType
      ? { assessmentType: filters.assessmentType }
      : {}),
    ...(filters?.schoolYear ? { schoolYear: filters.schoolYear } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { description: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
}

export async function loadPublicAssessmentPage(filters?: {
  providerSlug?: string;
  gradeSlug?: string;
  assessmentType?: AssessmentType;
  schoolYear?: string;
  q?: string;
  page?: number;
}) {
  const organization = await getCurrentOrganization();
  if (!organization) return null;

  const where = publicAssessmentWhere(organization.id, filters);
  const pageSize = PUBLIC_ASSESSMENT_PAGE_SIZE;
  const [total, schoolYearRows] = await Promise.all([
    prisma.assessment.count({ where }),
    prisma.assessment.findMany({
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

  const rows = await prisma.assessment.findMany({
    where,
    orderBy: [{ assessmentDate: "desc" }, { createdAt: "desc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: {
      id: true,
      slug: true,
      title: true,
      assessmentType: true,
      assessmentDate: true,
      schoolYear: true,
      participants: true,
      provider: { select: { name: true, slug: true, color: true } },
      grade: { select: { name: true, slug: true } },
      _count: { select: { results: { where: { deletedAt: null } } } },
    },
  });

  return {
    assessments: rows.map(
      (row): PublicAssessmentCard => ({
        id: row.id,
        slug: row.slug,
        title: row.title,
        assessmentType: row.assessmentType,
        assessmentTypeLabel: ASSESSMENT_TYPE_LABELS[row.assessmentType],
        assessmentDate: row.assessmentDate,
        schoolYear: row.schoolYear,
        participants: row.participants,
        providerName: row.provider.name,
        providerSlug: row.provider.slug,
        providerColor: row.provider.color,
        gradeName: row.grade.name,
        gradeSlug: row.grade.slug,
        resultCount: row._count.results,
      }),
    ),
    total,
    page,
    pageSize,
    pageCount,
    schoolYears: schoolYearRows
      .map((row) => row.schoolYear)
      .filter((value): value is string => Boolean(value)),
  };
}

export async function loadPublicAssessmentBySlug(slug: string) {
  const organization = await getCurrentOrganization();
  if (!organization) return null;

  const row = await prisma.assessment.findFirst({
    where: {
      organizationId: organization.id,
      slug,
      deletedAt: null,
      archivedAt: null,
      isPublished: true,
      provider: { deletedAt: null, archivedAt: null, isActive: true },
      grade: { deletedAt: null, archivedAt: null, isActive: true },
    },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      assessmentType: true,
      assessmentDate: true,
      schoolYear: true,
      participants: true,
      maxScore: true,
      isPublished: true,
      publishFeaturedResults: true,
      featuredResultsLimit: true,
      provider: { select: { name: true, slug: true, color: true } },
      grade: { select: { name: true, slug: true } },
      results: {
        where: {
          deletedAt: null,
          isFeatured: true,
          student: {
            deletedAt: null,
            archivedAt: null,
            isActive: true,
          },
        },
        orderBy: [
          { scaledScore: { sort: "desc", nulls: "last" } },
          { rankSchool: { sort: "asc", nulls: "last" } },
          { score: { sort: "desc", nulls: "last" } },
          { id: "asc" },
        ],
        take: 12,
        select: {
          id: true,
          score: true,
          scaledScore: true,
          rankSchool: true,
          rankCity: true,
          rankProvince: true,
          rankCountry: true,
          percentile: true,
          student: {
            select: {
              fullName: true,
              slug: true,
              portraitMedia: {
                select: {
                  storageKey: true,
                  deletedAt: true,
                  status: true,
                },
              },
            },
          },
        },
      },
      _count: { select: { results: { where: { deletedAt: null } } } },
    },
  });

  if (!row) return null;

  const featuredResults =
    row.publishFeaturedResults
      ? row.results.map((result) => {
          const portrait =
            result.student.portraitMedia &&
            result.student.portraitMedia.deletedAt == null &&
            result.student.portraitMedia.status === "ACTIVE"
              ? publicLibraryUrl(result.student.portraitMedia.storageKey)
              : null;
          return {
            id: result.id,
            score: result.score,
            scaledScore: result.scaledScore,
            rankSchool: result.rankSchool,
            rankCity: result.rankCity,
            rankProvince: result.rankProvince,
            rankCountry: result.rankCountry,
            percentile: result.percentile,
            studentName: result.student.fullName,
            studentSlug: result.student.slug,
            studentPortraitUrl: portrait,
          };
        })
      : [];

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    assessmentType: row.assessmentType,
    assessmentTypeLabel: ASSESSMENT_TYPE_LABELS[row.assessmentType],
    assessmentDate: row.assessmentDate,
    schoolYear: row.schoolYear,
    participants: row.participants,
    maxScore: row.maxScore,
    isPublished: row.isPublished,
    publishFeaturedResults: row.publishFeaturedResults,
    featuredResultsLimit: row.featuredResultsLimit,
    provider: row.provider,
    grade: row.grade,
    featuredResults,
    _count: row._count,
  };
}
