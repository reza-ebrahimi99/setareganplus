import { cookies } from "next/headers";
import {
  PORTAL_ACTIVE_LINK_COOKIE,
  PORTAL_SESSION_COOKIE,
  PORTAL_SESSION_TTL_MS,
} from "@/lib/auth/cookie";
import { createSessionToken, hashSessionToken } from "@/lib/auth/crypto";
import { MembershipStatus, UserStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

export async function createPortalSession(params: {
  userId: string;
  organizationMembershipId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<{ token: string; expiresAt: Date }> {
  const membership = await prisma.organizationMembership.findFirst({
    where: {
      id: params.organizationMembershipId,
      userId: params.userId,
      status: MembershipStatus.ACTIVE,
      deletedAt: null,
      organization: { isActive: true, deletedAt: null },
      user: { status: UserStatus.ACTIVE, deletedAt: null },
    },
    select: { id: true },
  });
  if (!membership) throw new Error("INVALID_PORTAL_SESSION_MEMBERSHIP");

  const token = createSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + PORTAL_SESSION_TTL_MS);

  await prisma.adminSession.create({
    data: {
      userId: params.userId,
      organizationMembershipId: params.organizationMembershipId,
      tokenHash,
      expiresAt,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
    },
  });

  return { token, expiresAt };
}

export async function setPortalSessionCookie(
  token: string,
  expiresAt: Date,
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(PORTAL_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    priority: "high",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearPortalSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(PORTAL_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    priority: "high",
    path: "/",
    maxAge: 0,
  });
  cookieStore.set(PORTAL_ACTIVE_LINK_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function readPortalSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(PORTAL_SESSION_COOKIE)?.value;
  return value && value.length > 0 ? value : null;
}

export async function revokePortalSessionCookie(): Promise<void> {
  const token = await readPortalSessionToken();
  if (token) {
    const tokenHash = hashSessionToken(token);
    await prisma.adminSession.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  await clearPortalSessionCookie();
}

export async function setActivePortalLinkCookie(linkId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(PORTAL_ACTIVE_LINK_COOKIE, linkId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(PORTAL_SESSION_TTL_MS / 1000),
  });
}

export async function readActivePortalLinkCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(PORTAL_ACTIVE_LINK_COOKIE)?.value;
  return value && value.length > 0 ? value : null;
}
