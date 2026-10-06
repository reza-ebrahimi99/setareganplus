import { MembershipStatus, UserStatus } from "@/generated/prisma/enums";
import { hashSessionToken } from "@/lib/auth/crypto";
import { readPortalSessionToken } from "@/lib/portal/auth/session";
import { prisma } from "@/lib/prisma";

export type ChallengeSessionContext = {
  sessionId: string;
  userId: string;
  membershipId: string;
  organizationId: string;
  displayName: string;
  mobile: string | null;
};

export async function resolveChallengeSession(): Promise<ChallengeSessionContext | null> {
  const token = await readPortalSessionToken();
  if (!token) return null;

  const session = await prisma.adminSession.findFirst({
    where: {
      tokenHash: hashSessionToken(token),
      revokedAt: null,
      expiresAt: { gt: new Date() },
      user: { deletedAt: null, status: UserStatus.ACTIVE },
    },
    select: {
      id: true,
      user: { select: { id: true, firstName: true, lastName: true, mobile: true } },
      membership: {
        select: {
          id: true,
          organizationId: true,
          status: true,
          deletedAt: true,
          organization: { select: { isActive: true, deletedAt: true } },
        },
      },
    },
  });

  const membership = session?.membership;
  if (
    !session ||
    !membership ||
    membership.status !== MembershipStatus.ACTIVE ||
    membership.deletedAt ||
    !membership.organization.isActive ||
    membership.organization.deletedAt
  ) {
    return null;
  }

  return {
    sessionId: session.id,
    userId: session.user.id,
    membershipId: membership.id,
    organizationId: membership.organizationId,
    displayName: `${session.user.firstName} ${session.user.lastName}`.trim(),
    mobile: session.user.mobile,
  };
}

export async function requireChallengeSession(): Promise<ChallengeSessionContext> {
  const session = await resolveChallengeSession();
  if (!session) throw new Error("CHALLENGE_UNAUTHORIZED");
  return session;
}

