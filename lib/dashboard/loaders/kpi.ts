import type { DashboardComposeContext } from "@/lib/dashboard/contracts/widget";
import { getTehranParts, tehranDayBoundsUtc } from "@/lib/datetime/tehran-zone";
import { computeKpis } from "@/lib/kpi/compute";
import { sumKpiPoints } from "@/lib/kpi/run-formula";
import type { KpiKey, KpiSeriesPoint } from "@/lib/kpi/types";
import { prisma } from "@/lib/prisma";

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
  const owned = bundle.results.leads_owned_count?.points ?? [];
  const created = bundle.results.leads_created_count?.points ?? [];
  const ownerIds = [
    ...new Set(
      [...owned, ...created]
        .map((point) => point.dimensions.ownerUserId)
        .filter((id): id is string => Boolean(id) && id !== "none"),
    ),
  ];
  const users =
    ownerIds.length === 0
      ? []
      : await prisma.user.findMany({
          where: { id: { in: ownerIds } },
          select: { id: true, firstName: true, lastName: true },
        });
  const names = new Map(
    users.map((user) => [
      user.id,
      `${user.firstName} ${user.lastName}`.trim(),
    ]),
  );
  const withOwnerName = (points: KpiSeriesPoint[]) =>
    points.map((point) => {
      const ownerUserId = point.dimensions.ownerUserId;
      const ownerName =
        ownerUserId && ownerUserId !== "none"
          ? names.get(ownerUserId) || null
          : null;
      return {
        ...point,
        dimensions: { ...point.dimensions, ownerName },
      };
    });
  return {
    ownedByOwner: withOwnerName(owned),
    createdByOwner: withOwnerName(created),
  };
}
