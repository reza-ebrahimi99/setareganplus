import { MembershipStatus, UserStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

export async function findActivePortalAccessByMobile(normalizedMobile: string) {
  const link = await prisma.portalAccountLink.findFirst({
    where: {
      deletedAt: null,
      isActive: true,
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
      user: {
        select: {
          id: true,
          memberships: {
            where: {
              deletedAt: null,
              status: MembershipStatus.ACTIVE,
              organization: { deletedAt: null, isActive: true },
            },
            select: { id: true, organizationId: true },
          },
        },
      },
    },
  });

  if (!link) return null;

  const membership = link.user.memberships.find(
    (row) => row.organizationId === link.organizationId,
  );
  if (!membership) return null;

  return {
    userId: link.user.id,
    organizationId: link.organizationId,
    membershipId: membership.id,
  };
}
