/**
 * Daily production queue — booklet-centric rollup, not a raw order list.
 */

import {
  CommerceBookletBranchKey,
  CommerceOpsStage,
} from "@/generated/prisma/enums";
import { commerceAllowedBranchScope } from "@/lib/commerce/orders/filters";
import { COMMERCE_STUDENT_GRADE_LABELS } from "@/lib/commerce/student-fields";
import { prisma } from "@/lib/prisma";
import { tehranCivilDayBounds } from "@/lib/commerce/orders/date-range";

export type ProductionQueueStatus = "printing" | "ready" | "waiting";

export type ProductionQueueRow = {
  key: string;
  bookletTitle: string;
  gradeLabel: string | null;
  todayCopies: number;
  girls: number;
  boys: number;
  elementary: number;
  printing: number;
  ready: number;
  waiting: number;
  status: ProductionQueueStatus;
};

export async function loadProductionQueue(params: {
  organizationId: string;
  allowedBranchIds?: readonly string[] | null;
}): Promise<ProductionQueueRow[]> {
  const scope = {
    organizationId: params.organizationId,
    ...commerceAllowedBranchScope(params.allowedBranchIds),
  };
  const today = tehranCivilDayBounds();

  const orders = await prisma.commerceOrder.findMany({
    where: {
      AND: [
        scope,
        {
          OR: [
            { createdAt: { gte: today.from, lte: today.to } },
            {
              opsStage: {
                in: [
                  CommerceOpsStage.PAID,
                  CommerceOpsStage.IN_PRODUCTION,
                  CommerceOpsStage.READY_FOR_PICKUP,
                ],
              },
            },
          ],
        },
      ],
    },
    select: {
      opsStage: true,
      studentGrade: true,
      createdAt: true,
      branch: { select: { bookletOpsKey: true } },
      items: {
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { titleSnapshot: true, quantity: true },
      },
    },
  });

  const buckets = new Map<string, ProductionQueueRow>();
  for (const order of orders) {
    const title = order.items[0]?.titleSnapshot ?? "جزوه";
    const qty = order.items.reduce((sum, item) => sum + item.quantity, 0) || 1;
    const gradeLabel = order.studentGrade
      ? COMMERCE_STUDENT_GRADE_LABELS[order.studentGrade]
      : null;
    const key = `${title}::${order.studentGrade ?? ""}`;
    const current = buckets.get(key) ?? {
      key,
      bookletTitle: title,
      gradeLabel,
      todayCopies: 0,
      girls: 0,
      boys: 0,
      elementary: 0,
      printing: 0,
      ready: 0,
      waiting: 0,
      status: "waiting" as ProductionQueueStatus,
    };
    const isToday =
      order.createdAt >= today.from && order.createdAt <= today.to;
    if (isToday) current.todayCopies += qty;
    if (order.branch?.bookletOpsKey === CommerceBookletBranchKey.GIRLS) {
      current.girls += qty;
    } else if (order.branch?.bookletOpsKey === CommerceBookletBranchKey.BOYS) {
      current.boys += qty;
    } else if (order.branch?.bookletOpsKey === CommerceBookletBranchKey.ELEMENTARY) {
      current.elementary += qty;
    }
    if (order.opsStage === CommerceOpsStage.IN_PRODUCTION) current.printing += qty;
    else if (order.opsStage === CommerceOpsStage.READY_FOR_PICKUP) current.ready += qty;
    else if (order.opsStage !== CommerceOpsStage.DELIVERED_TO_STUDENT) {
      current.waiting += qty;
    }
    buckets.set(key, current);
  }

  return [...buckets.values()]
    .map((row) => ({
      ...row,
      status: (row.printing > 0
        ? "printing"
        : row.ready > 0
          ? "ready"
          : "waiting") as ProductionQueueStatus,
    }))
    .sort((a, b) => b.todayCopies + b.printing + b.ready - (a.todayCopies + a.printing + a.ready));
}
