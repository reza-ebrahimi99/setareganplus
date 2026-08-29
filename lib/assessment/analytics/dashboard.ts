/**
 * Cross-module dashboard aggregates for future Student / Parent / Teacher / Manager UIs.
 */

import { prisma } from "@/lib/prisma";
import { withAnalyticsCache } from "@/lib/assessment/analytics/cache";
import { requireOrganizationId } from "@/lib/assessment/analytics/errors";
import {
  buildGrowthPoints,
  summarizeGrowth,
} from "@/lib/assessment/analytics/growth";
import {
  roundMetric,
  summarizeMetrics,
} from "@/lib/assessment/analytics/helpers";
import type {
  DashboardSummary,
  NeedsAttentionStudent,
  RecentAchievementItem,
  RecentAssessmentItem,
  RecentStudentItem,
} from "@/lib/assessment/analytics/types";

/** Defaults for needs-attention heuristics (override via options). */
export const DEFAULT_NEEDS_ATTENTION_THRESHOLDS = {
  lowScore: 50,
  weakSubject: 50,
} as const;

const NEEDS_ATTENTION_SCAN_LIMIT = 300;

export type NeedsAttentionThresholds = {
  lowScore?: number;
  weakSubject?: number;
};

/**
 * Purpose: organization-wide KPI strip for manager dashboards.
 * @param organizationId Organization scope (required).
 * @returns `DashboardSummary` DTO (never null; zeros when empty).
 */
export async function getDashboardSummary(
  organizationId: string,
): Promise<DashboardSummary> {
  const orgId = requireOrganizationId(organizationId);

  return withAnalyticsCache(["analytics", "dashboardSummary", orgId], async () => {
    const [
      studentCount,
      assessmentCount,
      publishedAssessmentCount,
      resultAggregate,
      achievementCount,
      featuredResultCount,
      needsAttention,
    ] = await Promise.all([
      prisma.student.count({
        where: {
          organizationId: orgId,
          deletedAt: null,
          archivedAt: null,
          isActive: true,
        },
      }),
      prisma.assessment.count({
        where: { organizationId: orgId, deletedAt: null, archivedAt: null },
      }),
      prisma.assessment.count({
        where: {
          organizationId: orgId,
          deletedAt: null,
          archivedAt: null,
          isPublished: true,
        },
      }),
      prisma.assessmentResult.aggregate({
        where: {
          organizationId: orgId,
          deletedAt: null,
          score: { not: null },
          assessment: { deletedAt: null, archivedAt: null },
        },
        _count: { id: true },
        _avg: { score: true },
      }),
      prisma.achievement.count({
        where: {
          organizationId: orgId,
          deletedAt: null,
          archivedAt: null,
          isPublished: true,
        },
      }),
      prisma.assessmentResult.count({
        where: {
          organizationId: orgId,
          deletedAt: null,
          isFeatured: true,
          assessment: { deletedAt: null, archivedAt: null },
        },
      }),
      getNeedsAttentionStudents(orgId, { limit: 100 }),
    ]);

    return {
      organizationId: orgId,
      generatedAt: new Date(),
      studentCount,
      assessmentCount,
      publishedAssessmentCount,
      resultCount: resultAggregate._count.id,
      achievementCount,
      featuredResultCount,
      averageScore:
        resultAggregate._avg.score == null
          ? null
          : roundMetric(resultAggregate._avg.score),
      needsAttentionCount: needsAttention.length,
    };
  });
}

/**
 * Purpose: most recent assessments for activity feeds.
 * @param organizationId Organization scope (required).
 * @param limit Max rows (default 8, max 50).
 * @returns `RecentAssessmentItem[]` newest first.
 */
export async function getRecentAssessments(
  organizationId: string,
  limit = 8,
): Promise<RecentAssessmentItem[]> {
  const orgId = requireOrganizationId(organizationId);
  const take = Math.min(Math.max(1, limit), 50);

  return withAnalyticsCache(
    ["analytics", "recentAssessments", orgId, take],
    async () => {
      const rows = await prisma.assessment.findMany({
        where: {
          organizationId: orgId,
          deletedAt: null,
          archivedAt: null,
        },
        orderBy: [{ assessmentDate: "desc" }, { createdAt: "desc" }],
        take,
        select: {
          id: true,
          title: true,
          slug: true,
          assessmentDate: true,
          schoolYear: true,
          isPublished: true,
          provider: { select: { name: true } },
          grade: { select: { name: true } },
          _count: { select: { results: { where: { deletedAt: null } } } },
        },
      });

      return rows.map((row) => ({
        id: row.id,
        title: row.title,
        slug: row.slug,
        assessmentDate: row.assessmentDate,
        schoolYear: row.schoolYear,
        providerName: row.provider.name,
        gradeName: row.grade.name,
        resultCount: row._count.results,
        isPublished: row.isPublished,
      }));
    },
  );
}

/**
 * Purpose: most recent published achievements for activity feeds.
 * @param organizationId Organization scope (required).
 * @param limit Max rows (default 8, max 50).
 * @returns `RecentAchievementItem[]` newest first.
 */
export async function getRecentAchievements(
  organizationId: string,
  limit = 8,
): Promise<RecentAchievementItem[]> {
  const orgId = requireOrganizationId(organizationId);
  const take = Math.min(Math.max(1, limit), 50);

  return withAnalyticsCache(
    ["analytics", "recentAchievements", orgId, take],
    async () => {
      const rows = await prisma.achievement.findMany({
        where: {
          organizationId: orgId,
          deletedAt: null,
          archivedAt: null,
          isPublished: true,
        },
        orderBy: [{ achievementDate: "desc" }, { createdAt: "desc" }],
        take,
        select: {
          id: true,
          title: true,
          slug: true,
          achievementDate: true,
          isFeatured: true,
          student: { select: { fullName: true, slug: true } },
          category: { select: { name: true } },
        },
      });

      return rows.map((row) => ({
        id: row.id,
        title: row.title,
        slug: row.slug,
        achievementDate: row.achievementDate,
        studentName: row.student.fullName,
        studentSlug: row.student.slug,
        categoryName: row.category.name,
        isFeatured: row.isFeatured,
      }));
    },
  );
}

/**
 * Purpose: most recently created active students.
 * @param organizationId Organization scope (required).
 * @param limit Max rows (default 8, max 50).
 * @returns `RecentStudentItem[]` newest first.
 */
export async function getRecentStudents(
  organizationId: string,
  limit = 8,
): Promise<RecentStudentItem[]> {
  const orgId = requireOrganizationId(organizationId);
  const take = Math.min(Math.max(1, limit), 50);

  return withAnalyticsCache(
    ["analytics", "recentStudents", orgId, take],
    async () => {
      const rows = await prisma.student.findMany({
        where: {
          organizationId: orgId,
          deletedAt: null,
          archivedAt: null,
          isActive: true,
        },
        orderBy: [{ createdAt: "desc" }],
        take,
        select: {
          id: true,
          fullName: true,
          slug: true,
          schoolYear: true,
          createdAt: true,
          isFeatured: true,
          grade: { select: { name: true } },
        },
      });

      return rows.map((row) => ({
        id: row.id,
        fullName: row.fullName,
        slug: row.slug,
        gradeName: row.grade.name,
        schoolYear: row.schoolYear,
        createdAt: row.createdAt,
        isFeatured: row.isFeatured,
      }));
    },
  );
}

/**
 * Purpose: students who may need counselor / teacher attention.
 * Signals: low latest score, negative growth, weak subjects, or no recent result.
 * Implemented with batched queries (no per-student N+1).
 *
 * @param organizationId Organization scope (required).
 * @param options.limit Max rows (default 20, max 100).
 * @param options.gradeId Optional grade filter.
 * @returns `NeedsAttentionStudent[]` (deduplicated, most severe first).
 */
export async function getNeedsAttentionStudents(
  organizationId: string,
  options?: {
    limit?: number;
    gradeId?: string;
    thresholds?: NeedsAttentionThresholds;
  },
): Promise<NeedsAttentionStudent[]> {
  const orgId = requireOrganizationId(organizationId);
  const limit = Math.min(Math.max(1, options?.limit ?? 20), 100);
  const gradeId = options?.gradeId?.trim() || undefined;
  const lowScoreThreshold =
    options?.thresholds?.lowScore ?? DEFAULT_NEEDS_ATTENTION_THRESHOLDS.lowScore;
  const weakSubjectThreshold =
    options?.thresholds?.weakSubject ??
    DEFAULT_NEEDS_ATTENTION_THRESHOLDS.weakSubject;

  return withAnalyticsCache(
    [
      "analytics",
      "needsAttention",
      orgId,
      gradeId ?? "all",
      limit,
      lowScoreThreshold,
      weakSubjectThreshold,
    ],
    async () => {
      const students = await prisma.student.findMany({
        where: {
          organizationId: orgId,
          deletedAt: null,
          archivedAt: null,
          isActive: true,
          ...(gradeId ? { gradeId } : {}),
        },
        select: {
          id: true,
          fullName: true,
          slug: true,
          gradeId: true,
          grade: { select: { id: true, name: true } },
        },
        take: NEEDS_ATTENTION_SCAN_LIMIT,
        orderBy: [{ updatedAt: "desc" }],
      });

      if (students.length === 0) return [];

      const studentIds = students.map((student) => student.id);

      const [allResults, subjectRows] = await Promise.all([
        prisma.assessmentResult.findMany({
          where: {
            organizationId: orgId,
            deletedAt: null,
            studentId: { in: studentIds },
            assessment: { deletedAt: null, archivedAt: null },
          },
          orderBy: [
            { assessment: { assessmentDate: "asc" } },
            { createdAt: "asc" },
          ],
          select: {
            studentId: true,
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
        }),
        prisma.assessmentSubjectResult.findMany({
          where: {
            percentage: { not: null },
            assessmentResult: {
              organizationId: orgId,
              deletedAt: null,
              studentId: { in: studentIds },
              assessment: { deletedAt: null, archivedAt: null },
            },
            subject: { deletedAt: null },
          },
          select: {
            percentage: true,
            subjectId: true,
            assessmentResult: { select: { studentId: true } },
          },
        }),
      ]);

      const resultsByStudent = new Map<string, typeof allResults>();
      for (const row of allResults) {
        const list = resultsByStudent.get(row.studentId) ?? [];
        list.push(row);
        resultsByStudent.set(row.studentId, list);
      }

      const subjectAvgByStudent = new Map<string, Map<string, number[]>>();
      for (const row of subjectRows) {
        if (row.percentage == null) continue;
        const studentId = row.assessmentResult.studentId;
        const bySubject =
          subjectAvgByStudent.get(studentId) ?? new Map<string, number[]>();
        const values = bySubject.get(row.subjectId) ?? [];
        values.push(row.percentage);
        bySubject.set(row.subjectId, values);
        subjectAvgByStudent.set(studentId, bySubject);
      }

      const flagged: NeedsAttentionStudent[] = [];

      for (const student of students) {
        const reasonCodes: NeedsAttentionStudent["reasonCodes"] = [];
        const rows = resultsByStudent.get(student.id) ?? [];

        const points = buildGrowthPoints(
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
        const growth = summarizeGrowth(points);
        const latest = points.length > 0 ? points[points.length - 1]! : null;

        if (!latest) {
          reasonCodes.push("NO_RECENT_RESULT");
        } else if (
          latest.score != null &&
          latest.score < lowScoreThreshold
        ) {
          reasonCodes.push("LOW_SCORE");
        }

        if (
          growth.latestScoreDelta != null &&
          growth.latestScoreDelta < 0
        ) {
          reasonCodes.push("NEGATIVE_GROWTH");
        }

        const subjectMap = subjectAvgByStudent.get(student.id);
        if (subjectMap) {
          const hasWeak = Array.from(subjectMap.values()).some((values) => {
            const avg = summarizeMetrics(values).average;
            return avg != null && avg < weakSubjectThreshold;
          });
          if (hasWeak) reasonCodes.push("WEAK_SUBJECTS");
        }

        if (reasonCodes.length === 0) continue;

        flagged.push({
          studentId: student.id,
          studentName: student.fullName,
          studentSlug: student.slug,
          gradeId: student.grade.id,
          gradeName: student.grade.name,
          latestScore: latest?.score ?? null,
          latestAssessmentTitle: latest?.assessmentTitle ?? null,
          latestAssessmentDate: latest?.assessmentDate ?? null,
          latestScoreDelta: growth.latestScoreDelta,
          reasonCodes,
        });
      }

      flagged.sort((a, b) => {
        if (b.reasonCodes.length !== a.reasonCodes.length) {
          return b.reasonCodes.length - a.reasonCodes.length;
        }
        const scoreA = a.latestScore ?? Number.POSITIVE_INFINITY;
        const scoreB = b.latestScore ?? Number.POSITIVE_INFINITY;
        return scoreA - scoreB;
      });

      return flagged.slice(0, limit);
    },
  );
}
