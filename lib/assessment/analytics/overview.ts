/**
 * Cross-cutting / legacy-compatible overview helpers.
 *
 * Prefer the named services in `student.ts`, `assessment.ts`, etc.
 * These wrappers preserve the previous `lib/assessment/analytics` API surface.
 */

import { getAssessmentOverview } from "@/lib/assessment/analytics/assessment";
import { getStudentTrend } from "@/lib/assessment/analytics/student";
import { getSubjectStatistics } from "@/lib/assessment/analytics/subject";
import { prisma } from "@/lib/prisma";
import {
  requireEntityId,
  requireOrganizationId,
} from "@/lib/assessment/analytics/errors";
import { summarizeMetrics } from "@/lib/assessment/analytics/helpers";

/** @deprecated Prefer `getAssessmentStatistics` / `getAssessmentOverview`. */
export type AssessmentSummaryStats = {
  assessmentId: string;
  resultCount: number;
  averageScore: number | null;
  maxScore: number | null;
  minScore: number | null;
  featuredCount: number;
};

/** @deprecated Prefer `getStudentTrend`. */
export type StudentAssessmentTrendPoint = {
  assessmentId: string;
  assessmentTitle: string;
  assessmentDate: Date | null;
  schoolYear: string | null;
  score: number | null;
  percentile: number | null;
  growth: number | null;
  providerName: string;
};

/** @deprecated Prefer subject services. */
export type SubjectAverageRow = {
  subjectId: string;
  subjectName: string;
  averagePercentage: number | null;
  sampleCount: number;
};

/**
 * Purpose: compact assessment score summary (legacy shape).
 * @param organizationId Organization scope (required).
 * @param assessmentId Target assessment id.
 * @returns Legacy summary, or `null` when missing.
 */
export async function summarizeAssessmentResults(
  organizationId: string,
  assessmentId: string,
): Promise<AssessmentSummaryStats | null> {
  const overview = await getAssessmentOverview(organizationId, assessmentId);
  if (!overview) return null;
  return {
    assessmentId: overview.assessmentId,
    resultCount: overview.resultCount,
    averageScore: overview.scoreMetrics.average,
    maxScore: overview.scoreMetrics.highest,
    minScore: overview.scoreMetrics.lowest,
    featuredCount: overview.featuredCount,
  };
}

/**
 * Purpose: chronological student trend points (legacy shape).
 * @param organizationId Organization scope (required).
 * @param studentId Target student id.
 * @returns Legacy trend points (empty when student missing / no data).
 */
export async function loadStudentAssessmentTrend(
  organizationId: string,
  studentId: string,
): Promise<StudentAssessmentTrendPoint[]> {
  const trend = await getStudentTrend(organizationId, studentId);
  if (!trend) return [];
  return trend.points.map((point) => ({
    assessmentId: point.assessmentId,
    assessmentTitle: point.assessmentTitle,
    assessmentDate: point.assessmentDate,
    schoolYear: point.schoolYear,
    score: point.score,
    percentile: point.percentile,
    growth: point.growth,
    providerName: point.providerName,
  }));
}

/**
 * Purpose: per-subject averages for one assessment (legacy shape).
 * @param organizationId Organization scope (required).
 * @param assessmentId Target assessment id.
 * @returns Legacy subject average rows.
 */
export async function averageSubjectPerformanceForAssessment(
  organizationId: string,
  assessmentId: string,
): Promise<SubjectAverageRow[]> {
  const orgId = requireOrganizationId(organizationId);
  const id = requireEntityId("assessmentId", assessmentId);

  const assessment = await prisma.assessment.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
    select: { id: true },
  });
  if (!assessment) return [];

  const rows = await prisma.assessmentSubjectResult.findMany({
    where: {
      percentage: { not: null },
      assessmentResult: {
        organizationId: orgId,
        assessmentId: id,
        deletedAt: null,
      },
    },
    select: {
      percentage: true,
      subject: { select: { id: true, name: true, displayOrder: true } },
    },
  });

  const map = new Map<
    string,
    { name: string; displayOrder: number; values: number[] }
  >();

  for (const row of rows) {
    if (row.percentage == null) continue;
    const current = map.get(row.subject.id) ?? {
      name: row.subject.name,
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
        averagePercentage: metrics.average,
        sampleCount: metrics.count,
        displayOrder: value.displayOrder,
      };
    })
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map(({ displayOrder: _displayOrder, ...rest }) => rest);
}

/**
 * Purpose: thin subject statistics probe used by dashboard health checks.
 * @param organizationId Organization scope (required).
 * @param subjectId Target subject id.
 * @returns Sample count for the subject, or `0` when missing.
 */
export async function getSubjectSampleCount(
  organizationId: string,
  subjectId: string,
): Promise<number> {
  const stats = await getSubjectStatistics(organizationId, subjectId);
  return stats?.sampleCount ?? 0;
}
