/**
 * KPI compute orchestrator — registry + formulas + cache.
 */

import { getFormula } from "@/lib/kpi/formulas";
import {
  buildKpiCacheKey,
  cacheKeyFromComputeQuery,
  clampKpiTtlSeconds,
  readKpiCache,
  writeKpiCache,
} from "@/lib/kpi/cache";
import { getKpiDefinition, isKpiKey } from "@/lib/kpi/registry";
import {
  MAX_KPI_RANGE_MS,
  type KpiComputeQuery,
  type KpiDimension,
  type KpiGrain,
  type KpiKey,
  type KpiResultBundle,
} from "@/lib/kpi/types";

export class KpiComputeError extends Error {
  constructor(
    message: string,
    readonly code:
      | "INVALID_RANGE"
      | "INVALID_KEY"
      | "INVALID_DIMENSION"
      | "INVALID_GRAIN"
      | "EMPTY_KEYS",
  ) {
    super(message);
    this.name = "KpiComputeError";
  }
}

export function parseKpiKeys(raw: string | null): KpiKey[] {
  if (!raw?.trim()) return [];
  const keys = raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  for (const key of keys) {
    if (!isKpiKey(key)) {
      throw new KpiComputeError(`Unknown KPI key: ${key}`, "INVALID_KEY");
    }
  }
  return keys as KpiKey[];
}

export function assertKpiQuery(query: KpiComputeQuery): void {
  if (query.keys.length === 0) {
    throw new KpiComputeError("At least one KPI key is required.", "EMPTY_KEYS");
  }
  if (query.to.getTime() < query.from.getTime()) {
    throw new KpiComputeError("`to` must be >= `from`.", "INVALID_RANGE");
  }
  if (query.to.getTime() - query.from.getTime() > MAX_KPI_RANGE_MS) {
    throw new KpiComputeError(
      "Date range exceeds maximum of 366 days.",
      "INVALID_RANGE",
    );
  }
  for (const key of query.keys) {
    const def = getKpiDefinition(key);
    if (!def) {
      throw new KpiComputeError(`Unknown KPI key: ${key}`, "INVALID_KEY");
    }
    if (!def.allowedGrains.includes(query.grain)) {
      throw new KpiComputeError(
        `Grain ${query.grain} not allowed for ${key}.`,
        "INVALID_GRAIN",
      );
    }
    if (!def.allowedDimensions.includes(query.dimension)) {
      throw new KpiComputeError(
        `Dimension ${query.dimension} not allowed for ${key}.`,
        "INVALID_DIMENSION",
      );
    }
  }
}

export function isKpiGrain(value: string): value is KpiGrain {
  return (
    value === "total" ||
    value === "day" ||
    value === "week" ||
    value === "month"
  );
}

export function isKpiDimension(value: string): value is KpiDimension {
  return (
    value === "none" ||
    value === "attributedUserId" ||
    value === "ownerUserId" ||
    value === "branchId"
  );
}

/**
 * Compute KPI bundle with TTL cache. Never reads payment tables.
 */
export async function computeKpis(
  query: KpiComputeQuery,
): Promise<KpiResultBundle> {
  assertKpiQuery(query);
  const ttlSeconds = clampKpiTtlSeconds(query.ttlSeconds);
  const cacheKey = cacheKeyFromComputeQuery(query);

  const cached = await readKpiCache({
    organizationId: query.organizationId,
    cacheKey,
  });
  if (cached) {
    return {
      ...cached.bundle,
      cache: { hit: true, expiresAt: cached.expiresAt.toISOString() },
    };
  }

  const results: KpiResultBundle["results"] = {};
  for (const key of query.keys) {
    const def = getKpiDefinition(key)!;
    const formula = getFormula(def.formulaKey);
    const points = await formula({
      organizationId: query.organizationId,
      from: query.from,
      to: query.to,
      grain: query.grain,
      dimension: query.dimension,
      branchIds: query.branchIds,
    });
    results[key] = { unit: def.unit, points };
  }

  const bundle: KpiResultBundle = {
    organizationId: query.organizationId,
    from: query.from.toISOString(),
    to: query.to.toISOString(),
    grain: query.grain,
    dimension: query.dimension,
    cache: { hit: false },
    results,
  };

  const expiresAt = await writeKpiCache({
    organizationId: query.organizationId,
    cacheKey,
    payload: {
      ...bundle,
      cache: { hit: false, expiresAt: undefined },
    },
    ttlSeconds,
  });

  return {
    ...bundle,
    cache: { hit: false, expiresAt: expiresAt.toISOString() },
  };
}

export { buildKpiCacheKey };
