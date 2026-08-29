/**
 * Growth & rank-movement computations shared by student / subject trends.
 */

import type { GrowthPoint } from "@/lib/assessment/analytics/types";
import {
  average,
  finiteNumbers,
  rankMovement,
  scoreDelta,
} from "@/lib/assessment/analytics/helpers";

export type RawChronologicalResult = {
  assessmentId: string;
  assessmentTitle: string;
  assessmentDate: Date | null;
  schoolYear: string | null;
  providerId: string;
  providerName: string;
  score: number | null;
  scaledScore: number | null;
  percentile: number | null;
  growth: number | null;
  rankSchool: number | null;
};

/**
 * Convert chronological assessment results into growth points with deltas.
 * Input must already be sorted oldest → newest.
 */
export function buildGrowthPoints(
  rows: RawChronologicalResult[],
): GrowthPoint[] {
  return rows.map((row, index) => {
    const previous = index > 0 ? rows[index - 1] : null;
    return {
      assessmentId: row.assessmentId,
      assessmentTitle: row.assessmentTitle,
      assessmentDate: row.assessmentDate,
      schoolYear: row.schoolYear,
      providerId: row.providerId,
      providerName: row.providerName,
      score: row.score,
      scaledScore: row.scaledScore,
      percentile: row.percentile,
      growth: row.growth,
      scoreDelta: previous
        ? scoreDelta(previous.score, row.score)
        : null,
      rankMovement: previous
        ? rankMovement(previous.rankSchool, row.rankSchool)
        : null,
      rankSchool: row.rankSchool,
    };
  });
}

export function summarizeGrowth(points: GrowthPoint[]) {
  const scoreDeltas = finiteNumbers(points.map((point) => point.scoreDelta));
  const storedGrowth = finiteNumbers(points.map((point) => point.growth));
  const latest = points.length > 0 ? points[points.length - 1]! : null;

  return {
    averageScoreDelta: average(scoreDeltas),
    averageStoredGrowth: average(storedGrowth),
    latestScoreDelta: latest?.scoreDelta ?? null,
    latestRankMovement: latest?.rankMovement ?? null,
  };
}
