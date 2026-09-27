import { MembershipStatus, UserStatus } from "@/generated/prisma/enums";
import { hashSessionToken } from "@/lib/auth/crypto";
import { readPortalSessionToken } from "@/lib/portal/auth/session";
import { prisma } from "@/lib/prisma";

export type AcademySessionContext = {
  userId: string;
  organizationId: string;
  membershipId: string;
  sessionId: string;
  displayName: string;
  mobile: string | null;
  firstName: string;
  lastName: string;
};

function displayName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

/**
 * Academy auth uses the same opaque portal session cookie but does not require
 * PortalAccountLink rows (library learners may exist without institute student records).
 */
export async function resolveAcademySession(): Promise<AcademySessionContext | null> {
  const token = await readPortalSessionToken();
  if (!token) return null;

  const tokenHash = hashSessionToken(token);
  const now = new Date();

  const session = await prisma.adminSession.findFirst({
    where: {
      tokenHash,
      revokedAt: null,
      expiresAt: { gt: now },
      user: { deletedAt: null, status: UserStatus.ACTIVE },
    },
    select: {
      id: true,
      organizationMembershipId: true,
      user: {
        select: {
          id: true,
          mobile: true,
          firstName: true,
          lastName: true,
        },
      },
      membership: {
        select: {
          id: true,
          status: true,
          deletedAt: true,
          organizationId: true,
          organization: {
            select: { isActive: true, deletedAt: true },
          },
        },
      },
    },
  });

  if (!session?.membership) return null;
  const membership = session.membership;
  if (
    membership.status !== MembershipStatus.ACTIVE ||
    membership.deletedAt ||
    !membership.organization.isActive ||
    membership.organization.deletedAt
  ) {
    return null;
  }

  return {
    userId: session.user.id,
    organizationId: membership.organizationId,
    membershipId: membership.id,
    sessionId: session.id,
    displayName: displayName(session.user.firstName, session.user.lastName),
    mobile: session.user.mobile,
    firstName: session.user.firstName,
    lastName: session.user.lastName,
  };
}

export async function requireAcademySession(): Promise<AcademySessionContext> {
  const ctx = await resolveAcademySession();
  if (!ctx) throw new Error("ACADEMY_UNAUTHORIZED");
  return ctx;
}
