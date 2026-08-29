import {
  MembershipStatus,
  UserStatus,
  type SystemRole,
} from "@/generated/prisma/enums";
import { ADMIN_PORTAL_ROLES, isAdminPortalRole } from "@/lib/auth/constants";
import { prisma } from "@/lib/prisma";

/**
 * Active staff membership for admin/staff OTP & password recovery.
 * Never returns STUDENT / PARENT memberships.
 */
export async function findActiveStaffMembershipByMobile(
  normalizedMobile: string,
) {
  const membership = await prisma.organizationMembership.findFirst({
    where: {
      deletedAt: null,
      status: MembershipStatus.ACTIVE,
      role: { in: [...ADMIN_PORTAL_ROLES] },
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

  if (!membership) return null;
  if (!isAdminPortalRole(membership.role as SystemRole)) return null;
  return membership;
}
