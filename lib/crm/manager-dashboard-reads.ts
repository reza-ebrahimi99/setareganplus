/**
 * Truth Spine read facades for Manager dashboard widgets (Sprint 6).
 * Dashboard loaders call these — pages must not query Prisma for these metrics.
 */

import { CrmTaskStatus } from "@/generated/prisma/enums";
import { getTehranParts, tehranDayBoundsUtc } from "@/lib/datetime/tehran-zone";
import { computeKpis } from "@/lib/kpi/compute";
import { sumKpiPoints } from "@/lib/kpi/run-formula";
import { prisma } from "@/lib/prisma";

export type ManagerOpsMetrics = {
  callsToday: number;
  overdueTasks: number;
  unassignedLeads: number;
  hotWithoutFollowUp: number;
  bookingsToday: number;
  /** KPI-backed: attributed conversions / leads created (30d), percent string */
  conversion30dLabel: string;
  leadsCreated30d: number;
  attributedConversions30d: number;
};

export async function readManagerOpsMetrics(params: {
  organizationId: string;
  branchIds?: readonly string[];
}): Promise<ManagerOpsMetrics> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);
  const today = getTehranParts(now);
  const { startUtc, endUtc } = tehranDayBoundsUtc(
    today.year,
    today.month,
    today.day,
  );
  const branchScope = params.branchIds
    ? { branchId: { in: [...params.branchIds] } }
    : {};
  const leadScope = {
    organizationId: params.organizationId,
    deletedAt: null,
    ...branchScope,
  };

  const [callsToday, overdueTasks, unassignedLeads, hotWithoutFollowUp, bookingsToday, kpiBundle] =
    await Promise.all([
      prisma.crmCallLog.count({
        where: {
          organizationId: params.organizationId,
          calledAt: { gte: startUtc, lte: endUtc },
          lead: leadScope,
        },
      }),
      prisma.crmTask.count({
        where: {
          organizationId: params.organizationId,
          deletedAt: null,
          status: { in: [CrmTaskStatus.OPEN, CrmTaskStatus.IN_PROGRESS] },
          dueAt: { lt: now },
          lead: leadScope,
        },
      }),
      prisma.lead.count({ where: { ...leadScope, ownerUserId: null } }),
      prisma.lead.count({
        where: {
          ...leadScope,
          scoreBand: { in: ["HOT", "QUALIFIED"] },
          nextFollowUpAt: null,
        },
      }),
      prisma.bookingReservation.count({
        where: {
          organizationId: params.organizationId,
          deletedAt: null,
          slot: {
            startsAt: { gte: startUtc, lte: endUtc },
            ...(params.branchIds
              ? { branchId: { in: [...params.branchIds] } }
              : {}),
          },
        },
      }),
      computeKpis({
        organizationId: params.organizationId,
        keys: ["leads_created_count", "attributed_conversion_count"],
        from: thirtyDaysAgo,
        to: now,
        grain: "total",
        dimension: "none",
        branchIds: params.branchIds,
        ttlSeconds: 120,
      }),
    ]);

  const leadsCreated30d = sumKpiPoints(
    kpiBundle.results.leads_created_count?.points ?? [],
  );
  const attributedConversions30d = sumKpiPoints(
    kpiBundle.results.attributed_conversion_count?.points ?? [],
  );
  const conversion30dLabel = `${
    leadsCreated30d
      ? ((attributedConversions30d / leadsCreated30d) * 100).toFixed(1)
      : "0"
  }٪`;

  return {
    callsToday,
    overdueTasks,
    unassignedLeads,
    hotWithoutFollowUp,
    bookingsToday,
    conversion30dLabel,
    leadsCreated30d,
    attributedConversions30d,
  };
}

export type StaffCallsTodayRow = {
  id: string;
  name: string;
  count: number;
};

export async function readStaffCallsToday(params: {
  organizationId: string;
  branchIds?: readonly string[];
  limit?: number;
}): Promise<StaffCallsTodayRow[]> {
  const now = new Date();
  const today = getTehranParts(now);
  const { startUtc, endUtc } = tehranDayBoundsUtc(
    today.year,
    today.month,
    today.day,
  );
  const leadScope = {
    organizationId: params.organizationId,
    deletedAt: null as null,
    ...(params.branchIds ? { branchId: { in: [...params.branchIds] } } : {}),
  };
  const staffCalls = await prisma.crmCallLog.findMany({
    where: {
      organizationId: params.organizationId,
      calledAt: { gte: startUtc, lte: endUtc },
      lead: leadScope,
    },
    orderBy: { calledAt: "desc" },
    take: 500,
    select: {
      membershipId: true,
      membership: {
        select: { user: { select: { firstName: true, lastName: true } } },
      },
    },
  });
  const limit = Math.min(Math.max(params.limit ?? 5, 1), 20);
  return [...staffCalls
    .reduce((map, call) => {
      const current = map.get(call.membershipId);
      map.set(call.membershipId, {
        id: call.membershipId,
        name: `${call.membership.user.firstName} ${call.membership.user.lastName}`.trim(),
        count: (current?.count ?? 0) + 1,
      });
      return map;
    }, new Map<string, StaffCallsTodayRow>())
    .values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
