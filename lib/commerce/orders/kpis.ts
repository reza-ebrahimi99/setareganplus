/**
 * KPI rollups for the Booklet Operations Center.
 * Counts run in the database against org + RBAC scope (not the list search filter).
 */

import {
  CommerceBookletBranchKey,
  CommerceOpsStage,
  CommerceOrderPaymentStatus,
} from "@/generated/prisma/enums";
import { COMMERCE_BOOKLET_BRANCH_KPI_LABELS } from "@/lib/commerce/booklet-branches";
import { tehranCivilDayBounds } from "@/lib/commerce/orders/date-range";
import { commerceAllowedBranchScope } from "@/lib/commerce/orders/filters";
import { PRODUCTION_DELAY_MS, READY_DELAY_MS } from "@/lib/commerce/orders/intelligence";
import { prisma } from "@/lib/prisma";

export type OrderOpsKpiCard = {
  key: string;
  label: string;
  value: number;
  hint: string;
  tone?: "default" | "warning" | "info" | "success" | "revenue";
};

export type OrderOpsKpiCounts = {
  todayOrders: number;
  waitingPayment: number;
  inProduction: number;
  ready: number;
  deliveredToday: number;
  todayRevenueRials: number;
  girls: number;
  boys: number;
  elementary: number;
  delayed: number;
  avgProcessingMinutes: number | null;
  avgDeliveryMinutes: number | null;
};

export function formatOrderOpsKpis(counts: OrderOpsKpiCounts): OrderOpsKpiCard[] {
  return [
    {
      key: "today",
      label: "سفارش امروز",
      value: counts.todayOrders,
      hint: "ثبت‌شده در تقویم تهران",
      tone: "info",
    },
    {
      key: "waitingPayment",
      label: "در انتظار پرداخت",
      value: counts.waitingPayment,
      hint: "هنوز وارد تولید نشده",
      tone: "warning",
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
      tone: "info",
    },
    {
      key: "deliveredToday",
      label: "تحویل امروز",
      value: counts.deliveredToday,
      hint: "تحویل حضوری امروز",
      tone: "success",
    },
    {
      key: "todayRevenue",
      label: "درآمد امروز",
      value: counts.todayRevenueRials,
      hint: "ریال · سفارش‌های پرداخت‌شده امروز",
      tone: "revenue",
    },
    {
      key: "delayed",
      label: "سفارش‌های معوق",
      value: counts.delayed,
      hint: "تأخیر تولید یا تحویل",
      tone: "warning",
    },
    {
      key: "avgProcessing",
      label: "میانگین پردازش",
      value: counts.avgProcessingMinutes ?? 0,
      hint: "دقیقه · تحویل‌های امروز",
    },
    {
      key: "avgDelivery",
      label: "میانگین تحویل",
      value: counts.avgDeliveryMinutes ?? 0,
      hint: "دقیقه · از آماده تا تحویل",
    },
    {
      key: "girls",
      label: COMMERCE_BOOKLET_BRANCH_KPI_LABELS.GIRLS,
      value: counts.girls,
      hint: "شعبه کاتالوگ",
    },
    {
      key: "boys",
      label: COMMERCE_BOOKLET_BRANCH_KPI_LABELS.BOYS,
      value: counts.boys,
      hint: "شعبه کاتالوگ",
    },
    {
      key: "elementary",
      label: COMMERCE_BOOKLET_BRANCH_KPI_LABELS.ELEMENTARY,
      value: counts.elementary,
      hint: "شعبه کاتالوگ",
    },
  ];
}

export async function loadOrderOpsKpiCounts(params: {
  organizationId: string;
  allowedBranchIds?: readonly string[] | null;
}): Promise<OrderOpsKpiCounts> {
  const scope = {
    organizationId: params.organizationId,
    ...commerceAllowedBranchScope(params.allowedBranchIds),
  };
  const today = tehranCivilDayBounds();

  const [
    todayOrders,
    waitingPayment,
    inProduction,
    ready,
    deliveredToday,
    todayRevenue,
    keyedBranches,
    delayed,
    processing,
    deliveryAvg,
  ] = await Promise.all([
    prisma.commerceOrder.count({
      where: { AND: [scope, { createdAt: { gte: today.from, lte: today.to } }] },
    }),
    prisma.commerceOrder.count({
      where: {
        AND: [
          scope,
          { opsStage: CommerceOpsStage.REGISTERED },
          { paymentStatus: { not: CommerceOrderPaymentStatus.PAID } },
        ],
      },
    }),
    prisma.commerceOrder.count({
      where: { AND: [scope, { opsStage: CommerceOpsStage.IN_PRODUCTION }] },
    }),
    prisma.commerceOrder.count({
      where: { AND: [scope, { opsStage: CommerceOpsStage.READY_FOR_PICKUP }] },
    }),
    prisma.commerceOrder.count({
      where: {
        AND: [
          scope,
          { opsStage: CommerceOpsStage.DELIVERED_TO_STUDENT },
          { deliveredAt: { gte: today.from, lte: today.to } },
        ],
      },
    }),
    prisma.commerceOrder.aggregate({
      where: {
        AND: [
          scope,
          { paymentStatus: CommerceOrderPaymentStatus.PAID },
          { createdAt: { gte: today.from, lte: today.to } },
        ],
      },
      _sum: { grandTotalRials: true },
    }),
    prisma.branch.findMany({
      where: {
        organizationId: params.organizationId,
        deletedAt: null,
        bookletOpsKey: { not: null },
      },
      select: { id: true, bookletOpsKey: true },
    }),
    prisma.commerceOrder.count({
      where: {
        AND: [
          scope,
          {
            OR: [
              {
                opsStage: CommerceOpsStage.IN_PRODUCTION,
                inProductionAt: { lte: new Date(Date.now() - PRODUCTION_DELAY_MS) },
              },
              {
                opsStage: CommerceOpsStage.READY_FOR_PICKUP,
                readyForPickupAt: { lte: new Date(Date.now() - READY_DELAY_MS) },
              },
            ],
          },
        ],
      },
    }),
    prisma.$queryRaw<Array<{ avg_sec: number | null }>>`
      SELECT AVG(EXTRACT(EPOCH FROM ("deliveredAt" - "createdAt"))) AS avg_sec
      FROM "commerce_orders"
      WHERE "organizationId" = ${params.organizationId}
        AND "deliveredAt" IS NOT NULL
        AND "deliveredAt" >= ${today.from}
        AND "deliveredAt" <= ${today.to}
    `,
    prisma.$queryRaw<Array<{ avg_sec: number | null }>>`
      SELECT AVG(EXTRACT(EPOCH FROM ("deliveredAt" - "readyForPickupAt"))) AS avg_sec
      FROM "commerce_orders"
      WHERE "organizationId" = ${params.organizationId}
        AND "deliveredAt" IS NOT NULL
        AND "readyForPickupAt" IS NOT NULL
        AND "deliveredAt" >= ${today.from}
        AND "deliveredAt" <= ${today.to}
    `,
  ]);

  const idsFor = (key: CommerceBookletBranchKey) =>
    keyedBranches.filter((row) => row.bookletOpsKey === key).map((row) => row.id);

  const boysIds = idsFor(CommerceBookletBranchKey.BOYS);
  const girlsIds = idsFor(CommerceBookletBranchKey.GIRLS);
  const elementaryIds = idsFor(CommerceBookletBranchKey.ELEMENTARY);

  const [boys, girls, elementary] = await Promise.all([
    boysIds.length
      ? prisma.commerceOrder.count({
          where: { AND: [scope, { branchId: { in: boysIds } }] },
        })
      : Promise.resolve(0),
    girlsIds.length
      ? prisma.commerceOrder.count({
          where: { AND: [scope, { branchId: { in: girlsIds } }] },
        })
      : Promise.resolve(0),
    elementaryIds.length
      ? prisma.commerceOrder.count({
          where: { AND: [scope, { branchId: { in: elementaryIds } }] },
        })
      : Promise.resolve(0),
  ]);

  return {
    todayOrders,
    waitingPayment,
    inProduction,
    ready,
    deliveredToday,
    todayRevenueRials: todayRevenue._sum.grandTotalRials ?? 0,
    girls,
    boys,
    elementary,
    delayed,
    avgProcessingMinutes:
      processing[0]?.avg_sec != null ? Math.round(Number(processing[0].avg_sec) / 60) : null,
    avgDeliveryMinutes:
      deliveryAvg[0]?.avg_sec != null ? Math.round(Number(deliveryAvg[0].avg_sec) / 60) : null,
  };
}

export async function loadOrderOpsKpis(params: {
  organizationId: string;
  allowedBranchIds?: readonly string[] | null;
}): Promise<OrderOpsKpiCard[]> {
  const counts = await loadOrderOpsKpiCounts(params);
  return formatOrderOpsKpis(counts);
}
