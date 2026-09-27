import {
  MembershipStatus,
  SystemRole,
  UserStatus,
} from "@/generated/prisma/enums";
import { isAdminPortalRole } from "@/lib/auth/constants";
import { prisma } from "@/lib/prisma";

const ACADEMY_LEARNER_FIRST = "دانش‌پذیر";
const ACADEMY_LEARNER_LAST = "آکادمی";

export async function provisionAcademyLearner(params: {
  organizationId: string;
  normalizedMobile: string;
}): Promise<{ userId: string; membershipId: string; created: boolean }> {
  const existingUser = await prisma.user.findFirst({
    where: { normalizedMobile: params.normalizedMobile, deletedAt: null },
    select: { id: true, firstName: true, lastName: true },
  });

  let userId: string;
  let created = false;

  if (existingUser) {
    userId = existingUser.id;
    await prisma.user.update({
      where: { id: userId },
      data: {
        mobile: params.normalizedMobile,
        status: UserStatus.ACTIVE,
      },
    });
  } else {
    const createdUser = await prisma.user.create({
      data: {
        mobile: params.normalizedMobile,
        normalizedMobile: params.normalizedMobile,
        firstName: ACADEMY_LEARNER_FIRST,
        lastName: ACADEMY_LEARNER_LAST,
        status: UserStatus.ACTIVE,
      },
      select: { id: true },
    });
    userId = createdUser.id;
    created = true;
  }

  const membership = await prisma.organizationMembership.findFirst({
    where: {
      organizationId: params.organizationId,
      userId,
      deletedAt: null,
    },
    select: { id: true, role: true, status: true },
  });

  if (membership) {
    if (
      !isAdminPortalRole(membership.role) &&
      membership.status !== MembershipStatus.ACTIVE
    ) {
      await prisma.organizationMembership.update({
        where: { id: membership.id },
        data: { status: MembershipStatus.ACTIVE },
      });
    }
    return { userId, membershipId: membership.id, created };
  }

  const createdMembership = await prisma.organizationMembership.create({
    data: {
      organizationId: params.organizationId,
      userId,
      role: SystemRole.STUDENT,
      status: MembershipStatus.ACTIVE,
    },
    select: { id: true },
  });

  return { userId, membershipId: createdMembership.id, created: true };
}
