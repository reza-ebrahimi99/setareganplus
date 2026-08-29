/**
 * Subject-scoped analytics.
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
  summarizeMetrics,
} from "@/lib/assessment/analytics/helpers";
import type {
  SubjectStatistics,
  SubjectTrendPoint,
} from "@/lib/assessment/analytics/types";

/**
 * Purpose: overall percentage metrics for one subject across assessments.
 * @param organizationId Organization scope (required).
 * @param subjectId Target subject id.
 * @returns `SubjectStatistics` DTO, or `null` when the subject is missing in-scope.
 */
export async function getSubjectStatistics(
  organizationId: string,
  subjectId: string,
): Promise<SubjectStatistics | null> {
  const orgId = requireOrganizationId(organizationId);
  const id = requireEntityId("subjectId", subjectId);

  return withAnalyticsCache(
    ["analytics", "subjectStatistics", orgId, id],
    async () => {
      const subject = await prisma.subject.findFirst({
        where: { id, organizationId: orgId, deletedAt: null },
        select: { id: true, name: true, slug: true },
      });
      if (!subject) return null;

      const rows = await prisma.assessmentSubjectResult.findMany({
        where: {
          subjectId: id,
          percentage: { not: null },
          assessmentResult: {
            organizationId: orgId,
            deletedAt: null,
            assessment: { deletedAt: null, archivedAt: null },
          },
        },
        select: {
          percentage: true,
          assessmentResult: {
            select: {
              studentId: true,
              assessmentId: true,
            },
          },
        },
      });

      const percentages = finiteNumbers(rows.map((row) => row.percentage));
      const studentIds = new Set(rows.map((row) => row.assessmentResult.studentId));
      const assessmentIds = new Set(
        rows.map((row) => row.assessmentResult.assessmentId),
      );

      return {
        organizationId: orgId,
        subjectId: subject.id,
        subjectName: subject.name,
        subjectSlug: subject.slug,
        sampleCount: percentages.length,
        assessmentCount: assessmentIds.size,
        studentCount: studentIds.size,
        percentageMetrics:
          percentages.length > 0
            ? summarizeMetrics(percentages)
            : emptyMetricSummary(),
        distribution: buildDistribution(percentages, {
          min: 0,
          max: 100,
          bucketCount: 5,
        }),
      };
    },
  );
}

/**
 * Purpose: average subject percentage over time (per assessment).
 * @param organizationId Organization scope (required).
 * @param subjectId Target subject id.
 * @returns Chronological `SubjectTrendPoint[]` (oldest → newest). Empty when none / missing subject.
 */
export async function getSubjectTrend(
  organizationId: string,
  subjectId: string,
): Promise<SubjectTrendPoint[]> {
  const orgId = requireOrganizationId(organizationId);
  const id = requireEntityId("subjectId", subjectId);

  return withAnalyticsCache(
    ["analytics", "subjectTrend", orgId, id],
    async () => {
      const subject = await prisma.subject.findFirst({
        where: { id, organizationId: orgId, deletedAt: null },
        select: { id: true },
      });
      if (!subject) return [];

      const rows = await prisma.assessmentSubjectResult.findMany({
        where: {
          subjectId: id,
          percentage: { not: null },
          assessmentResult: {
            organizationId: orgId,
            deletedAt: null,
            assessment: { deletedAt: null, archivedAt: null },
          },
        },
        select: {
          percentage: true,
          assessmentResult: {
            select: {
              assessment: {
                select: {
                  id: true,
                  title: true,
                  assessmentDate: true,
                  schoolYear: true,
                },
              },
            },
          },
        },
      });

      const map = new Map<
        string,
        {
          title: string;
          assessmentDate: Date | null;
          schoolYear: string | null;
          values: number[];
        }
      >();

      for (const row of rows) {
        if (row.percentage == null) continue;
        const assessment = row.assessmentResult.assessment;
        const current = map.get(assessment.id) ?? {
          title: assessment.title,
          assessmentDate: assessment.assessmentDate,
          schoolYear: assessment.schoolYear,
          values: [],
        };
        current.values.push(row.percentage);
        map.set(assessment.id, current);
      }

      return Array.from(map.entries())
        .map(([assessmentId, value]) => ({
          assessmentId,
          assessmentTitle: value.title,
          assessmentDate: value.assessmentDate,
          schoolYear: value.schoolYear,
          sampleCount: value.values.length,
          averagePercentage: summarizeMetrics(value.values).average,
        }))
        .sort((a, b) => {
          const timeA = a.assessmentDate?.getTime() ?? 0;
          const timeB = b.assessmentDate?.getTime() ?? 0;
          return timeA - timeB;
        });
    },
  );
}
