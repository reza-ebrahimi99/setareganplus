"use server";

import { redirect } from "next/navigation";
import { AuditAction, OtpPurpose } from "@/generated/prisma/enums";
import { readSessionRequestMetadata } from "@/lib/auth/session";
import { consumeOtp, requestOtp, verifyOtp } from "@/lib/communication/otp";
import { normalizeIranianMobile } from "@/lib/forms/normalize-mobile";
import { prisma } from "@/lib/prisma";
import { PORTAL_NO_ACCESS_MESSAGE } from "@/lib/portal/auth";
import { findActivePortalAccessByMobile } from "@/lib/portal/auth/portal-login";
import {
  createPortalSession,
  setPortalSessionCookie,
} from "@/lib/portal/auth/session";

const GENERIC_REQUEST =
  "اگر حساب فعالی برای این شماره وجود داشته باشد، کد ورود ارسال شده است.";
const GENERIC_VERIFY = "کد ورود نامعتبر یا منقضی است.";

export type PortalLoginState = {
  phase: "mobile" | "otp";
  message?: string;
  error?: string;
  mobile?: string;
};

function field(formData: FormData, key: string): string {
  const item = formData.get(key);
  return typeof item === "string" ? item.trim() : "";
}

export async function requestPortalOtpAction(
  _state: PortalLoginState,
  formData: FormData,
): Promise<PortalLoginState> {
  // TEMPORARY DEBUG — login OTP investigation. Remove once diagnosed.
  console.info("[login-debug] requestPortalOtpAction ENTER");
  try {
    const rawMobile = field(formData, "mobile");
    // TEMPORARY DEBUG — login OTP investigation. Remove once diagnosed.
    console.info("[login-debug] requestPortalOtpAction received mobile", {
      rawMobile,
    });

    const parsed = normalizeIranianMobile(rawMobile);
    // TEMPORARY DEBUG — login OTP investigation. Remove once diagnosed.
    console.info("[login-debug] requestPortalOtpAction normalized mobile", {
      ok: parsed.ok,
      normalized: parsed.ok ? parsed.normalized : null,
      error: parsed.ok ? null : parsed.error,
    });
    // TEMPORARY DEBUG — login OTP investigation. Remove once diagnosed.
    console.info("[login-debug] requestPortalOtpAction validation result", {
      valid: parsed.ok,
    });
    if (!parsed.ok) {
      // TEMPORARY DEBUG — login OTP investigation. Remove once diagnosed.
      console.info("[login-debug] requestPortalOtpAction EARLY RETURN", {
        reason: "invalid_mobile",
      });
      return { phase: "mobile", error: "شماره موبایل معتبر وارد کنید." };
    }

    const access = await findActivePortalAccessByMobile(parsed.normalized);
    // TEMPORARY DEBUG — login OTP investigation. Remove once diagnosed.
    console.info("[login-debug] requestPortalOtpAction access lookup", {
      found: Boolean(access),
      organizationId: access?.organizationId ?? null,
      userId: access?.userId ?? null,
      membershipId: access?.membershipId ?? null,
    });
    if (access) {
      // TEMPORARY DEBUG — login OTP investigation. Remove once diagnosed.
      console.info("[login-debug] requestPortalOtpAction BEFORE requestOtp", {
        organizationId: access.organizationId,
        userId: access.userId,
      });
      const requested = await requestOtp({
        organizationId: access.organizationId,
        mobile: parsed.normalized,
        purpose: OtpPurpose.LOGIN,
        idempotencyKey: `portal-login:${access.userId}:${Math.floor(Date.now() / 60_000)}`,
      });
      // TEMPORARY DEBUG — login OTP investigation. Remove once diagnosed.
      console.info("[login-debug] requestPortalOtpAction AFTER requestOtp", {
        ok: requested.ok,
        challengeId: requested.ok ? requested.challengeId : null,
        error: requested.ok ? null : requested.error,
      });
      if (requested.ok) {
        await prisma.auditLog.create({
          data: {
            organizationId: access.organizationId,
            actorUserId: access.userId,
            action: AuditAction.OTP_REQUESTED,
            entityType: "OtpChallenge",
            entityId: requested.challengeId,
          },
        });
      }
    } else {
      // TEMPORARY DEBUG — login OTP investigation. Remove once diagnosed.
      console.info("[login-debug] requestPortalOtpAction requestOtp SKIPPED", {
        reason: "no_active_portal_access_for_mobile",
      });
    }

    return {
      phase: "otp",
      message: GENERIC_REQUEST,
      mobile: parsed.normalized,
    };
  } catch (error) {
    // TEMPORARY DEBUG — login OTP investigation. Remove once diagnosed.
    console.error("[login-debug] requestPortalOtpAction THROWN EXCEPTION", {
      name: error instanceof Error ? error.name : typeof error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

export async function verifyPortalOtpAction(
  _state: PortalLoginState,
  formData: FormData,
): Promise<PortalLoginState> {
  const parsed = normalizeIranianMobile(field(formData, "mobile"));
  const code = field(formData, "code");
  if (!parsed.ok || !code) {
    return {
      phase: "otp",
      error: GENERIC_VERIFY,
      mobile: field(formData, "mobile"),
    };
  }

  const access = await findActivePortalAccessByMobile(parsed.normalized);
  if (!access) {
    return {
      phase: "mobile",
      error: PORTAL_NO_ACCESS_MESSAGE,
    };
  }

  const verified = await verifyOtp({
    organizationId: access.organizationId,
    mobile: parsed.normalized,
    code,
    purpose: OtpPurpose.LOGIN,
  });
  if (!verified.ok) {
    return { phase: "otp", error: GENERIC_VERIFY, mobile: parsed.normalized };
  }

  const consumed = await consumeOtp({
    organizationId: access.organizationId,
    challengeId: verified.challengeId,
  });
  if (!consumed.ok) {
    return { phase: "otp", error: GENERIC_VERIFY, mobile: parsed.normalized };
  }

  const requestMetadata = await readSessionRequestMetadata();
  const { token, expiresAt } = await createPortalSession({
    userId: access.userId,
    organizationMembershipId: access.membershipId,
    ...requestMetadata,
  });

  const now = new Date();
  await prisma.$transaction([
    prisma.user.update({
      where: { id: access.userId },
      data: { lastLoginAt: now, mobileVerifiedAt: now },
    }),
    prisma.auditLog.create({
      data: {
        organizationId: access.organizationId,
        actorUserId: access.userId,
        action: AuditAction.LOGIN_SUCCESS,
        entityType: "PortalSession",
      },
    }),
    prisma.auditLog.create({
      data: {
        organizationId: access.organizationId,
        actorUserId: access.userId,
        action: AuditAction.OTP_VERIFIED,
        entityType: "OtpChallenge",
        entityId: verified.challengeId,
      },
    }),
  ]);

  await setPortalSessionCookie(token, expiresAt);
  redirect("/portal");
}
