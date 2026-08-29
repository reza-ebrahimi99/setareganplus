/**
 * Academic Analytics Engine — public API.
 *
 * Reusable, organization-scoped analytics for future Student / Parent /
 * Teacher / Manager / AI dashboards. No UI, no charts, no fake data.
 *
 * ## Conventions
 * - Every public function requires `organizationId` as the first argument.
 * - Soft-deleted / archived rows are excluded unless noted.
 * - Typed failures use `AnalyticsError` (`errors.ts`) — never generic `Error`.
 * - Caching: `withAnalyticsCache` / React `cache` today; Redis later without API changes.
 *
 * ## Recommended Prisma indexes (do not add unless query plans justify)
 * Existing indexes already cover most paths. Consider only if EXPLAIN shows need:
 * 1. `AssessmentResult`: `@@index([organizationId, studentId, deletedAt])`
 *    — student trend / growth filters (current index is studentId + createdAt).
 * 2. `AssessmentSubjectResult`: `@@index([subjectId, percentage])`
 *    — subject statistics scans that filter non-null percentages.
 * 3. `AssessmentResult`: `@@index([organizationId, deletedAt, studentId])`
 *    — needs-attention batch loads by student set.
 * Avoid duplicate / low-selectivity indexes; measure before migrating.
 *
 * @packageDocumentation
 */

export {
  AnalyticsError,
  isAnalyticsError,
  type AnalyticsErrorCode,
} from "@/lib/assessment/analytics/errors";

export {
  cachedAnalytics,
  withAnalyticsCache,
  type AnalyticsCacheKey,
} from "@/lib/assessment/analytics/cache";

export {
  average,
  buildDistribution,
  emptyMetricSummary,
  finiteNumbers,
  highest,
  lowest,
  median,
  percentileOfValue,
  rankMovement,
  roundMetric,
  safeDivide,
  scoreDelta,
  stdDev,
  summarizeMetrics,
} from "@/lib/assessment/analytics/helpers";

export type {
  AssessmentOverview,
  AssessmentStatistics,
  DashboardSummary,
  DistributionBucket,
  GradeOverview,
  GrowthPoint,
  MetricSummary,
  NeedsAttentionStudent,
  ProviderStatistics,
  RankingRow,
  RecentAchievementItem,
  RecentAssessmentItem,
  RecentStudentItem,
  StudentGrowth,
  StudentSubjectStat,
  StudentTrend,
  SubjectStatistics,
  SubjectTrendPoint,
  TopStudentRow,
} from "@/lib/assessment/analytics/types";

export {
  getStudentAverage,
  getStudentBestSubjects,
  getStudentGrowth,
  getStudentLatestAssessment,
  getStudentTrend,
  getStudentWeakSubjects,
} from "@/lib/assessment/analytics/student";

export {
  getAssessmentOverview,
  getAssessmentRankingRows,
  getAssessmentStatistics,
} from "@/lib/assessment/analytics/assessment";

export { getAssessmentRanking } from "@/lib/assessment/analytics/ranking";

export {
  getGradeOverview,
  getTopStudentsByGrade,
  getWeakStudentsByGrade,
} from "@/lib/assessment/analytics/grade";

export { getProviderStatistics } from "@/lib/assessment/analytics/provider";

export {
  getSubjectStatistics,
  getSubjectTrend,
} from "@/lib/assessment/analytics/subject";

export {
  DEFAULT_NEEDS_ATTENTION_THRESHOLDS,
  getDashboardSummary,
  getNeedsAttentionStudents,
  getRecentAchievements,
  getRecentAssessments,
  getRecentStudents,
  type NeedsAttentionThresholds,
} from "@/lib/assessment/analytics/dashboard";

export {
  buildGrowthPoints,
  summarizeGrowth,
} from "@/lib/assessment/analytics/growth";

export {
  averageSubjectPerformanceForAssessment,
  loadStudentAssessmentTrend,
  summarizeAssessmentResults,
  type AssessmentSummaryStats,
  type StudentAssessmentTrendPoint,
  type SubjectAverageRow,
} from "@/lib/assessment/analytics/overview";
