import {
  AcademyEntitlementSource,
  AcademyOrderStatus,
} from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

function computeExpiry(params: {
  lifetimeAccess: boolean;
  accessDurationDays: number | null;
  defaultAccessDays: number | null;
  from: Date;
}): Date | null {
  if (params.lifetimeAccess) return null;
  const days = params.accessDurationDays ?? params.defaultAccessDays;
  if (!days || days <= 0) return null;
  const expires = new Date(params.from);
  expires.setUTCDate(expires.getUTCDate() + days);
  return expires;
}

export async function grantEntitlementsForPaidOrder(
  tx: Prisma.TransactionClient,
  params: { organizationId: string; orderId: string; paidAt: Date },
): Promise<void> {
  const order = await tx.academyOrder.findFirst({
    where: {
      id: params.orderId,
      organizationId: params.organizationId,
      status: AcademyOrderStatus.PAID,
    },
    include: {
      items: true,
    },
  });
  if (!order) return;

  const settings = await tx.academySettings.findUnique({
    where: { organizationId: params.organizationId },
  });

  for (const item of order.items) {
    if (item.courseId) {
      const course = await tx.academyCourse.findFirst({
        where: { id: item.courseId, organizationId: params.organizationId },
        select: {
          id: true,
          lifetimeAccess: true,
          accessDurationDays: true,
        },
      });
      if (!course) continue;

      const existing = await tx.academyContentEntitlement.findFirst({
        where: {
          organizationId: params.organizationId,
          userId: order.userId,
          courseId: course.id,
          lessonId: null,
          revokedAt: null,
        },
        select: { id: true },
      });
      if (existing) continue;

      await tx.academyContentEntitlement.create({
        data: {
          organizationId: params.organizationId,
          userId: order.userId,
          courseId: course.id,
          source: AcademyEntitlementSource.PURCHASE,
          orderId: order.id,
          expiresAt: computeExpiry({
            lifetimeAccess: course.lifetimeAccess,
            accessDurationDays: course.accessDurationDays,
            defaultAccessDays: settings?.defaultAccessDays ?? null,
            from: params.paidAt,
          }),
        },
      });
    }

    if (item.lessonId) {
      const lesson = await tx.academyLesson.findFirst({
        where: { id: item.lessonId, organizationId: params.organizationId },
        select: { id: true, courseId: true },
      });
      if (!lesson) continue;

      const existing = await tx.academyContentEntitlement.findFirst({
        where: {
          organizationId: params.organizationId,
          userId: order.userId,
          lessonId: lesson.id,
          revokedAt: null,
        },
        select: { id: true },
      });
      if (existing) continue;

      await tx.academyContentEntitlement.create({
        data: {
          organizationId: params.organizationId,
          userId: order.userId,
          courseId: lesson.courseId,
          lessonId: lesson.id,
          source: AcademyEntitlementSource.PURCHASE,
          orderId: order.id,
          expiresAt: computeExpiry({
            lifetimeAccess: false,
            accessDurationDays: settings?.defaultAccessDays ?? null,
            defaultAccessDays: settings?.defaultAccessDays ?? null,
            from: params.paidAt,
          }),
        },
      });
    }
  }
}

export async function adminGrantEntitlement(params: {
  organizationId: string;
  userId: string;
  courseId?: string | null;
  lessonId?: string | null;
  expiresAt?: Date | null;
  note?: string | null;
  grantedByUserId: string;
}) {
  if (!params.courseId && !params.lessonId) {
    throw new Error("COURSE_OR_LESSON_REQUIRED");
  }

  return prisma.academyContentEntitlement.create({
    data: {
      organizationId: params.organizationId,
      userId: params.userId,
      courseId: params.courseId ?? null,
      lessonId: params.lessonId ?? null,
      source: AcademyEntitlementSource.ADMIN_GRANT,
      expiresAt: params.expiresAt ?? null,
      note: params.note ?? null,
      grantedByUserId: params.grantedByUserId,
    },
  });
}
