import { NextResponse } from "next/server";
import {
  computeKpis,
  isKpiDimension,
  isKpiGrain,
  KpiComputeError,
  parseKpiKeys,
} from "@/lib/kpi/compute";
import {
  parseKpiDateRange,
  requireReportsViewJson,
  resolveBranchScope,
} from "@/lib/kpi/http";
import { listKpiCatalog } from "@/lib/kpi/registry";
import type { KpiKey } from "@/lib/kpi/types";

export const dynamic = "force-dynamic";

/**
 * GET /admin/kpi?keys=a,b&from=&to=&grain=&dimension=&branch=&ttlSeconds=
 * Read-only KPI compute API.
 */
export async function GET(request: Request) {
  const auth = await requireReportsViewJson();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const { from, to } = parseKpiDateRange(url);
  const grainRaw = url.searchParams.get("grain") ?? "total";
  const dimensionRaw = url.searchParams.get("dimension") ?? "none";
  const ttlRaw = url.searchParams.get("ttlSeconds");
  const ttlSeconds = ttlRaw ? Number(ttlRaw) : undefined;

  if (!isKpiGrain(grainRaw)) {
    return NextResponse.json(
      { error: "INVALID_GRAIN", message: `Invalid grain: ${grainRaw}` },
      { status: 400 },
    );
  }
  if (!isKpiDimension(dimensionRaw)) {
    return NextResponse.json(
      {
        error: "INVALID_DIMENSION",
        message: `Invalid dimension: ${dimensionRaw}`,
      },
      { status: 400 },
    );
  }

  let keys: KpiKey[];
  try {
    const parsed = parseKpiKeys(url.searchParams.get("keys"));
    keys =
      parsed.length > 0
        ? parsed
        : (listKpiCatalog().map((def) => def.key) as KpiKey[]);
  } catch (error) {
    if (error instanceof KpiComputeError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: 400 },
      );
    }
    throw error;
  }

  const branchIds = resolveBranchScope(
    auth.session,
    url.searchParams.get("branch"),
  );
  if (branchIds && branchIds.length === 0) {
    return NextResponse.json(
      { error: "FORBIDDEN_BRANCH", message: "Branch not in scope." },
      { status: 403 },
    );
  }

  try {
    const result = await computeKpis({
      organizationId: auth.session.organization.id,
      keys,
      from,
      to,
      grain: grainRaw,
      dimension: dimensionRaw,
      branchIds,
      ttlSeconds,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof KpiComputeError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: 400 },
      );
    }
    throw error;
  }
}
