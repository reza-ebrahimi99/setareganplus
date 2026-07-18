/**
 * Student-scoped analytics.
 */

import { prisma } from "@/lib/prisma";
import { withAnalyticsCache } from "@/lib/assessment/analytics/cache";
import {
  requireEntityId,
  requireOrganizationId,
  AnalyticsError,
} from "@/lib/assessment/analytics/errors";
import {
  buildGrowthPoints,
  summarizeGrowth,
} from "@/lib/assessment/analytics/growth";
import {
  finiteNumbers,
  summarizeMetrics,
} from "@/lib/assessment/analytics/helpers";
import type {
  GrowthPoint,
  StudentGrowth,
  StudentSubjectStat,
  StudentTrend,
} from "@/lib/assessment/analytics/types";

const ACTIVE_RESULT = {
  deletedAt: null,
  assessment: {
    deletedAt: null,
    archivedAt: null,
  },
} as const;

async function loadStudentScope(organizationId: string, studentId: string) {
  return prisma.student.findFirst({
    where: {
      id: studentId,
      organizationId,
      deletedAt: null,
      archivedAt: null,
    },
    select: {
      id: true,
      fullName: true,
      gradeId: true,
      grade: { select: { id: true, name: true } },
    },
  });
}

async function loadStudentChronologicalResults(
  organizationId: string,
  studentId: string,
) {
  return prisma.assessmentResult.findMany({
    where: {
      organizationId,
      studentId,
      ...ACTIVE_RESULT,
    },
    orderBy: [
      { assessment: { assessmentDate: "asc" } },
      { createdAt: "asc" },
    ],
    select: {
      score: true,
      scaledScore: true,
      percentile: true,
      growth: true,
      rankSchool: true,
      assessment: {
        select: {
          id: true,
          title: true,
          assessmentDate: true,
          schoolYear: true,
          provider: { select: { id: true, name: true } },
        },
      },
    },
  });
}

function toGrowthPoints(
  rows: Awaited<ReturnType<typeof loadStudentChronologicalResults>>,
): GrowthPoint[] {
  return buildGrowthPoints(
    rows.map((row) => ({
      assessmentId: row.assessment.id,
      assessmentTitle: row.assessment.title,
      assessmentDate: row.assessment.assessmentDate,
      schoolYear: row.assessment.schoolYear,
      providerId: row.assessment.provider.id,
      providerName: row.assessment.provider.name,
      score: row.score,
      scaledScore: row.scaledScore,
      percentile: row.percentile,
      growth: row.growth,
      rankSchool: row.rankSchool,
    })),
  );
}

/**
 * Purpose: chronological score / percentile / rank trend for one student.
 * @param organizationId Organization scope (required).
 * @param studentId Target student id.
 * @returns `StudentTrend` DTO, or `null` when the student is missing in-scope.
 */
export async function getStudentTrend(
  organizationId: string,
  studentId: string,
): Promise<StudentTrend | null> {
  const orgId = requireOrganizationId(organizationId);
  const id = requireEntityId("studentId", studentId);

  return withAnalyticsCache(["analytics", "studentTrend", orgId, id], async () => {
    const student = await loadStudentScope(orgId, id);
    if (!student) return null;

    const rows = await loadStudentChronologicalResults(orgId, id);
    const points = toGrowthPoints(rows);

    return {
      organizationId: orgId,
      studentId: student.id,
      studentName: student.fullName,
      gradeId: student.grade.id,
      gradeName: student.grade.name,
      points,
      metrics: summarizeMetrics(
        finiteNumbers(points.map((point) => point.score)),
      ),
    };
  });
}

/**
 * Purpose: growth deltas and rank movement derived from the student trend.
 * @param organizationId Organization scope (required).
 * @param studentId Target student id.
 * @returns `StudentGrowth` DTO, or `null` when the student is missing in-scope.
 */
export async function getStudentGrowth(
  organizationId: string,
  studentId: string,
): Promise<StudentGrowth | null> {
  const orgId = requireOrganizationId(organizationId);
  const id = requireEntityId("studentId", studentId);

  return withAnalyticsCache(["analytics", "studentGrowth", orgId, id], async () => {
    const student = await loadStudentScope(orgId, id);
    if (!student) return null;

    const points = toGrowthPoints(
      await loadStudentChronologicalResults(orgId, id),
    );
    const summary = summarizeGrowth(points);

    return {
      organizationId: orgId,
      studentId: student.id,
      ...summary,
      points,
    };
  });
}

/**
 * Purpose: latest non-deleted assessment result for a student (newest date first).
 * @param organizationId Organization scope (required).
 * @param studentId Target student id.
 * @returns Latest `GrowthPoint`, or `null` when none exist / student missing.
 */
export async function getStudentLatestAssessment(
  organizationId: string,
  studentId: string,
): Promise<GrowthPoint | null> {
  const orgId = requireOrganizationId(organizationId);
  const id = requireEntityId("studentId", studentId);

  return withAnalyticsCache(
    ["analytics", "studentLatest", orgId, id],
    async () => {
      const student = await loadStudentScope(orgId, id);
      if (!student) return null;

      const points = toGrowthPoints(
        await loadStudentChronologicalResults(orgId, id),
      );
      if (points.length === 0) return null;
      return points[points.length - 1]!;
    },
  );
}

async function loadStudentSubjectStats(
  organizationId: string,
  studentId: string,
): Promise<StudentSubjectStat[]> {
  const rows = await prisma.assessmentSubjectResult.findMany({
    where: {
      percentage: { not: null },
      assessmentResult: {
        organizationId,
        studentId,
        deletedAt: null,
        assessment: { deletedAt: null, archivedAt: null },
      },
      subject: { deletedAt: null },
    },
    select: {
      percentage: true,
      subject: {
        select: {
          id: true,
          name: true,
          shortName: true,
          displayOrder: true,
        },
      },
    },
  });

  const map = new Map<
    string,
    {
      name: string;
      shortName: string | null;
      displayOrder: number;
      values: number[];
    }
  >();

  for (const row of rows) {
    if (row.percentage == null) continue;
    const current = map.get(row.subject.id) ?? {
      name: row.subject.name,
      shortName: row.subject.shortName,
      displayOrder: row.subject.displayOrder,
      values: [],
    };
    current.values.push(row.percentage);
    map.set(row.subject.id, current);
  }

  return Array.from(map.entries())
    .map(([subjectId, value]) => {
      const metrics = summarizeMetrics(value.values);
      return {
        subjectId,
        subjectName: value.name,
        subjectShortName: value.shortName,
        sampleCount: metrics.count,
        averagePercentage: metrics.average,
        highestPercentage: metrics.highest,
        lowestPercentage: metrics.lowest,
        displayOrder: value.displayOrder,
      };
    })
    .sort((a, b) => {
      const avgA = a.averagePercentage ?? Number.NEGATIVE_INFINITY;
      const avgB = b.averagePercentage ?? Number.NEGATIVE_INFINITY;
      return avgB - avgA;
    })
    .map(({ displayOrder: _displayOrder, ...rest }) => rest);
}

/**
 * Purpose: strongest subjects for a student by average percentage.
 * @param organizationId Organization scope (required).
 * @param studentId Target student id.
 * @param limit Max rows (default 5, max 50).
 * @returns Ordered `StudentSubjectStat[]` (best first). Empty when none / missing student.
 */
export async function getStudentBestSubjects(
  organizationId: string,
  studentId: string,
  limit = 5,
): Promise<StudentSubjectStat[]> {
  const orgId = requireOrganizationId(organizationId);
  const id = requireEntityId("studentId", studentId);
  const take = Math.min(Math.max(1, limit), 50);

  return withAnalyticsCache(
    ["analytics", "studentBestSubjects", orgId, id, take],
    async () => {
      const student = await loadStudentScope(orgId, id);
      if (!student) return [];
      const stats = await loadStudentSubjectStats(orgId, id);
      return stats.slice(0, take);
    },
  );
}

/**
 * Purpose: weakest subjects for a student by average percentage.
 * @param organizationId Organization scope (required).
 * @param studentId Target student id.
 * @param limit Max rows (default 5, max 50).
 * @returns Ordered `StudentSubjectStat[]` (weakest first). Empty when none / missing student.
 */
export async function getStudentWeakSubjects(
  organizationId: string,
  studentId: string,
  limit = 5,
): Promise<StudentSubjectStat[]> {
  const orgId = requireOrganizationId(organizationId);
  const id = requireEntityId("studentId", studentId);
  const take = Math.min(Math.max(1, limit), 50);

  return withAnalyticsCache(
    ["analytics", "studentWeakSubjects", orgId, id, take],
    async () => {
      const student = await loadStudentScope(orgId, id);
      if (!student) return [];
      const stats = await loadStudentSubjectStats(orgId, id);
      return [...stats]
        .sort((a, b) => {
          const avgA = a.averagePercentage ?? Number.POSITIVE_INFINITY;
          const avgB = b.averagePercentage ?? Number.POSITIVE_INFINITY;
          return avgA - avgB;
        })
        .slice(0, take);
    },
  );
}

/**
 * Purpose: overall average score across the student's assessment results.
 * @param organizationId Organization scope (required).
 * @param studentId Target student id.
 * @returns Average score, or `null` when student missing / no scored results.
 */
export async function getStudentAverage(
  organizationId: string,
  studentId: string,
): Promise<number | null> {
  const orgId = requireOrganizationId(organizationId);
  const id = requireEntityId("studentId", studentId);

  return withAnalyticsCache(
    ["analytics", "studentAverage", orgId, id],
    async () => {
      const student = await loadStudentScope(orgId, id);
      if (!student) return null;

      const aggregate = await prisma.assessmentResult.aggregate({
        where: {
          organizationId: orgId,
          studentId: id,
          deletedAt: null,
          score: { not: null },
          assessment: { deletedAt: null, archivedAt: null },
        },
        _avg: { score: true },
        _count: { id: true },
      });

      if (aggregate._count.id === 0) return null;
      return aggregate._avg.score;
    },
  );
}

/**
 * Throws when a student id is out of organization scope.
 * Used by internal callers that require a hard failure.
 */
export async function assertStudentInOrganization(
  organizationId: string,
  studentId: string,
): Promise<void> {
  const orgId = requireOrganizationId(organizationId);
  const id = requireEntityId("studentId", studentId);
  const student = await loadStudentScope(orgId, id);
  if (!student) {
    throw new AnalyticsError("NOT_FOUND", "Student not found in organization.", {
      organizationId: orgId,
      studentId: id,
    });
  }
}
