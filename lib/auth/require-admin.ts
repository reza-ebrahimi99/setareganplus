import { redirect } from "next/navigation";
import {
  MembershipStatus,
  SystemRole,
  UserStatus,
  type SystemRole as SystemRoleValue,
} from "@/generated/prisma/enums";
import { isAdminPortalRole } from "@/lib/auth/constants";
import { hashSessionToken } from "@/lib/auth/crypto";
import { readAdminSessionToken } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export type AdminSessionContext = {
  user: {
    id: string;
    email: string | null;
    mobile: string | null;
    firstName: string;
    lastName: string;
    displayName: string;
    isPlatformAdmin: boolean;
  };
  organization: {
    id: string;
    slug: string;
    name: string;
  };
  membership: {
    id: string;
    role: SystemRoleValue;
  };
  session: {
    id: string;
    expiresAt: Date;
  };
};

function displayName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

/**
 * Resolves and authorizes the current admin session + organization membership.
 * Returns null when unauthenticated or unauthorized (never throws for missing session).
 */
export async function getAdminSession(): Promise<AdminSessionContext | null> {
  const token = await readAdminSessionToken();
  if (!token) {
    return null;
  }

  const tokenHash = hashSessionToken(token);
  const now = new Date();

  const session = await prisma.adminSession.findFirst({
    where: {
      tokenHash,
      revokedAt: null,
      expiresAt: { gt: now },
      user: {
        deletedAt: null,
        status: UserStatus.ACTIVE,
      },
    },
    select: {
      id: true,
      expiresAt: true,
      user: {
        select: {
          id: true,
          email: true,
          mobile: true,
          firstName: true,
          lastName: true,
          isPlatformAdmin: true,
          memberships: {
            where: {
              deletedAt: null,
              status: MembershipStatus.ACTIVE,
              organization: {
                deletedAt: null,
                isActive: true,
              },
            },
            orderBy: { createdAt: "asc" },
            take: 1,
            select: {
              id: true,
              role: true,
              organization: {
                select: {
                  id: true,
                  slug: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  const membership = session.user.memberships[0];
  if (!membership) {
    // Platform admin without membership is not enough for tenant form data.
    if (!session.user.isPlatformAdmin) {
      return null;
    }
    return null;
  }

  const roleAllowed =
    session.user.isPlatformAdmin ||
    membership.role === SystemRole.PLATFORM_ADMIN ||
    isAdminPortalRole(membership.role);

  if (!roleAllowed) {
    return null;
  }

  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      mobile: session.user.mobile,
      firstName: session.user.firstName,
      lastName: session.user.lastName,
      displayName: displayName(session.user.firstName, session.user.lastName),
      isPlatformAdmin: session.user.isPlatformAdmin,
    },
    organization: membership.organization,
    membership: {
      id: membership.id,
      role: membership.role,
    },
    session: {
      id: session.id,
      expiresAt: session.expiresAt,
    },
  };
}

/** Hard gate for admin pages and mutations — redirects to login when invalid. */
export async function requireAdminSession(): Promise<AdminSessionContext> {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }
  return session;
}

/** Soft gate for route handlers that should return 401 instead of redirect. */
export async function requireAdminSessionOrThrow(): Promise<AdminSessionContext> {
  const session = await getAdminSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

export async function getAuthenticatedOrganization(): Promise<{
  id: string;
  slug: string;
  name: string;
}> {
  const session = await requireAdminSession();
  return session.organization;
}
