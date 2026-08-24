"use server";

import { redirect } from "next/navigation";
import {
  AuditAction,
  MembershipStatus,
  OtpChallengeStatus,
  OtpPurpose,
  UserStatus,
} from "@/generated/prisma/enums";
import { isAdminPortalRole } from "@/lib/auth/constants";
import { hashPassword, verifyPassword } from "@/lib/auth/crypto";
import { getAdminSession } from "@/lib/auth/require-admin";
import { findActiveStaffMembershipByMobile } from "@/lib/auth/staff-login";
import {
  createAdminSession,
  readSessionRequestMetadata,
  revokeAdminSessionCookie,
  revokeAllAdminSessionsForUser,
  setAdminSessionCookie,
} from "@/lib/auth/session";
import { consumeOtp, requestOtp, verifyOtp } from "@/lib/communication/otp";
import { normalizeIranianMobile } from "@/lib/forms/normalize-mobile";
import { prisma } from "@/lib/prisma";

export type LoginState = {
  formError?: string;
};

export type AdminOtpLoginState = {
  phase: "mobile" | "otp";
  message?: string;
  error?: string;
  mobile?: string;
};

export type AdminPasswordResetState = {
  phase: "mobile" | "otp" | "reset";
  message?: string;
  error?: string;
  mobile?: string;
  challengeId?: string;
};

const GENERIC_LOGIN_ERROR =
  "ورود ناموفق بود. اطلاعات ورود را بررسی کنید.";
const GENERIC_OTP_REQUEST =
  "اگر حساب همکار فعالی برای این شماره وجود داشته باشد، کد ارسال شده است.";
const GENERIC_OTP_VERIFY = "کد تأیید نامعتبر یا منقضی است.";
const MIN_PASSWORD_LENGTH = 8;
const PASSWORD_RESET_WINDOW_MS = 10 * 60 * 1000;

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function field(formData: FormData, key: string): string {
  return readString(formData, key).trim();
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
    return {
      normalizedMobile: digits.startsWith("98")
        ? `0${digits.slice(2)}`
        : digits,
    };
  }

  return { email: trimmed.toLowerCase() };
}

function safeAdminNext(nextPath: string): string {
  return nextPath.startsWith("/admin") && !nextPath.startsWith("/admin/login")
    ? nextPath
    : "/admin";
}

async function completeStaffLogin(params: {
  userId: string;
  membershipId: string;
  organizationId: string;
  nextPath?: string;
  challengeId?: string;
}): Promise<void> {
  const requestMetadata = await readSessionRequestMetadata();
  const { token, expiresAt } = await createAdminSession({
    userId: params.userId,
    organizationMembershipId: params.membershipId,
    ...requestMetadata,
  });

  const now = new Date();
  await prisma.$transaction([
    prisma.user.update({
      where: { id: params.userId },
      data: {
        lastLoginAt: now,
        ...(params.challengeId ? { mobileVerifiedAt: now } : {}),
      },
    }),
    prisma.auditLog.create({
      data: {
        organizationId: params.organizationId,
        actorUserId: params.userId,
        action: AuditAction.LOGIN_SUCCESS,
        entityType: "AdminSession",
      },
    }),
    ...(params.challengeId
      ? [
          prisma.auditLog.create({
            data: {
              organizationId: params.organizationId,
              actorUserId: params.userId,
              action: AuditAction.OTP_VERIFIED,
              entityType: "OtpChallenge",
              entityId: params.challengeId,
            },
          }),
        ]
      : []),
  ]);

  await setAdminSessionCookie(token, expiresAt);
  redirect(safeAdminNext(params.nextPath ?? ""));
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
        select: { id: true, organizationId: true, role: true },
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

  const selectedMembership =
    user.memberships.find((membership) => isAdminPortalRole(membership.role)) ??
    (user.isPlatformAdmin ? user.memberships[0] : undefined);
  const roleOk = user.isPlatformAdmin || Boolean(selectedMembership);

  if (!roleOk || !selectedMembership) {
    return { formError: GENERIC_LOGIN_ERROR };
  }

  await completeStaffLogin({
    userId: user.id,
    membershipId: selectedMembership.id,
    organizationId: selectedMembership.organizationId,
    nextPath,
  });
  return {};
}

export async function requestAdminOtpLoginAction(
  _state: AdminOtpLoginState,
  formData: FormData,
): Promise<AdminOtpLoginState> {
  // TEMPORARY DEBUG — login OTP investigation. Remove once diagnosed.
  console.info("[login-debug] requestAdminOtpLoginAction ENTER");
  try {
    const rawMobile = field(formData, "mobile");
    // TEMPORARY DEBUG — login OTP investigation. Remove once diagnosed.
    console.info("[login-debug] requestAdminOtpLoginAction received mobile", {
      rawMobile,
    });

    const parsed = normalizeIranianMobile(rawMobile);
    // TEMPORARY DEBUG — login OTP investigation. Remove once diagnosed.
    console.info("[login-debug] requestAdminOtpLoginAction normalized mobile", {
      ok: parsed.ok,
      normalized: parsed.ok ? parsed.normalized : null,
      error: parsed.ok ? null : parsed.error,
    });
    // TEMPORARY DEBUG — login OTP investigation. Remove once diagnosed.
    console.info("[login-debug] requestAdminOtpLoginAction validation result", {
      valid: parsed.ok,
    });
    if (!parsed.ok) {
      // TEMPORARY DEBUG — login OTP investigation. Remove once diagnosed.
      console.info("[login-debug] requestAdminOtpLoginAction EARLY RETURN", {
        reason: "invalid_mobile",
      });
      return { phase: "mobile", error: "شماره موبایل معتبر وارد کنید." };
    }

    const membership = await findActiveStaffMembershipByMobile(parsed.normalized);
    // TEMPORARY DEBUG — login OTP investigation. Remove once diagnosed.
    console.info("[login-debug] requestAdminOtpLoginAction membership lookup", {
      found: Boolean(membership),
      membershipId: membership?.id ?? null,
      organizationId: membership?.organizationId ?? null,
      userId: membership?.user.id ?? null,
    });
    if (membership) {
      // TEMPORARY DEBUG — login OTP investigation. Remove once diagnosed.
      console.info("[login-debug] requestAdminOtpLoginAction BEFORE requestOtp", {
        organizationId: membership.organizationId,
        membershipId: membership.id,
      });
      const requested = await requestOtp({
        organizationId: membership.organizationId,
        mobile: parsed.normalized,
        purpose: OtpPurpose.STAFF_LOGIN,
        idempotencyKey: `admin-otp-login:${membership.id}:${Math.floor(Date.now() / 60_000)}`,
      });
      // TEMPORARY DEBUG — login OTP investigation. Remove once diagnosed.
      console.info("[login-debug] requestAdminOtpLoginAction AFTER requestOtp", {
        ok: requested.ok,
        challengeId: requested.ok ? requested.challengeId : null,
        error: requested.ok ? null : requested.error,
      });
      if (requested.ok) {
        await prisma.auditLog.create({
          data: {
            organizationId: membership.organizationId,
            actorUserId: membership.user.id,
            action: AuditAction.OTP_REQUESTED,
            entityType: "OtpChallenge",
            entityId: requested.challengeId,
          },
        });
      }
    } else {
      // TEMPORARY DEBUG — login OTP investigation. Remove once diagnosed.
      console.info("[login-debug] requestAdminOtpLoginAction requestOtp SKIPPED", {
        reason: "no_active_membership_for_mobile",
      });
    }

    return {
      phase: "otp",
      message: GENERIC_OTP_REQUEST,
      mobile: parsed.normalized,
    };
  } catch (error) {
    // TEMPORARY DEBUG — login OTP investigation. Remove once diagnosed.
    console.error("[login-debug] requestAdminOtpLoginAction THROWN EXCEPTION", {
      name: error instanceof Error ? error.name : typeof error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

export async function verifyAdminOtpLoginAction(
  _state: AdminOtpLoginState,
  formData: FormData,
): Promise<AdminOtpLoginState> {
  const parsed = normalizeIranianMobile(field(formData, "mobile"));
  const code = field(formData, "code");
  const nextPath = field(formData, "next");
  if (!parsed.ok || !code) {
    return {
      phase: "otp",
      error: GENERIC_OTP_VERIFY,
      mobile: field(formData, "mobile"),
    };
  }

  const membership = await findActiveStaffMembershipByMobile(parsed.normalized);
  if (!membership) {
    return {
      phase: "otp",
      error: GENERIC_OTP_VERIFY,
      mobile: parsed.normalized,
    };
  }

  const verified = await verifyOtp({
    organizationId: membership.organizationId,
    mobile: parsed.normalized,
    code,
    purpose: OtpPurpose.STAFF_LOGIN,
  });
  if (!verified.ok) {
    return {
      phase: "otp",
      error: GENERIC_OTP_VERIFY,
      mobile: parsed.normalized,
    };
  }

  const consumed = await consumeOtp({
    organizationId: membership.organizationId,
    challengeId: verified.challengeId,
  });
  if (!consumed.ok) {
    return {
      phase: "otp",
      error: GENERIC_OTP_VERIFY,
      mobile: parsed.normalized,
    };
  }

  await completeStaffLogin({
    userId: membership.user.id,
    membershipId: membership.id,
    organizationId: membership.organizationId,
    nextPath,
    challengeId: verified.challengeId,
  });
  return {
    phase: "otp",
    error: GENERIC_OTP_VERIFY,
    mobile: parsed.normalized,
  };
}

export async function requestAdminPasswordResetAction(
  _state: AdminPasswordResetState,
  formData: FormData,
): Promise<AdminPasswordResetState> {
  // TEMPORARY DEBUG — login OTP investigation. Remove once diagnosed.
  console.info("[login-debug] requestAdminPasswordResetAction ENTER");
  try {
    const rawMobile = field(formData, "mobile");
    // TEMPORARY DEBUG — login OTP investigation. Remove once diagnosed.
    console.info("[login-debug] requestAdminPasswordResetAction received mobile", {
      rawMobile,
    });

    const parsed = normalizeIranianMobile(rawMobile);
    // TEMPORARY DEBUG — login OTP investigation. Remove once diagnosed.
    console.info("[login-debug] requestAdminPasswordResetAction normalized mobile", {
      ok: parsed.ok,
      normalized: parsed.ok ? parsed.normalized : null,
      error: parsed.ok ? null : parsed.error,
    });
    // TEMPORARY DEBUG — login OTP investigation. Remove once diagnosed.
    console.info("[login-debug] requestAdminPasswordResetAction validation result", {
      valid: parsed.ok,
    });
    if (!parsed.ok) {
      // TEMPORARY DEBUG — login OTP investigation. Remove once diagnosed.
      console.info("[login-debug] requestAdminPasswordResetAction EARLY RETURN", {
        reason: "invalid_mobile",
      });
      return { phase: "mobile", error: "شماره موبایل معتبر وارد کنید." };
    }

    const membership = await findActiveStaffMembershipByMobile(parsed.normalized);
    // TEMPORARY DEBUG — login OTP investigation. Remove once diagnosed.
    console.info("[login-debug] requestAdminPasswordResetAction membership lookup", {
      found: Boolean(membership),
      membershipId: membership?.id ?? null,
      organizationId: membership?.organizationId ?? null,
      userId: membership?.user.id ?? null,
    });
    if (membership) {
      // TEMPORARY DEBUG — login OTP investigation. Remove once diagnosed.
      console.info("[login-debug] requestAdminPasswordResetAction BEFORE requestOtp", {
        organizationId: membership.organizationId,
        membershipId: membership.id,
      });
      const requested = await requestOtp({
        organizationId: membership.organizationId,
        mobile: parsed.normalized,
        purpose: OtpPurpose.STAFF_LOGIN,
        idempotencyKey: `admin-pw-reset:${membership.id}:${Math.floor(Date.now() / 60_000)}`,
      });
      // TEMPORARY DEBUG — login OTP investigation. Remove once diagnosed.
      console.info("[login-debug] requestAdminPasswordResetAction AFTER requestOtp", {
        ok: requested.ok,
        challengeId: requested.ok ? requested.challengeId : null,
        error: requested.ok ? null : requested.error,
      });
      if (requested.ok) {
        await prisma.auditLog.create({
          data: {
            organizationId: membership.organizationId,
            actorUserId: membership.user.id,
            action: AuditAction.OTP_REQUESTED,
            entityType: "OtpChallenge",
            entityId: requested.challengeId,
            metadata: { flow: "staff_password_reset" },
          },
        });
      }
    } else {
      // TEMPORARY DEBUG — login OTP investigation. Remove once diagnosed.
      console.info("[login-debug] requestAdminPasswordResetAction requestOtp SKIPPED", {
        reason: "no_active_membership_for_mobile",
      });
    }

    return {
      phase: "otp",
      message: GENERIC_OTP_REQUEST,
      mobile: parsed.normalized,
    };
  } catch (error) {
    // TEMPORARY DEBUG — login OTP investigation. Remove once diagnosed.
    console.error("[login-debug] requestAdminPasswordResetAction THROWN EXCEPTION", {
      name: error instanceof Error ? error.name : typeof error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

export async function verifyAdminPasswordResetOtpAction(
  _state: AdminPasswordResetState,
  formData: FormData,
): Promise<AdminPasswordResetState> {
  const parsed = normalizeIranianMobile(field(formData, "mobile"));
  const code = field(formData, "code");
  if (!parsed.ok || !code) {
    return {
      phase: "otp",
      error: GENERIC_OTP_VERIFY,
      mobile: field(formData, "mobile"),
    };
  }

  const membership = await findActiveStaffMembershipByMobile(parsed.normalized);
  if (!membership) {
    return {
      phase: "otp",
      error: GENERIC_OTP_VERIFY,
      mobile: parsed.normalized,
    };
  }

  const verified = await verifyOtp({
    organizationId: membership.organizationId,
    mobile: parsed.normalized,
    code,
    purpose: OtpPurpose.STAFF_LOGIN,
  });
  if (!verified.ok) {
    return {
      phase: "otp",
      error: GENERIC_OTP_VERIFY,
      mobile: parsed.normalized,
    };
  }

  await prisma.auditLog.create({
    data: {
      organizationId: membership.organizationId,
      actorUserId: membership.user.id,
      action: AuditAction.OTP_VERIFIED,
      entityType: "OtpChallenge",
      entityId: verified.challengeId,
      metadata: { flow: "staff_password_reset" },
    },
  });

  return {
    phase: "reset",
    message: "کد تأیید شد. رمز عبور جدید را وارد کنید.",
    mobile: parsed.normalized,
    challengeId: verified.challengeId,
  };
}

export async function resetAdminPasswordAction(
  _state: AdminPasswordResetState,
  formData: FormData,
): Promise<AdminPasswordResetState> {
  const parsed = normalizeIranianMobile(field(formData, "mobile"));
  const challengeId = field(formData, "challengeId");
  const password = readString(formData, "password");
  const confirm = readString(formData, "confirmPassword");

  if (!parsed.ok || !challengeId) {
    return {
      phase: "mobile",
      error: "نشست بازیابی منقضی شده است. دوباره تلاش کنید.",
    };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      phase: "reset",
      error: `رمز عبور باید حداقل ${MIN_PASSWORD_LENGTH} کاراکتر باشد.`,
      mobile: parsed.normalized,
      challengeId,
    };
  }

  if (password !== confirm) {
    return {
      phase: "reset",
      error: "تکرار رمز عبور یکسان نیست.",
      mobile: parsed.normalized,
      challengeId,
    };
  }

  const membership = await findActiveStaffMembershipByMobile(parsed.normalized);
  if (!membership) {
    return {
      phase: "mobile",
      error: "بازیابی برای این شماره ممکن نیست.",
    };
  }

  const challenge = await prisma.otpChallenge.findFirst({
    where: {
      id: challengeId,
      organizationId: membership.organizationId,
      normalizedMobile: parsed.normalized,
      purpose: OtpPurpose.STAFF_LOGIN,
      status: OtpChallengeStatus.VERIFIED,
    },
    select: { id: true, updatedAt: true },
  });

  if (
    !challenge ||
    Date.now() - challenge.updatedAt.getTime() > PASSWORD_RESET_WINDOW_MS
  ) {
    return {
      phase: "mobile",
      error: "نشست بازیابی منقضی شده است. دوباره تلاش کنید.",
    };
  }

  const consumed = await consumeOtp({
    organizationId: membership.organizationId,
    challengeId: challenge.id,
  });
  if (!consumed.ok) {
    return {
      phase: "mobile",
      error: "نشست بازیابی منقضی شده است. دوباره تلاش کنید.",
    };
  }

  const passwordHash = hashPassword(password);
  await prisma.user.update({
    where: { id: membership.user.id },
    data: {
      passwordHash,
      mobileVerifiedAt: new Date(),
    },
  });

  const revokedCount = await revokeAllAdminSessionsForUser(membership.user.id);

  await prisma.auditLog.create({
    data: {
      organizationId: membership.organizationId,
      actorUserId: membership.user.id,
      action: AuditAction.SECURITY_EVENT,
      entityType: "User",
      entityId: membership.user.id,
      metadata: {
        flow: "staff_password_reset",
        revokedAdminSessions: revokedCount,
      },
    },
  });

  return {
    phase: "mobile",
    message:
      "رمز عبور به‌روزرسانی شد. اکنون می‌توانید با رمز جدید وارد شوید.",
  };
}

export async function logoutAdminAction(): Promise<void> {
  const session = await getAdminSession();
  await revokeAdminSessionCookie();
  if (session) {
    await prisma.auditLog.create({
      data: {
        organizationId: session.organization.id,
        actorUserId: session.user.id,
        action: AuditAction.LOGOUT,
        entityType: "AdminSession",
        entityId: session.session.id,
      },
    });
  }
  redirect("/admin/login");
}

export async function redirectIfAuthenticated(): Promise<void> {
  const session = await getAdminSession();
  if (session) {
    redirect("/admin");
  }
}
