"use server";

import { redirect } from "next/navigation";
import {
  MembershipStatus,
  UserStatus,
} from "@/generated/prisma/enums";
import { isAdminPortalRole } from "@/lib/auth/constants";
import { verifyPassword } from "@/lib/auth/crypto";
import { getAdminSession } from "@/lib/auth/require-admin";
import {
  createAdminSession,
  revokeAdminSessionCookie,
  setAdminSessionCookie,
} from "@/lib/auth/session";
import { normalizeIranianMobile } from "@/lib/forms/normalize-mobile";
import { prisma } from "@/lib/prisma";

export type LoginState = {
  formError?: string;
};

const GENERIC_LOGIN_ERROR =
  "ورود ناموفق بود. اطلاعات ورود را بررسی کنید.";

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function normalizeIdentifier(raw: string): {
  email?: string;
  normalizedMobile?: string;
} {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {};
  }

  if (trimmed.includes("@")) {
    return { email: trimmed.toLowerCase() };
  }

  const mobile = normalizeIranianMobile(trimmed);
  if (mobile.ok) {
    return { normalizedMobile: mobile.normalized };
  }

  // Allow lookup by raw digits as last resort without leaking details.
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length >= 10) {
    return { normalizedMobile: digits.startsWith("98") ? `0${digits.slice(2)}` : digits };
  }

  return { email: trimmed.toLowerCase() };
}

export async function loginAdminAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const identifier = readString(formData, "identifier");
  const password = readString(formData, "password");
  const nextPath = readString(formData, "next").trim();

  if (!identifier.trim() || !password) {
    return { formError: GENERIC_LOGIN_ERROR };
  }

  const lookup = normalizeIdentifier(identifier);
  if (!lookup.email && !lookup.normalizedMobile) {
    return { formError: GENERIC_LOGIN_ERROR };
  }

  // Fixed dummy hash so missing-user path still exercises scrypt (anti-enumeration timing).
  const DUMMY_HASH =
    "scrypt$0123456789abcdef0123456789abcdef$0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

  const user = await prisma.user.findFirst({
    where: {
      deletedAt: null,
      OR: [
        ...(lookup.email ? [{ email: lookup.email }] : []),
        ...(lookup.normalizedMobile
          ? [{ normalizedMobile: lookup.normalizedMobile }]
          : []),
      ],
    },
    select: {
      id: true,
      passwordHash: true,
      status: true,
      isPlatformAdmin: true,
      memberships: {
        where: {
          deletedAt: null,
          status: MembershipStatus.ACTIVE,
          organization: { deletedAt: null, isActive: true },
        },
        select: { role: true },
        take: 5,
      },
    },
  });

  const passwordOk = verifyPassword(
    password,
    user?.passwordHash ?? DUMMY_HASH,
  );

  if (
    !user ||
    !user.passwordHash ||
    !passwordOk ||
    user.status !== UserStatus.ACTIVE
  ) {
    return { formError: GENERIC_LOGIN_ERROR };
  }

  const roleOk =
    user.isPlatformAdmin ||
    user.memberships.some((membership) => isAdminPortalRole(membership.role));

  if (!roleOk || user.memberships.length === 0) {
    return { formError: GENERIC_LOGIN_ERROR };
  }

  const { token, expiresAt } = await createAdminSession({
    userId: user.id,
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await setAdminSessionCookie(token, expiresAt);

  const safeNext =
    nextPath.startsWith("/admin") && !nextPath.startsWith("/admin/login")
      ? nextPath
      : "/admin";

  redirect(safeNext);
}

export async function logoutAdminAction(): Promise<void> {
  await revokeAdminSessionCookie();
  redirect("/admin/login");
}

export async function redirectIfAuthenticated(): Promise<void> {
  const session = await getAdminSession();
  if (session) {
    redirect("/admin");
  }
}
