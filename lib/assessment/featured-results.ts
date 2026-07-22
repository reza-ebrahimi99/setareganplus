/**
 * Featured assessment results — selection ranking and public publication gates.
 * Provider-agnostic. Full subject reports remain portal-only.
 */

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { toLatinDigits } from "@/lib/forms/latin-digits";
import { publicLibraryUrl } from "@/lib/media/library-image";
import { ASSESSMENT_TYPE_LABELS } from "@/lib/assessment/types";
import type { PublicAssessmentResultCard } from "@/lib/assessment/results";
import {
  FEATURED_RESULTS_LIMIT_DEFAULT,
  FEATURED_RESULTS_LIMIT_MAX,
  FEATURED_RESULTS_LIMIT_MIN,
} from "@/lib/assessment/featured-constants";

export {
  FEATURED_RESULTS_LIMIT_DEFAULT,
  FEATURED_RESULTS_LIMIT_MAX,
  FEATURED_RESULTS_LIMIT_MIN,
} from "@/lib/assessment/featured-constants";

export type FeaturedActionResult =
  | { ok: true; message: string; featuredCount: number }
  | { ok: false; message: string };

/** Public-safe top result row for assessment detail pages. */
export type PublicAssessmentTopResult = {
  id: string;
  rank: number;
  score: number;
  firstName: string;
  lastName: string;
  fullName: string;
  gradeId: string;
  gradeName: string;
  studentPortraitUrl: string | null;
};

export type PublicAssessmentTopResultsByGrade = {
  gradeId: string;
  gradeName: string;
  gradeSortOrder: number;
  results: PublicAssessmentTopResult[];
};

export type RankablePublicResult = {
  id: string;
  score: number;
  fullName: string;
  firstName: string;
  lastName: string;
  gradeId: string;
  gradeName: string;
  gradeSortOrder: number;
  studentPortraitUrl: string | null;
};

/** Normalize a student name for deterministic tie-breaking. */
export function normalizeFullNameForSort(fullName: string): string {
  return toLatinDigits(fullName)
    .trim()
    .toLocaleLowerCase("fa")
    .replace(/\s+/g, " ");
}

/**
 * Group by student grade, sort by score desc / name asc / id asc,
 * then take exactly `limit` per grade (or fewer when a grade has fewer rows).
 */
export function selectTopResultsPerGrade(
  rows: RankablePublicResult[],
  limit: number,
): PublicAssessmentTopResultsByGrade[] {
  const cappedLimit = Math.min(
    Math.max(limit, FEATURED_RESULTS_LIMIT_MIN),
    FEATURED_RESULTS_LIMIT_MAX,
  );

  const byGrade = new Map<string, RankablePublicResult[]>();
  for (const row of rows) {
    const bucket = byGrade.get(row.gradeId);
    if (bucket) {
      bucket.push(row);
    } else {
      byGrade.set(row.gradeId, [row]);
    }
  }

  const groups: PublicAssessmentTopResultsByGrade[] = [];

  for (const [gradeId, gradeRows] of byGrade) {
    gradeRows.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const nameCmp = normalizeFullNameForSort(a.fullName).localeCompare(
        normalizeFullNameForSort(b.fullName),
        "fa",
      );
      if (nameCmp !== 0) return nameCmp;
      return a.id.localeCompare(b.id);
    });

    const top = gradeRows.slice(0, cappedLimit);
    if (top.length === 0) continue;

    groups.push({
      gradeId,
      gradeName: top[0].gradeName,
      gradeSortOrder: top[0].gradeSortOrder,
      results: top.map((row, index) => ({
        id: row.id,
        rank: index + 1,
        score: row.score,
        firstName: row.firstName,
        lastName: row.lastName,
        fullName: row.fullName,
        gradeId: row.gradeId,
        gradeName: row.gradeName,
        studentPortraitUrl: row.studentPortraitUrl,
      })),
    });
  }

  groups.sort((a, b) => {
    if (a.gradeSortOrder !== b.gradeSortOrder) {
      return a.gradeSortOrder - b.gradeSortOrder;
    }
    return a.gradeName.localeCompare(b.gradeName, "fa");
  });

  return groups;
}

export function parseFeaturedResultsLimit(raw: string | number | null | undefined): {
  ok: true;
  value: number;
} | {
  ok: false;
  message: string;
} {
  const parsed =
    typeof raw === "number"
      ? raw
      : Number.parseInt(String(raw ?? "").trim(), 10);

  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    return {
      ok: false,
      message: "تعداد برترین‌ها باید عدد صحیح باشد.",
    };
  }
  if (parsed < FEATURED_RESULTS_LIMIT_MIN || parsed > FEATURED_RESULTS_LIMIT_MAX) {
    return {
      ok: false,
      message: `تعداد برترین‌ها باید بین ${FEATURED_RESULTS_LIMIT_MIN} تا ${FEATURED_RESULTS_LIMIT_MAX} باشد.`,
    };
  }
  return { ok: true, value: parsed };
}

/** Prisma order for top featured selection (nulls last). */
export const FEATURED_RANKING_ORDER = [
  { scaledScore: { sort: "desc" as const, nulls: "last" as const } },
  { rankSchool: { sort: "asc" as const, nulls: "last" as const } },
  { score: { sort: "desc" as const, nulls: "last" as const } },
  { id: "asc" as const },
];

const eligibleResultWhere = (
  organizationId: string,
  assessmentId: string,
): Prisma.AssessmentResultWhereInput => ({
  organizationId,
  assessmentId,
  deletedAt: null,
  student: {
    deletedAt: null,
    archivedAt: null,
    isActive: true,
  },
});

/**
 * Clear isFeatured for this assessment, then mark top N eligible results.
 */
export async function autoSelectFeaturedResults(params: {
  organizationId: string;
  assessmentId: string;
  limit?: number;
}): Promise<FeaturedActionResult> {
  const assessment = await prisma.assessment.findFirst({
    where: {
      id: params.assessmentId,
      organizationId: params.organizationId,
      deletedAt: null,
    },
    select: {
      id: true,
      featuredResultsLimit: true,
    },
  });

  if (!assessment) {
    return { ok: false, message: "آزمون یافت نشد." };
  }

  const limitParse = parseFeaturedResultsLimit(
    params.limit ?? assessment.featuredResultsLimit,
  );
  if (!limitParse.ok) {
    return { ok: false, message: limitParse.message };
  }
  const limit = limitParse.value;

  const featuredCount = await prisma.$transaction(async (tx) => {
    await tx.assessmentResult.updateMany({
      where: {
        organizationId: params.organizationId,
        assessmentId: assessment.id,
        isFeatured: true,
      },
      data: { isFeatured: false },
    });

    const top = await tx.assessmentResult.findMany({
      where: eligibleResultWhere(params.organizationId, assessment.id),
      orderBy: FEATURED_RANKING_ORDER,
      take: limit,
      select: { id: true },
    });

    if (top.length > 0) {
      await tx.assessmentResult.updateMany({
        where: {
          organizationId: params.organizationId,
          id: { in: top.map((row) => row.id) },
        },
        data: { isFeatured: true },
      });
    }

    return top.length;
  });

  return {
    ok: true,
    featuredCount,
    message:
      featuredCount === 0
        ? "نتیجه واجد شرایطی برای انتخاب یافت نشد."
        : `${featuredCount} نتیجه به‌عنوان برترین انتخاب شد.`,
  };
}

export async function setAssessmentResultFeatured(params: {
  organizationId: string;
  resultId: string;
  isFeatured: boolean;
}): Promise<FeaturedActionResult> {
  const result = await prisma.assessmentResult.findFirst({
    where: {
      id: params.resultId,
      organizationId: params.organizationId,
      deletedAt: null,
    },
    select: {
      id: true,
      isFeatured: true,
      student: {
        select: {
          isActive: true,
          deletedAt: true,
          archivedAt: true,
        },
      },
    },
  });

  if (!result) {
    return { ok: false, message: "نتیجه یافت نشد." };
  }

  if (
    params.isFeatured &&
    (result.student.deletedAt != null ||
      result.student.archivedAt != null ||
      !result.student.isActive)
  ) {
    return {
      ok: false,
      message: "فقط نتایج دانش‌آموزان فعال قابل انتخاب به‌عنوان برترین هستند.",
    };
  }

  if (result.isFeatured === params.isFeatured) {
    return {
      ok: true,
      featuredCount: params.isFeatured ? 1 : 0,
      message: params.isFeatured
        ? "این نتیجه از قبل در فهرست برترین‌ها بود."
        : "این نتیجه در فهرست برترین‌ها نبود.",
    };
  }

  await prisma.assessmentResult.update({
    where: { id: result.id },
    data: { isFeatured: params.isFeatured },
  });

  return {
    ok: true,
    featuredCount: params.isFeatured ? 1 : 0,
    message: params.isFeatured
      ? "نتیجه به فهرست برترین‌ها اضافه شد."
      : "نتیجه از فهرست برترین‌ها حذف شد.",
  };
}

/** Gates required for any public featured result exposure. */
export function publicFeaturedAssessmentWhere(
  organizationId: string,
): Prisma.AssessmentWhereInput {
  return {
    organizationId,
    deletedAt: null,
    archivedAt: null,
    isPublished: true,
    publishFeaturedResults: true,
    provider: { deletedAt: null, archivedAt: null, isActive: true },
    grade: { deletedAt: null, archivedAt: null, isActive: true },
  };
}

export async function countFeaturedResultsForAssessment(
  organizationId: string,
  assessmentId: string,
): Promise<number> {
  return prisma.assessmentResult.count({
    where: {
      organizationId,
      assessmentId,
      deletedAt: null,
      isFeatured: true,
    },
  });
}

/**
 * Public top-N-per-grade results for one assessment.
 * Computed dynamically from scores — does not require `isFeatured`.
 * Returns [] when publishing gates fail or the assessment is unavailable.
 */
export async function getPublicAssessmentTopResults(params: {
  organizationId: string;
  assessmentId: string;
  /** Override stored limit; defaults to assessment.featuredResultsLimit (else 3). */
  limit?: number;
}): Promise<PublicAssessmentTopResultsByGrade[]> {
  const assessment = await prisma.assessment.findFirst({
    where: {
      id: params.assessmentId,
      ...publicFeaturedAssessmentWhere(params.organizationId),
    },
    select: {
      id: true,
      featuredResultsLimit: true,
    },
  });

  if (!assessment) return [];

  const limitParse = parseFeaturedResultsLimit(
    params.limit ??
      assessment.featuredResultsLimit ??
      FEATURED_RESULTS_LIMIT_DEFAULT,
  );
  const limit = limitParse.ok
    ? limitParse.value
    : FEATURED_RESULTS_LIMIT_DEFAULT;

  const rows = await prisma.assessmentResult.findMany({
    where: {
      organizationId: params.organizationId,
      assessmentId: assessment.id,
      deletedAt: null,
      score: { not: null },
      student: {
        deletedAt: null,
        archivedAt: null,
        isActive: true,
        grade: {
          deletedAt: null,
          archivedAt: null,
          isActive: true,
        },
      },
    },
    select: {
      id: true,
      score: true,
      student: {
        select: {
          firstName: true,
          lastName: true,
          fullName: true,
          gradeId: true,
          grade: {
            select: {
              id: true,
              name: true,
              sortOrder: true,
            },
          },
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
  });

  const rankable: RankablePublicResult[] = [];
  for (const row of rows) {
    if (row.score == null) continue;
    const portrait =
      row.student.portraitMedia &&
      row.student.portraitMedia.deletedAt == null &&
      row.student.portraitMedia.status === "ACTIVE"
        ? publicLibraryUrl(row.student.portraitMedia.storageKey)
        : null;

    rankable.push({
      id: row.id,
      score: row.score,
      firstName: row.student.firstName,
      lastName: row.student.lastName,
      fullName: row.student.fullName,
      gradeId: row.student.grade.id,
      gradeName: row.student.grade.name,
      gradeSortOrder: row.student.grade.sortOrder,
      studentPortraitUrl: portrait,
    });
  }

  return selectTopResultsPerGrade(rankable, limit);
}

/**
 * Safe public DTO loader for featured results.
 * Never includes subject results, notes, or portal-only fields.
 */
export async function loadPublicFeaturedAssessmentResults(options?: {
  organizationId?: string;
  assessmentId?: string;
  providerSlug?: string;
  limit?: number;
}): Promise<PublicAssessmentResultCard[]> {
  let organizationId = options?.organizationId;
  if (!organizationId) {
    try {
      const { getCurrentOrganization } = await import(
        "@/lib/organizations/get-current-organization"
      );
      organizationId = (await getCurrentOrganization()).id;
    } catch {
      return [];
    }
  }

  const limit = Math.min(
    Math.max(options?.limit ?? 24, 1),
    48,
  );

  const rows = await prisma.assessmentResult.findMany({
    where: {
      organizationId,
      deletedAt: null,
      isFeatured: true,
      ...(options?.assessmentId ? { assessmentId: options.assessmentId } : {}),
      student: {
        deletedAt: null,
        archivedAt: null,
        isActive: true,
      },
      assessment: {
        ...publicFeaturedAssessmentWhere(organizationId),
        ...(options?.assessmentId ? { id: options.assessmentId } : {}),
        ...(options?.providerSlug
          ? { provider: { slug: options.providerSlug, deletedAt: null, archivedAt: null, isActive: true } }
          : {}),
      },
    },
    orderBy: [
      { assessment: { assessmentDate: "desc" } },
      ...FEATURED_RANKING_ORDER,
    ],
    take: limit,
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
          portraitMedia: {
            select: {
              storageKey: true,
              deletedAt: true,
              status: true,
            },
          },
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

  return rows.map((row) => {
    const portrait =
      row.student.portraitMedia &&
      row.student.portraitMedia.deletedAt == null &&
      row.student.portraitMedia.status === "ACTIVE"
        ? publicLibraryUrl(row.student.portraitMedia.storageKey)
        : null;

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
      studentPortraitUrl: portrait,
      gradeName: row.student.grade.name,
      assessmentTitle: row.assessment.title,
      assessmentSlug: row.assessment.slug,
      assessmentDate: row.assessment.assessmentDate,
      schoolYear: row.assessment.schoolYear,
      providerName: row.assessment.provider.name,
      providerColor: row.assessment.provider.color,
      assessmentTypeLabel: ASSESSMENT_TYPE_LABELS[row.assessment.assessmentType],
    };
  });
}
