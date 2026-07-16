import { cookies, headers } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_TTL_MS,
} from "@/lib/auth/cookie";
import { createSessionToken, hashSessionToken } from "@/lib/auth/crypto";
import { prisma } from "@/lib/prisma";
import { MembershipStatus, UserStatus } from "@/generated/prisma/enums";

export async function createAdminSession(params: {
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
  if (!membership) throw new Error("INVALID_SESSION_MEMBERSHIP");

  const token = createSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + ADMIN_SESSION_TTL_MS);

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

export async function readSessionRequestMetadata(): Promise<{
  ipAddress: string | null;
  userAgent: string | null;
}> {
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for");
  const ipAddress =
    forwarded?.split(",")[0]?.trim() ||
    requestHeaders.get("x-real-ip")?.trim() ||
    null;
  return {
    ipAddress: ipAddress?.slice(0, 64) ?? null,
    userAgent: requestHeaders.get("user-agent")?.slice(0, 512) ?? null,
  };
}

export async function setAdminSessionCookie(
  token: string,
  expiresAt: Date,
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    priority: "high",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearAdminSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    priority: "high",
    path: "/",
    maxAge: 0,
  });
}

export async function readAdminSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  return value && value.length > 0 ? value : null;
}

export async function revokeAdminSessionByToken(
  token: string,
): Promise<void> {
  const tokenHash = hashSessionToken(token);
  await prisma.adminSession.updateMany({
    where: {
      tokenHash,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}

export async function revokeAdminSessionCookie(): Promise<void> {
  const token = await readAdminSessionToken();
  if (token) {
    await revokeAdminSessionByToken(token);
  }
  await clearAdminSessionCookie();
}
