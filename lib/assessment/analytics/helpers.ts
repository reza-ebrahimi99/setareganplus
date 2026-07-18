/**
 * Pure metric helpers for the Academic Analytics Engine.
 * No I/O — safe to unit-test in isolation.
 */

import type { DistributionBucket, MetricSummary } from "@/lib/assessment/analytics/types";

/** Round to 4 decimal places to keep DTOs stable across runtimes. */
export function roundMetric(value: number): number {
  return Math.round(value * 10000) / 10000;
}

export function safeDivide(
  numerator: number,
  denominator: number,
): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) {
    return null;
  }
  if (denominator === 0) return null;
  return roundMetric(numerator / denominator);
}

export function finiteNumbers(values: Array<number | null | undefined>): number[] {
  return values.filter(
    (value): value is number =>
      typeof value === "number" && Number.isFinite(value),
  );
}

export function average(values: number[]): number | null {
  if (values.length === 0) return null;
  const sum = values.reduce((acc, value) => acc + value, 0);
  return roundMetric(sum / values.length);
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return roundMetric(sorted[mid]!);
  return roundMetric((sorted[mid - 1]! + sorted[mid]!) / 2);
}

export function highest(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.max(...values);
}

export function lowest(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.min(...values);
}

/** Sample standard deviation (n − 1). */
export function stdDev(values: number[]): number | null {
  if (values.length < 2) return null;
  const avg = average(values);
  if (avg == null) return null;
  const variance =
    values.reduce((acc, value) => acc + (value - avg) ** 2, 0) /
    (values.length - 1);
  return roundMetric(Math.sqrt(variance));
}

/**
 * Percentile of a value within a sample (0–100).
 * Uses the fraction of values strictly below + half of equals.
 */
export function percentileOfValue(
  value: number,
  sample: number[],
): number | null {
  if (!Number.isFinite(value) || sample.length === 0) return null;
  let below = 0;
  let equal = 0;
  for (const item of sample) {
    if (item < value) below += 1;
    else if (item === value) equal += 1;
  }
  return roundMetric(((below + equal / 2) / sample.length) * 100);
}

export function summarizeMetrics(values: number[]): MetricSummary {
  const clean = finiteNumbers(values);
  return {
    count: clean.length,
    average: average(clean),
    median: median(clean),
    highest: highest(clean),
    lowest: lowest(clean),
    stdDev: stdDev(clean),
  };
}

/**
 * Build fixed-width distribution buckets.
 * Empty samples return an empty array (never invent buckets with fake counts).
 */
export function buildDistribution(
  values: number[],
  options?: {
    min?: number;
    max?: number;
    bucketCount?: number;
  },
): DistributionBucket[] {
  const clean = finiteNumbers(values);
  if (clean.length === 0) return [];

  const bucketCount = Math.max(1, options?.bucketCount ?? 5);
  const min = options?.min ?? Math.min(...clean);
  const max = options?.max ?? Math.max(...clean);

  if (!Number.isFinite(min) || !Number.isFinite(max) || max < min) {
    return [];
  }

  if (min === max) {
    return [
      {
        from: min,
        to: max,
        label: `${min}`,
        count: clean.length,
        ratio: 1,
      },
    ];
  }

  const width = (max - min) / bucketCount;
  const buckets: DistributionBucket[] = Array.from(
    { length: bucketCount },
    (_, index) => {
      const from = min + width * index;
      const to = index === bucketCount - 1 ? max : min + width * (index + 1);
      return {
        from: roundMetric(from),
        to: roundMetric(to),
        label: `${roundMetric(from)}–${roundMetric(to)}`,
        count: 0,
        ratio: 0,
      };
    },
  );

  for (const value of clean) {
    let index = Math.floor((value - min) / width);
    if (index >= bucketCount) index = bucketCount - 1;
    if (index < 0) index = 0;
    buckets[index]!.count += 1;
  }

  for (const bucket of buckets) {
    bucket.ratio = safeDivide(bucket.count, clean.length) ?? 0;
  }

  return buckets;
}

/** Positive when rank improved (lower rank number is better). */
export function rankMovement(
  previousRank: number | null | undefined,
  currentRank: number | null | undefined,
): number | null {
  if (
    previousRank == null ||
    currentRank == null ||
    !Number.isFinite(previousRank) ||
    !Number.isFinite(currentRank)
  ) {
    return null;
  }
  return previousRank - currentRank;
}

export function scoreDelta(
  previous: number | null | undefined,
  current: number | null | undefined,
): number | null {
  if (
    previous == null ||
    current == null ||
    !Number.isFinite(previous) ||
    !Number.isFinite(current)
  ) {
    return null;
  }
  return roundMetric(current - previous);
}

export function emptyMetricSummary(): MetricSummary {
  return {
    count: 0,
    average: null,
    median: null,
    highest: null,
    lowest: null,
    stdDev: null,
  };
}
