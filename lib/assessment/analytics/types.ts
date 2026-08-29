/**
 * Shared DTOs for the Academic Analytics Engine.
 * UI layers must treat these as the contract — do not reshape at the service boundary.
 */

/** Numeric summary block used across assessment / grade / provider / subject views. */
export type MetricSummary = {
  count: number;
  average: number | null;
  median: number | null;
  highest: number | null;
  lowest: number | null;
  /** Sample standard deviation; null when fewer than 2 values. */
  stdDev: number | null;
};

/** Histogram bucket for score / percentage distribution. */
export type DistributionBucket = {
  /** Inclusive lower bound. */
  from: number;
  /** Exclusive upper bound (last bucket may be inclusive). */
  to: number;
  label: string;
  count: number;
  /** Share of total samples in [0, 1]. */
  ratio: number;
};

export type GrowthPoint = {
  assessmentId: string;
  assessmentTitle: string;
  assessmentDate: Date | null;
  schoolYear: string | null;
  providerId: string;
  providerName: string;
  score: number | null;
  scaledScore: number | null;
  percentile: number | null;
  /** Stored growth field from the result row, if present. */
  growth: number | null;
  /**
   * Computed score delta vs previous chronological point.
   * Null when previous score or current score is missing.
   */
  scoreDelta: number | null;
  /**
   * Computed school-rank movement (previous rank − current rank).
   * Positive means improved ranking. Null when ranks unavailable.
   */
  rankMovement: number | null;
  rankSchool: number | null;
};

export type StudentTrend = {
  organizationId: string;
  studentId: string;
  studentName: string;
  gradeId: string;
  gradeName: string;
  points: GrowthPoint[];
  metrics: MetricSummary;
};

export type StudentGrowth = {
  organizationId: string;
  studentId: string;
  /** Average of computed score deltas across consecutive points. */
  averageScoreDelta: number | null;
  /** Average of stored `growth` values when present. */
  averageStoredGrowth: number | null;
  /** Latest computed score delta. */
  latestScoreDelta: number | null;
  /** Latest rank movement (positive = better rank). */
  latestRankMovement: number | null;
  points: GrowthPoint[];
};

export type StudentSubjectStat = {
  subjectId: string;
  subjectName: string;
  subjectShortName: string | null;
  sampleCount: number;
  averagePercentage: number | null;
  highestPercentage: number | null;
  lowestPercentage: number | null;
};

export type RankingRow = {
  rank: number;
  resultId: string;
  studentId: string;
  studentName: string;
  studentSlug: string;
  gradeId: string;
  gradeName: string;
  score: number | null;
  scaledScore: number | null;
  percentile: number | null;
  rankSchool: number | null;
  rankCity: number | null;
  rankProvince: number | null;
  rankCountry: number | null;
  isFeatured: boolean;
};

export type AssessmentOverview = {
  organizationId: string;
  assessmentId: string;
  title: string;
  slug: string;
  providerId: string;
  providerName: string;
  gradeId: string;
  gradeName: string;
  assessmentType: string;
  assessmentDate: Date | null;
  schoolYear: string | null;
  declaredParticipants: number | null;
  maxScore: number | null;
  isPublished: boolean;
  resultCount: number;
  featuredCount: number;
  /** resultCount / declaredParticipants when participants > 0. */
  participationRate: number | null;
  /** Share of results that have a non-null score. */
  completionRate: number | null;
  scoreMetrics: MetricSummary;
  scaledScoreMetrics: MetricSummary;
  percentileMetrics: MetricSummary;
  distribution: DistributionBucket[];
};

export type AssessmentStatistics = AssessmentOverview;

export type GradeOverview = {
  organizationId: string;
  gradeId: string;
  gradeName: string;
  gradeSlug: string;
  studentCount: number;
  assessmentCount: number;
  resultCount: number;
  scoreMetrics: MetricSummary;
  participationRate: number | null;
  completionRate: number | null;
  distribution: DistributionBucket[];
};

export type ProviderStatistics = {
  organizationId: string;
  providerId: string;
  providerName: string;
  providerSlug: string;
  assessmentCount: number;
  resultCount: number;
  studentCount: number;
  scoreMetrics: MetricSummary;
  participationRate: number | null;
  completionRate: number | null;
  distribution: DistributionBucket[];
};

export type SubjectStatistics = {
  organizationId: string;
  subjectId: string;
  subjectName: string;
  subjectSlug: string;
  sampleCount: number;
  assessmentCount: number;
  studentCount: number;
  percentageMetrics: MetricSummary;
  distribution: DistributionBucket[];
};

export type SubjectTrendPoint = {
  assessmentId: string;
  assessmentTitle: string;
  assessmentDate: Date | null;
  schoolYear: string | null;
  sampleCount: number;
  averagePercentage: number | null;
};

export type DashboardSummary = {
  organizationId: string;
  generatedAt: Date;
  studentCount: number;
  assessmentCount: number;
  publishedAssessmentCount: number;
  resultCount: number;
  achievementCount: number;
  featuredResultCount: number;
  averageScore: number | null;
  needsAttentionCount: number;
};

export type RecentAssessmentItem = {
  id: string;
  title: string;
  slug: string;
  assessmentDate: Date | null;
  schoolYear: string | null;
  providerName: string;
  gradeName: string;
  resultCount: number;
  isPublished: boolean;
};

export type RecentAchievementItem = {
  id: string;
  title: string;
  slug: string;
  achievementDate: Date | null;
  studentName: string;
  studentSlug: string;
  categoryName: string;
  isFeatured: boolean;
};

export type RecentStudentItem = {
  id: string;
  fullName: string;
  slug: string;
  gradeName: string;
  schoolYear: string | null;
  createdAt: Date;
  isFeatured: boolean;
};

export type NeedsAttentionStudent = {
  studentId: string;
  studentName: string;
  studentSlug: string;
  gradeId: string;
  gradeName: string;
  latestScore: number | null;
  latestAssessmentTitle: string | null;
  latestAssessmentDate: Date | null;
  latestScoreDelta: number | null;
  reasonCodes: Array<
    "LOW_SCORE" | "NEGATIVE_GROWTH" | "WEAK_SUBJECTS" | "NO_RECENT_RESULT"
  >;
};

export type TopStudentRow = {
  studentId: string;
  studentName: string;
  studentSlug: string;
  gradeId: string;
  gradeName: string;
  resultCount: number;
  averageScore: number | null;
  latestScore: number | null;
};
