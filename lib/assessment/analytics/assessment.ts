/**
 * Assessment-scoped analytics.
 */

import { prisma } from "@/lib/prisma";
import { withAnalyticsCache } from "@/lib/assessment/analytics/cache";
import {
  requireEntityId,
  requireOrganizationId,
} from "@/lib/assessment/analytics/errors";
import {
  buildDistribution,
  emptyMetricSummary,
  finiteNumbers,
  safeDivide,
  summarizeMetrics,
} from "@/lib/assessment/analytics/helpers";
import { getAssessmentRanking } from "@/lib/assessment/analytics/ranking";
import type {
  AssessmentOverview,
  AssessmentStatistics,
  RankingRow,
} from "@/lib/assessment/analytics/types";

async function loadAssessmentHeader(
  organizationId: string,
  assessmentId: string,
) {
  return prisma.assessment.findFirst({
    where: {
      id: assessmentId,
      organizationId,
      deletedAt: null,
      archivedAt: null,
    },
    select: {
      id: true,
      title: true,
      slug: true,
      assessmentType: true,
      assessmentDate: true,
      schoolYear: true,
      participants: true,
      maxScore: true,
      isPublished: true,
      provider: { select: { id: true, name: true } },
      grade: { select: { id: true, name: true } },
    },
  });
}

/**
 * Purpose: full overview for one assessment (metrics, rates, distribution).
 * @param organizationId Organization scope (required).
 * @param assessmentId Target assessment id.
 * @returns `AssessmentOverview` DTO, or `null` when missing in-scope.
 */
export async function getAssessmentOverview(
  organizationId: string,
  assessmentId: string,
): Promise<AssessmentOverview | null> {
  const orgId = requireOrganizationId(organizationId);
  const id = requireEntityId("assessmentId", assessmentId);

  return withAnalyticsCache(
    ["analytics", "assessmentOverview", orgId, id],
    async () => {
      const assessment = await loadAssessmentHeader(orgId, id);
      if (!assessment) return null;

      const [results, featuredCount] = await Promise.all([
        prisma.assessmentResult.findMany({
          where: {
            organizationId: orgId,
            assessmentId: id,
            deletedAt: null,
          },
          select: {
            score: true,
            scaledScore: true,
            percentile: true,
          },
        }),
        prisma.assessmentResult.count({
          where: {
            organizationId: orgId,
            assessmentId: id,
            deletedAt: null,
            isFeatured: true,
          },
        }),
      ]);

      const scores = finiteNumbers(results.map((row) => row.score));
      const scaled = finiteNumbers(results.map((row) => row.scaledScore));
      const percentiles = finiteNumbers(results.map((row) => row.percentile));
      const resultCount = results.length;

      return {
        organizationId: orgId,
        assessmentId: assessment.id,
        title: assessment.title,
        slug: assessment.slug,
        providerId: assessment.provider.id,
        providerName: assessment.provider.name,
        gradeId: assessment.grade.id,
        gradeName: assessment.grade.name,
        assessmentType: assessment.assessmentType,
        assessmentDate: assessment.assessmentDate,
        schoolYear: assessment.schoolYear,
        declaredParticipants: assessment.participants,
        maxScore: assessment.maxScore,
        isPublished: assessment.isPublished,
        resultCount,
        featuredCount,
        participationRate: safeDivide(
          resultCount,
          assessment.participants ?? 0,
        ),
        completionRate: safeDivide(scores.length, resultCount),
        scoreMetrics:
          scores.length > 0 ? summarizeMetrics(scores) : emptyMetricSummary(),
        scaledScoreMetrics:
          scaled.length > 0 ? summarizeMetrics(scaled) : emptyMetricSummary(),
        percentileMetrics:
          percentiles.length > 0
            ? summarizeMetrics(percentiles)
            : emptyMetricSummary(),
        distribution: buildDistribution(scores, {
          min: 0,
          max: assessment.maxScore && assessment.maxScore > 0
            ? assessment.maxScore
            : undefined,
          bucketCount: 5,
        }),
      };
    },
  );
}

/**
 * Purpose: alias of overview for callers that expect a statistics DTO name.
 * @param organizationId Organization scope (required).
 * @param assessmentId Target assessment id.
 * @returns `AssessmentStatistics` DTO, or `null` when missing in-scope.
 */
export async function getAssessmentStatistics(
  organizationId: string,
  assessmentId: string,
): Promise<AssessmentStatistics | null> {
  return getAssessmentOverview(organizationId, assessmentId);
}

/**
 * Purpose: ranked student list for an assessment.
 * @param organizationId Organization scope (required).
 * @param assessmentId Target assessment id.
 * @param limit Max rows (default 50, max 200).
 * @returns `RankingRow[]` ordered best → worst. Empty when assessment missing / no results.
 */
export async function getAssessmentRankingRows(
  organizationId: string,
  assessmentId: string,
  limit = 50,
): Promise<RankingRow[]> {
  return getAssessmentRanking(organizationId, assessmentId, limit);
}
