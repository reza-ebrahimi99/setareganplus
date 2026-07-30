/**
 * UTC time bucketing + dimension aggregation for KPI series.
 */

import type { KpiDimension, KpiGrain, KpiSeriesPoint } from "@/lib/kpi/types";

export type AggregateEvent = {
  at: Date;
  value: number;
  dimensions: Record<string, string | null>;
};

function utcDayStart(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0),
  );
}

/** Monday 00:00 UTC of the week containing d. */
function utcWeekStart(d: Date): Date {
  const day = utcDayStart(d);
  const weekday = day.getUTCDay(); // 0 Sun .. 6 Sat
  const offset = weekday === 0 ? 6 : weekday - 1;
  day.setUTCDate(day.getUTCDate() - offset);
  return day;
}

function utcMonthStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
}

export function bucketStartForGrain(at: Date, grain: KpiGrain): Date {
  switch (grain) {
    case "day":
      return utcDayStart(at);
    case "week":
      return utcWeekStart(at);
    case "month":
      return utcMonthStart(at);
    case "total":
    default:
      return new Date(0);
  }
}

export function dimensionKeyForEvent(
  dimensions: Record<string, string | null>,
  dimension: KpiDimension,
): string {
  if (dimension === "none") return "";
  return dimensions[dimension] ?? "";
}

/**
 * Sum event values into series points keyed by bucket + dimension.
 */
export function aggregateEvents(
  events: readonly AggregateEvent[],
  grain: KpiGrain,
  dimension: KpiDimension,
): KpiSeriesPoint[] {
  const map = new Map<string, KpiSeriesPoint>();

  for (const event of events) {
    const bucket = bucketStartForGrain(event.at, grain);
    const dimValue =
      dimension === "none" ? null : (event.dimensions[dimension] ?? null);
    const key = `${bucket.toISOString()}|${dimension}|${dimValue ?? ""}`;
    const existing = map.get(key);
    if (existing) {
      existing.value += event.value;
      continue;
    }
    map.set(key, {
      bucketStart: grain === "total" ? bucket.toISOString() : bucket.toISOString(),
      dimensions:
        dimension === "none"
          ? {}
          : { [dimension]: dimValue },
      value: event.value,
    });
  }

  return [...map.values()].sort((a, b) => {
    const t = a.bucketStart.localeCompare(b.bucketStart);
    if (t !== 0) return t;
    const aDim = JSON.stringify(a.dimensions);
    const bDim = JSON.stringify(b.dimensions);
    return aDim.localeCompare(bDim);
  });
}

/** For point-in-time totals (e.g. leads_owned), emit a single total point. */
export function singleTotalPoint(
  value: number,
  dimensions: Record<string, string | null> = {},
): KpiSeriesPoint[] {
  return [
    {
      bucketStart: new Date(0).toISOString(),
      dimensions,
      value,
    },
  ];
}

export function groupCountByDimensions(
  rows: readonly { dimensions: Record<string, string | null> }[],
  dimension: KpiDimension,
): KpiSeriesPoint[] {
  if (dimension === "none") {
    return singleTotalPoint(rows.length);
  }
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = row.dimensions[dimension] ?? "";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, value]) => ({
      bucketStart: new Date(0).toISOString(),
      dimensions: { [dimension]: key || null },
      value,
    }))
    .sort((a, b) =>
      String(a.dimensions[dimension]).localeCompare(
        String(b.dimensions[dimension]),
      ),
    );
}
