/**
 * Grade-scoped analytics.
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
import type {
  GradeOverview,
  TopStudentRow,
} from "@/lib/assessment/analytics/types";

/**
 * Purpose: aggregate assessment performance for one grade.
 * @param organizationId Organization scope (required).
 * @param gradeId Target grade id.
 * @returns `GradeOverview` DTO, or `null` when the grade is missing in-scope.
 */
export async function getGradeOverview(
  organizationId: string,
  gradeId: string,
): Promise<GradeOverview | null> {
  const orgId = requireOrganizationId(organizationId);
  const id = requireEntityId("gradeId", gradeId);

  return withAnalyticsCache(["analytics", "gradeOverview", orgId, id], async () => {
    const grade = await prisma.studentGrade.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
      select: { id: true, name: true, slug: true },
    });
    if (!grade) return null;

    const [studentCount, assessmentCount, results, declaredParticipants] =
      await Promise.all([
        prisma.student.count({
          where: {
            organizationId: orgId,
            gradeId: id,
            deletedAt: null,
            archivedAt: null,
            isActive: true,
          },
        }),
        prisma.assessment.count({
          where: {
            organizationId: orgId,
            gradeId: id,
            deletedAt: null,
            archivedAt: null,
          },
        }),
        prisma.assessmentResult.findMany({
          where: {
            organizationId: orgId,
            deletedAt: null,
            assessment: {
              deletedAt: null,
              archivedAt: null,
              gradeId: id,
            },
            student: { deletedAt: null },
          },
          select: { score: true },
        }),
        prisma.assessment.aggregate({
          where: {
            organizationId: orgId,
            gradeId: id,
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

    return {
      organizationId: orgId,
      gradeId: grade.id,
      gradeName: grade.name,
      gradeSlug: grade.slug,
      studentCount,
      assessmentCount,
      resultCount,
      scoreMetrics:
        scores.length > 0 ? summarizeMetrics(scores) : emptyMetricSummary(),
      participationRate: safeDivide(resultCount, declared),
      completionRate: safeDivide(scores.length, resultCount),
      distribution: buildDistribution(scores, { bucketCount: 5 }),
    };
  });
}

async function rankStudentsInGrade(
  organizationId: string,
  gradeId: string | undefined,
  direction: "top" | "weak",
  limit: number,
): Promise<TopStudentRow[]> {
  const aggregates = await prisma.assessmentResult.groupBy({
    by: ["studentId"],
    where: {
      organizationId,
      deletedAt: null,
      score: { not: null },
      assessment: {
        deletedAt: null,
        archivedAt: null,
        ...(gradeId ? { gradeId } : {}),
      },
      student: {
        deletedAt: null,
        archivedAt: null,
        isActive: true,
        ...(gradeId ? { gradeId } : {}),
      },
    },
    _avg: { score: true },
    _count: { id: true },
  });

  if (aggregates.length === 0) return [];

  const sortedAggregates = [...aggregates].sort((a, b) => {
    const avgA =
      a._avg.score ??
      (direction === "top"
        ? Number.NEGATIVE_INFINITY
        : Number.POSITIVE_INFINITY);
    const avgB =
      b._avg.score ??
      (direction === "top"
        ? Number.NEGATIVE_INFINITY
        : Number.POSITIVE_INFINITY);
    return direction === "top" ? avgB - avgA : avgA - avgB;
  });

  const topAggregates = sortedAggregates.slice(0, limit);
  const studentIds = topAggregates.map((row) => row.studentId);

  const [students, latestResults] = await Promise.all([
    prisma.student.findMany({
      where: {
        organizationId,
        id: { in: studentIds },
        deletedAt: null,
      },
      select: {
        id: true,
        fullName: true,
        slug: true,
        grade: { select: { id: true, name: true } },
      },
    }),
    prisma.assessmentResult.findMany({
      where: {
        organizationId,
        deletedAt: null,
        studentId: { in: studentIds },
        score: { not: null },
        assessment: { deletedAt: null, archivedAt: null },
      },
      orderBy: [
        { assessment: { assessmentDate: "desc" } },
        { createdAt: "desc" },
      ],
      distinct: ["studentId"],
      select: { studentId: true, score: true },
    }),
  ]);

  const studentMap = new Map(students.map((student) => [student.id, student]));
  const latestMap = new Map(
    latestResults.map((row) => [row.studentId, row.score]),
  );
  const aggregateMap = new Map(
    topAggregates.map((row) => [
      row.studentId,
      { average: row._avg.score, count: row._count.id },
    ]),
  );

  const rows: TopStudentRow[] = [];
  for (const studentId of studentIds) {
    const student = studentMap.get(studentId);
    const stats = aggregateMap.get(studentId);
    if (!student || !stats) continue;
    rows.push({
      studentId: student.id,
      studentName: student.fullName,
      studentSlug: student.slug,
      gradeId: student.grade.id,
      gradeName: student.grade.name,
      resultCount: stats.count,
      averageScore: stats.average,
      latestScore: latestMap.get(studentId) ?? null,
    });
  }

  return rows;
}

/**
 * Purpose: highest-average students, optionally filtered by grade.
 * @param organizationId Organization scope (required).
 * @param options.gradeId Optional grade filter.
 * @param options.limit Max rows (default 10, max 100).
 * @returns `TopStudentRow[]` best → worst.
 */
export async function getTopStudentsByGrade(
  organizationId: string,
  options?: { gradeId?: string; limit?: number },
): Promise<TopStudentRow[]> {
  const orgId = requireOrganizationId(organizationId);
  const gradeId = options?.gradeId
    ? requireEntityId("gradeId", options.gradeId)
    : undefined;
  const limit = Math.min(Math.max(1, options?.limit ?? 10), 100);

  return withAnalyticsCache(
    ["analytics", "topStudentsByGrade", orgId, gradeId ?? "all", limit],
    () => rankStudentsInGrade(orgId, gradeId, "top", limit),
  );
}

/**
 * Purpose: lowest-average students, optionally filtered by grade.
 * @param organizationId Organization scope (required).
 * @param options.gradeId Optional grade filter.
 * @param options.limit Max rows (default 10, max 100).
 * @returns `TopStudentRow[]` weakest → strongest.
 */
export async function getWeakStudentsByGrade(
  organizationId: string,
  options?: { gradeId?: string; limit?: number },
): Promise<TopStudentRow[]> {
  const orgId = requireOrganizationId(organizationId);
  const gradeId = options?.gradeId
    ? requireEntityId("gradeId", options.gradeId)
    : undefined;
  const limit = Math.min(Math.max(1, options?.limit ?? 10), 100);

  return withAnalyticsCache(
    ["analytics", "weakStudentsByGrade", orgId, gradeId ?? "all", limit],
    () => rankStudentsInGrade(orgId, gradeId, "weak", limit),
  );
}
