/**
 * KPI rollups for the Order Operations Center.
 * Counts run in the database against the same WHERE as the order list.
 */

import {
  CommerceOpsStage,
  CommerceOrderPaymentStatus,
} from "@/generated/prisma/enums";
import {
  buildAdminCommerceOrderWhere,
  type AdminCommerceOrderListFilters,
} from "@/lib/commerce/orders/service";
import { prisma } from "@/lib/prisma";

export type OrderOpsKpiCard = {
  key: string;
  label: string;
  value: number;
  hint: string;
};

export type OrderOpsKpiCounts = {
  total: number;
  paid: number;
  inProduction: number;
  ready: number;
  delivered: number;
  byBranchId: ReadonlyMap<string, number>;
};

export function formatOrderOpsKpis(
  counts: OrderOpsKpiCounts,
  branches: readonly { id: string; name: string }[],
): OrderOpsKpiCard[] {
  const cards: OrderOpsKpiCard[] = [
    {
      key: "total",
      label: "کل سفارشات",
      value: counts.total,
      hint: "در نتیجه فیلتر فعلی",
    },
    {
      key: "paid",
      label: "پرداخت شده",
      value: counts.paid,
      hint: "پرداخت تأییدشده",
    },
    {
      key: "production",
      label: "در حال تولید",
      value: counts.inProduction,
      hint: "چاپ / تکثیر / صحافی",
    },
    {
      key: "ready",
      label: "آماده تحویل",
      value: counts.ready,
      hint: "منتظر دانش‌آموز",
    },
    {
      key: "delivered",
      label: "تحویل شده",
      value: counts.delivered,
      hint: "تحویل به دانش‌آموز",
    },
  ];

  for (const branch of branches) {
    cards.push({
      key: `branch-${branch.id}`,
      label: branch.name,
      value: counts.byBranchId.get(branch.id) ?? 0,
      hint: "سفارش این شعبه",
    });
  }

  return cards;
}

export async function loadOrderOpsKpiCounts(
  filters: AdminCommerceOrderListFilters,
): Promise<OrderOpsKpiCounts> {
  const where = buildAdminCommerceOrderWhere(filters);

  const [stageGroups, paid, branchGroups] = await Promise.all([
    prisma.commerceOrder.groupBy({
      by: ["opsStage"],
      where,
      _count: { _all: true },
    }),
    prisma.commerceOrder.count({
      where: {
        AND: [where, { paymentStatus: CommerceOrderPaymentStatus.PAID }],
      },
    }),
    prisma.commerceOrder.groupBy({
      by: ["branchId"],
      where,
      _count: { _all: true },
    }),
  ]);

  const byStage = new Map(
    stageGroups.map((row) => [row.opsStage, row._count._all]),
  );
  const byBranchId = new Map<string, number>();
  for (const row of branchGroups) {
    if (row.branchId) byBranchId.set(row.branchId, row._count._all);
  }

  return {
    total: stageGroups.reduce((sum, row) => sum + row._count._all, 0),
    paid,
    inProduction: byStage.get(CommerceOpsStage.IN_PRODUCTION) ?? 0,
    ready: byStage.get(CommerceOpsStage.READY_FOR_PICKUP) ?? 0,
    delivered: byStage.get(CommerceOpsStage.DELIVERED_TO_STUDENT) ?? 0,
    byBranchId,
  };
}

export async function loadOrderOpsKpis(
  filters: AdminCommerceOrderListFilters,
  branches: readonly { id: string; name: string }[],
): Promise<OrderOpsKpiCard[]> {
  const counts = await loadOrderOpsKpiCounts(filters);
  return formatOrderOpsKpis(counts, branches);
}
