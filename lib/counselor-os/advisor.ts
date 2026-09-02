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
