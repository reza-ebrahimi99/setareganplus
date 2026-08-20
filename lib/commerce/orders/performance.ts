/**
 * Staff performance rollups for booklet operations.
 */

import {
  CommerceOpsStage,
  CommerceOrderEventType,
  CommerceOrderPaymentStatus,
} from "@/generated/prisma/enums";
import { commerceAllowedBranchScope } from "@/lib/commerce/orders/filters";
import { tehranCivilDayBounds, tehranPresetBounds } from "@/lib/commerce/orders/date-range";
import { prisma } from "@/lib/prisma";
import { PRODUCTION_DELAY_MS, READY_DELAY_MS } from "@/lib/commerce/orders/intelligence";

export type StaffOpsPerformanceRow = {
  userId: string;
  name: string;
  todayDeliveries: number;
  todayProduction: number;
  weekDeliveries: number;
  pendingPickup: number;
  delayed: number;
  avgDeliveryMinutes: number | null;
};

export type StaffOpsDashboard = {
  todayProduction: number;
  todayDeliveries: number;
  pendingPickup: number;
  delayedOrders: number;
  assignedToMe: number;
  completedToday: number;
  avgProcessingMinutes: number | null;
  avgDeliveryMinutes: number | null;
  leaderboard: StaffOpsPerformanceRow[];
};

function minutesFromSeconds(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value)) return null;
  return Math.round(value / 60);
}

export async function loadStaffOpsDashboard(params: {
  organizationId: string;
  userId: string;
  allowedBranchIds?: readonly string[] | null;
}): Promise<StaffOpsDashboard> {
  const scope = {
    organizationId: params.organizationId,
    ...commerceAllowedBranchScope(params.allowedBranchIds),
  };
  const today = tehranCivilDayBounds();
  const week = tehranPresetBounds("thisWeek");
  const productionCutoff = new Date(Date.now() - PRODUCTION_DELAY_MS);
  const readyCutoff = new Date(Date.now() - READY_DELAY_MS);

  const [
    todayProduction,
    todayDeliveries,
    pendingPickup,
    delayedOrders,
    assignedToMe,
    completedToday,
    processing,
    delivery,
    staffDelivered,
    productionEvents,
    staffAvg,
  ] = await Promise.all([
    prisma.commerceOrder.count({
      where: {
        AND: [
          scope,
          { opsStage: CommerceOpsStage.IN_PRODUCTION },
          { inProductionAt: { gte: today.from, lte: today.to } },
        ],
      },
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
    prisma.commerceOrder.count({
      where: { AND: [scope, { opsStage: CommerceOpsStage.READY_FOR_PICKUP }] },
    }),
    prisma.commerceOrder.count({
      where: {
        AND: [
          scope,
          {
            OR: [
              {
                opsStage: CommerceOpsStage.IN_PRODUCTION,
                inProductionAt: { lte: productionCutoff },
              },
              {
                opsStage: CommerceOpsStage.READY_FOR_PICKUP,
                readyForPickupAt: { lte: readyCutoff },
              },
            ],
          },
        ],
      },
    }),
    prisma.commerceOrder.count({
      where: {
        AND: [
          scope,
          { handoverStaffUserId: params.userId },
          { opsStage: { not: CommerceOpsStage.DELIVERED_TO_STUDENT } },
        ],
      },
    }),
    prisma.commerceOrder.count({
      where: {
        AND: [
          scope,
          { handoverStaffUserId: params.userId },
          { opsStage: CommerceOpsStage.DELIVERED_TO_STUDENT },
          { deliveredAt: { gte: today.from, lte: today.to } },
        ],
      },
    }),
    prisma.$queryRaw<Array<{ avg_sec: number | null }>>`
      SELECT AVG(EXTRACT(EPOCH FROM ("deliveredAt" - "createdAt"))) AS avg_sec
      FROM "commerce_orders"
      WHERE "organizationId" = ${params.organizationId}
        AND "paymentStatus" = ${CommerceOrderPaymentStatus.PAID}::"CommerceOrderPaymentStatus"
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
    prisma.commerceOrder.groupBy({
      by: ["handoverStaffUserId"],
      where: {
        AND: [
          scope,
          { handoverStaffUserId: { not: null } },
          { deliveredAt: { gte: week.from, lte: week.to } },
        ],
      },
      _count: { _all: true },
    }),
    prisma.commerceOrderEvent.groupBy({
      by: ["actorUserId"],
      where: {
        organizationId: params.organizationId,
        actorUserId: { not: null },
        eventType: CommerceOrderEventType.STAGE_CHANGED,
        stage: CommerceOpsStage.IN_PRODUCTION,
        occurredAt: { gte: today.from, lte: today.to },
      },
      _count: { _all: true },
    }),
    prisma.$queryRaw<Array<{ uid: string; avg_sec: number | null }>>`
      SELECT "handoverStaffUserId" AS uid,
             AVG(EXTRACT(EPOCH FROM ("deliveredAt" - "readyForPickupAt"))) AS avg_sec
      FROM "commerce_orders"
      WHERE "organizationId" = ${params.organizationId}
        AND "handoverStaffUserId" IS NOT NULL
        AND "deliveredAt" IS NOT NULL
        AND "readyForPickupAt" IS NOT NULL
        AND "deliveredAt" >= ${week.from}
        AND "deliveredAt" <= ${week.to}
      GROUP BY "handoverStaffUserId"
    `,
  ]);

  const todayByStaff = await prisma.commerceOrder.groupBy({
    by: ["handoverStaffUserId"],
    where: {
      AND: [
        scope,
        { handoverStaffUserId: { not: null } },
        { deliveredAt: { gte: today.from, lte: today.to } },
      ],
    },
    _count: { _all: true },
  });

  const userIds = [
    ...new Set(
      [
        ...staffDelivered.map((row) => row.handoverStaffUserId),
        ...todayByStaff.map((row) => row.handoverStaffUserId),
        ...productionEvents.map((row) => row.actorUserId),
      ].filter((id): id is string => Boolean(id)),
    ),
  ];

  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, firstName: true, lastName: true },
      })
    : [];
  const nameById = new Map(
    users.map((user) => [user.id, `${user.firstName} ${user.lastName}`.trim()]),
  );

  const pendingByStaff = await prisma.commerceOrder.groupBy({
    by: ["handoverStaffUserId"],
    where: {
      AND: [
        scope,
        { handoverStaffUserId: { not: null } },
        { opsStage: CommerceOpsStage.READY_FOR_PICKUP },
      ],
    },
    _count: { _all: true },
  });

  const delayedByStaff = await prisma.commerceOrder.groupBy({
    by: ["handoverStaffUserId"],
    where: {
      AND: [
        scope,
        { handoverStaffUserId: { not: null } },
        {
          OR: [
            {
              opsStage: CommerceOpsStage.IN_PRODUCTION,
              inProductionAt: { lte: productionCutoff },
            },
            {
              opsStage: CommerceOpsStage.READY_FOR_PICKUP,
              readyForPickupAt: { lte: readyCutoff },
            },
          ],
        },
      ],
    },
    _count: { _all: true },
  });

  const leaderboard: StaffOpsPerformanceRow[] = userIds.map((userId) => ({
    userId,
    name: nameById.get(userId) || "کارمند",
    todayDeliveries:
      todayByStaff.find((row) => row.handoverStaffUserId === userId)?._count._all ?? 0,
    todayProduction:
      productionEvents.find((row) => row.actorUserId === userId)?._count._all ?? 0,
    weekDeliveries:
      staffDelivered.find((row) => row.handoverStaffUserId === userId)?._count._all ?? 0,
    pendingPickup:
      pendingByStaff.find((row) => row.handoverStaffUserId === userId)?._count._all ?? 0,
    delayed:
      delayedByStaff.find((row) => row.handoverStaffUserId === userId)?._count._all ?? 0,
    avgDeliveryMinutes: minutesFromSeconds(
      staffAvg.find((row) => row.uid === userId)?.avg_sec != null
        ? Number(staffAvg.find((row) => row.uid === userId)?.avg_sec)
        : null,
    ),
  }));

  leaderboard.sort((a, b) => b.todayDeliveries - a.todayDeliveries || b.weekDeliveries - a.weekDeliveries);

  return {
    todayProduction,
    todayDeliveries,
    pendingPickup,
    delayedOrders,
    assignedToMe,
    completedToday,
    avgProcessingMinutes: minutesFromSeconds(processing[0]?.avg_sec ?? null),
    avgDeliveryMinutes: minutesFromSeconds(delivery[0]?.avg_sec ?? null),
    leaderboard,
  };
}
