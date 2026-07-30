import type { DashboardComposeContext } from "@/lib/dashboard/contracts/widget";
import { getTehranParts, tehranDayBoundsUtc } from "@/lib/datetime/tehran-zone";
import { computeKpis } from "@/lib/kpi/compute";
import { sumKpiPoints } from "@/lib/kpi/run-formula";
import type { KpiKey } from "@/lib/kpi/types";

function dayBounds() {
  const now = new Date();
  const today = getTehranParts(now);
  return tehranDayBoundsUtc(today.year, today.month, today.day);
}

async function loadKpiTotal(
  ctx: DashboardComposeContext,
  keys: KpiKey[],
  range: { from: Date; to: Date },
) {
  const bundle = await computeKpis({
    organizationId: ctx.organizationId,
    keys,
    from: range.from,
    to: range.to,
    grain: "total",
    dimension: "none",
    branchIds: ctx.allBranches ? undefined : ctx.branchIds,
    ttlSeconds: 120,
  });
  return bundle;
}

export async function loadKpiLeadsToday(
  ctx: DashboardComposeContext,
): Promise<unknown> {
  const { startUtc, endUtc } = dayBounds();
  const bundle = await loadKpiTotal(ctx, ["leads_created_count"], {
    from: startUtc,
    to: endUtc,
  });
  const value = sumKpiPoints(bundle.results.leads_created_count?.points ?? []);
  return { value, unit: "count", period: "today" };
}

export async function loadKpiConversion(
  ctx: DashboardComposeContext,
): Promise<unknown> {
  const bundle = await loadKpiTotal(
    ctx,
    ["leads_created_count", "attributed_conversion_count"],
    { from: ctx.from, to: ctx.to },
  );
  const leads = sumKpiPoints(bundle.results.leads_created_count?.points ?? []);
  const conversions = sumKpiPoints(
    bundle.results.attributed_conversion_count?.points ?? [],
  );
  const rate = leads > 0 ? (conversions / leads) * 100 : 0;
  return {
    leadsCreated: leads,
    attributedConversions: conversions,
    ratePercent: Number(rate.toFixed(1)),
  };
}

export async function loadKpiRevenue(
  ctx: DashboardComposeContext,
): Promise<unknown> {
  const bundle = await loadKpiTotal(ctx, ["attributed_revenue_rials"], {
    from: ctx.from,
    to: ctx.to,
  });
  const value = sumKpiPoints(
    bundle.results.attributed_revenue_rials?.points ?? [],
  );
  return { valueRials: value, unit: "IRR" };
}

export async function loadKpiPipeline(
  ctx: DashboardComposeContext,
): Promise<unknown> {
  const bundle = await computeKpis({
    organizationId: ctx.organizationId,
    keys: ["leads_owned_count", "leads_created_count"],
    from: ctx.from,
    to: ctx.to,
    grain: "total",
    dimension: "ownerUserId",
    branchIds: ctx.allBranches ? undefined : ctx.branchIds,
    ttlSeconds: 120,
  });
  return {
    ownedByOwner: bundle.results.leads_owned_count?.points ?? [],
    createdByOwner: bundle.results.leads_created_count?.points ?? [],
  };
}
