/**
 * Resolve BookingAdvisor profile for the signed-in counselor user.
 */

import { prisma } from "@/lib/prisma";

export async function resolveCounselorBookingAdvisor(params: {
  organizationId: string;
  userId: string;
}) {
  return prisma.bookingAdvisor.findFirst({
    where: {
      organizationId: params.organizationId,
      userId: params.userId,
      isActive: true,
      deletedAt: null,
    },
    select: {
      id: true,
      displayName: true,
      userId: true,
    },
  });
}

export async function listUnlinkedBookingAdvisors(organizationId: string) {
  return prisma.bookingAdvisor.findMany({
    where: {
      organizationId,
      isActive: true,
      deletedAt: null,
      userId: null,
    },
    select: { id: true, displayName: true },
    orderBy: { displayName: "asc" },
    take: 50,
  });
}

export async function linkCounselorBookingAdvisor(params: {
  organizationId: string;
  userId: string;
  advisorId: string;
  canReview: boolean;
}) {
  if (!params.canReview) {
    throw new Error("فقط مدیر/ناظر می‌تواند پروفایل نوبت‌دهی را متصل کند.");
  }

  const already = await resolveCounselorBookingAdvisor({
    organizationId: params.organizationId,
    userId: params.userId,
  });
  if (already) {
    throw new Error("این حساب از قبل به یک پروفایل نوبت‌دهی متصل است.");
  }

  const advisor = await prisma.bookingAdvisor.findFirst({
    where: {
      id: params.advisorId,
      organizationId: params.organizationId,
      deletedAt: null,
    },
    select: { id: true, userId: true, displayName: true },
  });
  if (!advisor) throw new Error("پروفایل مشاور یافت نشد.");
  if (advisor.userId && advisor.userId !== params.userId) {
    throw new Error("این پروفایل به حساب دیگری متصل است.");
  }

  return prisma.bookingAdvisor.update({
    where: { id: advisor.id },
    data: { userId: params.userId },
    select: { id: true, displayName: true, userId: true },
  });
}
