/**
 * Ranking analytics.
 */

import { prisma } from "@/lib/prisma";
import { withAnalyticsCache } from "@/lib/assessment/analytics/cache";
import {
  requireEntityId,
  requireOrganizationId,
} from "@/lib/assessment/analytics/errors";
import type { RankingRow } from "@/lib/assessment/analytics/types";

function compareRankingRows(
  a: {
    score: number | null;
    scaledScore: number | null;
    percentile: number | null;
    createdAt: Date;
  },
  b: {
    score: number | null;
    scaledScore: number | null;
    percentile: number | null;
    createdAt: Date;
  },
): number {
  const scoreA = a.score ?? Number.NEGATIVE_INFINITY;
  const scoreB = b.score ?? Number.NEGATIVE_INFINITY;
  if (scoreB !== scoreA) return scoreB - scoreA;

  const scaledA = a.scaledScore ?? Number.NEGATIVE_INFINITY;
  const scaledB = b.scaledScore ?? Number.NEGATIVE_INFINITY;
  if (scaledB !== scaledA) return scaledB - scaledA;

  const pctA = a.percentile ?? Number.NEGATIVE_INFINITY;
  const pctB = b.percentile ?? Number.NEGATIVE_INFINITY;
  if (pctB !== pctA) return pctB - pctA;

  return a.createdAt.getTime() - b.createdAt.getTime();
}

/**
 * Purpose: compute in-assessment ranking without relying solely on stored rank fields.
 * @param organizationId Organization scope (required).
 * @param assessmentId Target assessment id.
 * @param limit Max rows (default 50, max 200).
 * @returns `RankingRow[]` — empty when assessment is out of scope or has no results.
 */
export async function getAssessmentRanking(
  organizationId: string,
  assessmentId: string,
  limit = 50,
): Promise<RankingRow[]> {
  const orgId = requireOrganizationId(organizationId);
  const id = requireEntityId("assessmentId", assessmentId);
  const take = Math.min(Math.max(1, limit), 200);

  return withAnalyticsCache(
    ["analytics", "assessmentRanking", orgId, id, take],
    async () => {
      const assessment = await prisma.assessment.findFirst({
        where: {
          id,
          organizationId: orgId,
          deletedAt: null,
          archivedAt: null,
        },
        select: { id: true },
      });
      if (!assessment) return [];

      const results = await prisma.assessmentResult.findMany({
        where: {
          organizationId: orgId,
          assessmentId: id,
          deletedAt: null,
          student: {
            deletedAt: null,
            archivedAt: null,
            isActive: true,
          },
        },
        select: {
          id: true,
          score: true,
          scaledScore: true,
          percentile: true,
          rankSchool: true,
          rankCity: true,
          rankProvince: true,
          rankCountry: true,
          isFeatured: true,
          createdAt: true,
          student: {
            select: {
              id: true,
              fullName: true,
              slug: true,
              gradeId: true,
              grade: { select: { id: true, name: true } },
            },
          },
        },
      });

      const sorted = [...results].sort(compareRankingRows).slice(0, take);

      return sorted.map((row, index) => ({
        rank: index + 1,
        resultId: row.id,
        studentId: row.student.id,
        studentName: row.student.fullName,
        studentSlug: row.student.slug,
        gradeId: row.student.grade.id,
        gradeName: row.student.grade.name,
        score: row.score,
        scaledScore: row.scaledScore,
        percentile: row.percentile,
        rankSchool: row.rankSchool,
        rankCity: row.rankCity,
        rankProvince: row.rankProvince,
        rankCountry: row.rankCountry,
        isFeatured: row.isFeatured,
      }));
    },
  );
}
