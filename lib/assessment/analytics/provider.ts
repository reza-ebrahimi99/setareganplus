/**
 * Provider-scoped analytics (Qalamchi, school exams, olympiads, …).
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
import type { ProviderStatistics } from "@/lib/assessment/analytics/types";

/**
 * Purpose: aggregate performance across all assessments of one provider.
 * @param organizationId Organization scope (required).
 * @param providerId Target provider id.
 * @returns `ProviderStatistics` DTO, or `null` when the provider is missing in-scope.
 */
export async function getProviderStatistics(
  organizationId: string,
  providerId: string,
): Promise<ProviderStatistics | null> {
  const orgId = requireOrganizationId(organizationId);
  const id = requireEntityId("providerId", providerId);

  return withAnalyticsCache(
    ["analytics", "providerStatistics", orgId, id],
    async () => {
      const provider = await prisma.assessmentProvider.findFirst({
        where: { id, organizationId: orgId, deletedAt: null },
        select: { id: true, name: true, slug: true },
      });
      if (!provider) return null;

      const [assessmentCount, results, declaredParticipants] =
        await Promise.all([
          prisma.assessment.count({
            where: {
              organizationId: orgId,
              providerId: id,
              deletedAt: null,
              archivedAt: null,
            },
          }),
          prisma.assessmentResult.findMany({
            where: {
              organizationId: orgId,
              deletedAt: null,
              assessment: {
                providerId: id,
                deletedAt: null,
                archivedAt: null,
              },
            },
            select: { score: true, studentId: true },
          }),
          prisma.assessment.aggregate({
            where: {
              organizationId: orgId,
              providerId: id,
              deletedAt: null,
              archivedAt: null,
              participants: { not: null },
            },
            _sum: { participants: true },
          }),
        ]);

      const scores = finiteNumbers(results.map((row) => row.score));
      const resultCount = results.length;
      const declared = declaredParticipants._sum.participants ?? 0;
      const studentCount = new Set(results.map((row) => row.studentId)).size;

      return {
        organizationId: orgId,
        providerId: provider.id,
        providerName: provider.name,
        providerSlug: provider.slug,
        assessmentCount,
        resultCount,
        studentCount,
        scoreMetrics:
          scores.length > 0 ? summarizeMetrics(scores) : emptyMetricSummary(),
        participationRate: safeDivide(resultCount, declared),
        completionRate: safeDivide(scores.length, resultCount),
        distribution: buildDistribution(scores, { bucketCount: 5 }),
      };
    },
  );
}
