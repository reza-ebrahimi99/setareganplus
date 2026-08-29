/**
 * DB-backed TTL cache for KPI computation results.
 */

import { createHash } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import {
  DEFAULT_KPI_TTL_SECONDS,
  MAX_KPI_TTL_SECONDS,
  MIN_KPI_TTL_SECONDS,
  type KpiComputeQuery,
  type KpiResultBundle,
} from "@/lib/kpi/types";
import { prisma } from "@/lib/prisma";

export function clampKpiTtlSeconds(raw?: number): number {
  if (raw === undefined || Number.isNaN(raw)) return DEFAULT_KPI_TTL_SECONDS;
  return Math.min(
    MAX_KPI_TTL_SECONDS,
    Math.max(MIN_KPI_TTL_SECONDS, Math.trunc(raw)),
  );
}

export function buildKpiCacheKey(query: {
  organizationId: string;
  keys: readonly string[];
  from: string;
  to: string;
  grain: string;
  dimension: string;
  branchIds?: readonly string[];
}): string {
  const payload = {
    organizationId: query.organizationId,
    keys: [...query.keys].sort(),
    from: query.from,
    to: query.to,
    grain: query.grain,
    dimension: query.dimension,
    branchIds: query.branchIds ? [...query.branchIds].sort() : null,
  };
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export async function readKpiCache(params: {
  organizationId: string;
  cacheKey: string;
}): Promise<{ bundle: KpiResultBundle; expiresAt: Date } | null> {
  const row = await prisma.kpiComputationCache.findUnique({
    where: {
      organizationId_cacheKey: {
        organizationId: params.organizationId,
        cacheKey: params.cacheKey,
      },
    },
    select: { payload: true, expiresAt: true },
  });
  if (!row) return null;
  if (row.expiresAt.getTime() <= Date.now()) return null;
  return {
    bundle: row.payload as unknown as KpiResultBundle,
    expiresAt: row.expiresAt,
  };
}

export async function writeKpiCache(params: {
  organizationId: string;
  cacheKey: string;
  payload: KpiResultBundle;
  ttlSeconds: number;
}): Promise<Date> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + params.ttlSeconds * 1000);
  await prisma.kpiComputationCache.upsert({
    where: {
      organizationId_cacheKey: {
        organizationId: params.organizationId,
        cacheKey: params.cacheKey,
      },
    },
    create: {
      organizationId: params.organizationId,
      cacheKey: params.cacheKey,
      payload: params.payload as unknown as Prisma.InputJsonValue,
      computedAt: now,
      expiresAt,
    },
    update: {
      payload: params.payload as unknown as Prisma.InputJsonValue,
      computedAt: now,
      expiresAt,
    },
  });
  return expiresAt;
}

export function cacheKeyFromComputeQuery(query: KpiComputeQuery): string {
  return buildKpiCacheKey({
    organizationId: query.organizationId,
    keys: query.keys,
    from: query.from.toISOString(),
    to: query.to.toISOString(),
    grain: query.grain,
    dimension: query.dimension,
    branchIds: query.branchIds,
  });
}
