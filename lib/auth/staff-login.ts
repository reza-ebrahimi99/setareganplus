import { MembershipStatus, UserStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

export async function findActiveStaffMembershipByMobile(
  normalizedMobile: string,
) {
  return prisma.organizationMembership.findFirst({
    where: {
      deletedAt: null,
      status: MembershipStatus.ACTIVE,
      organization: { deletedAt: null, isActive: true },
      user: {
        normalizedMobile,
        deletedAt: null,
        status: UserStatus.ACTIVE,
      },
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      organizationId: true,
      role: true,
      user: { select: { id: true } },
    },
  });
}
