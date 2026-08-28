/**
 * Internal booklet ops notifications — reuses StaffNotification.
 */

import { SystemRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import type { CommerceOrderDb } from "@/lib/commerce/orders/timeline";

export const COMMERCE_OPS_NOTIFICATION_ENTITY = "COMMERCE_ORDER" as const;

export type CommerceOpsNotifyKind =
  | "NEW_ORDER"
  | "PAYMENT_RECEIVED"
  | "ENTERED_PRODUCTION"
  | "READY"
  | "DELIVERED"
  | "DELAYED"
  | "ROLLBACK";

const TITLES: Record<CommerceOpsNotifyKind, string> = {
  NEW_ORDER: "سفارش جدید ثبت شد",
  PAYMENT_RECEIVED: "پرداخت ثبت شد",
  ENTERED_PRODUCTION: "ورود به تولید",
  READY: "آماده تحویل",
  DELIVERED: "تحویل شد",
  DELAYED: "سفارش معوق",
  ROLLBACK: "بازگشت مرحله",
};

export async function notifyCommerceOpsStaff(params: {
  db?: CommerceOrderDb;
  organizationId: string;
  orderId: string;
  kind: CommerceOpsNotifyKind;
  body?: string | null;
  actorUserId?: string | null;
}): Promise<void> {
  const db = params.db ?? prisma;
  const staff = await db.organizationMembership.findMany({
    where: {
      organizationId: params.organizationId,
      deletedAt: null,
      status: "ACTIVE",
      role: { notIn: [SystemRole.STUDENT, SystemRole.PARENT] },
      user: { deletedAt: null, status: "ACTIVE" },
    },
    select: { userId: true },
    take: 80,
  });
  const userIds = [...new Set(staff.map((row) => row.userId))].filter(
    (id) => id !== params.actorUserId,
  );
  if (userIds.length === 0) return;

  await db.staffNotification.createMany({
    data: userIds.map((userId) => ({
      organizationId: params.organizationId,
      userId,
      title: TITLES[params.kind],
      body: params.body ?? null,
      entityType: COMMERCE_OPS_NOTIFICATION_ENTITY,
      entityId: params.orderId,
    })),
  });
}

export async function listCommerceOpsNotifications(params: {
  organizationId: string;
  userId: string;
  take?: number;
}) {
  const take = Math.min(Math.max(params.take ?? 12, 1), 40);
  const [unreadCount, latest] = await Promise.all([
    prisma.staffNotification.count({
      where: {
        organizationId: params.organizationId,
        userId: params.userId,
        readAt: null,
        entityType: COMMERCE_OPS_NOTIFICATION_ENTITY,
      },
    }),
    prisma.staffNotification.findMany({
      where: {
        organizationId: params.organizationId,
        userId: params.userId,
        entityType: COMMERCE_OPS_NOTIFICATION_ENTITY,
      },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        title: true,
        body: true,
        entityId: true,
        readAt: true,
        createdAt: true,
      },
    }),
  ]);
  return { unreadCount, latest };
}

export async function markCommerceOpsNotificationsRead(params: {
  organizationId: string;
  userId: string;
}): Promise<void> {
  await prisma.staffNotification.updateMany({
    where: {
      organizationId: params.organizationId,
      userId: params.userId,
      entityType: COMMERCE_OPS_NOTIFICATION_ENTITY,
      readAt: null,
    },
    data: { readAt: new Date() },
  });
}
