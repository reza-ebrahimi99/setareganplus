"use server";

import { redirect } from "next/navigation";
import { AuditAction, OtpPurpose } from "@/generated/prisma/enums";
import { readSessionRequestMetadata } from "@/lib/auth/session";
import { consumeOtp, requestOtp, verifyOtp } from "@/lib/communication/otp";
import { normalizeIranianMobile } from "@/lib/forms/normalize-mobile";
import { isGuidanceEnabled } from "@/lib/guidance/feature-flags";
import {
  GUIDANCE_ONBOARDING_PATH,
  candidateNeedsGuidanceOnboarding,
  provisionExternalGuidanceCandidate,
} from "@/lib/guidance/external-candidate";
import { getPublicOrganizationBySlug } from "@/lib/organizations/get-current-organization";
import { prisma } from "@/lib/prisma";
import { PORTAL_NO_ACCESS_MESSAGE } from "@/lib/portal/auth";
import { findActivePortalAccessByMobile } from "@/lib/portal/auth/portal-login";
import {
  createPortalSession,
  setPortalSessionCookie,
} from "@/lib/portal/auth/session";

const GENERIC_REQUEST = "کد ورود به شماره موبایل شما ارسال شد.";
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

/**
 * Always request OTP for any valid mobile (existing portal users and
 * new external Guidance candidates). Never silently skip SMS.
 */
export async function requestPortalOtpAction(
  _state: PortalLoginState,
  formData: FormData,
): Promise<PortalLoginState> {
  const parsed = normalizeIranianMobile(field(formData, "mobile"));
  if (!parsed.ok) {
    return { phase: "mobile", error: "شماره موبایل معتبر وارد کنید." };
  }

  const access = await findActivePortalAccessByMobile(parsed.normalized);
  const organizationId =
    access?.organizationId ??
    (await getPublicOrganizationBySlug()).id;

  const requested = await requestOtp({
    organizationId,
    mobile: parsed.normalized,
    purpose: OtpPurpose.LOGIN,
    idempotencyKey: access
      ? `portal-login:${access.userId}:${Math.floor(Date.now() / 60_000)}`
      : `portal-login-external:${parsed.normalized}:${Math.floor(Date.now() / 60_000)}`,
  });

  if (requested.ok) {
    await prisma.auditLog.create({
      data: {
        organizationId,
        actorUserId: access?.userId ?? null,
        action: AuditAction.OTP_REQUESTED,
        entityType: "OtpChallenge",
        entityId: requested.challengeId,
        metadata: {
          flow: access ? "portal-login" : "portal-external-candidate",
        },
      },
    });
  }

  return {
    phase: "otp",
    message: GENERIC_REQUEST,
    mobile: parsed.normalized,
  };
}

async function resolvePostLoginRedirect(params: {
  organizationId: string;
  userId: string;
}): Promise<string> {
  const link = await prisma.portalAccountLink.findFirst({
    where: {
      organizationId: params.organizationId,
      userId: params.userId,
      deletedAt: null,
      isActive: true,
      studentId: { not: null },
    },
    orderBy: { createdAt: "asc" },
    select: { studentId: true },
  });
  if (!link?.studentId) {
    return "/portal";
  }

  const needs = await candidateNeedsGuidanceOnboarding({
    organizationId: params.organizationId,
    userId: params.userId,
    studentId: link.studentId,
  });
  return needs ? GUIDANCE_ONBOARDING_PATH : "/portal";
}

/**
 * Verify OTP. Existing portal users log in normally.
 * Unknown mobiles (Guidance enabled) become external candidates and
 * are redirected to Guidance onboarding.
 */
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
  const publicOrganization = await getPublicOrganizationBySlug();
  const organizationId = access?.organizationId ?? publicOrganization.id;

  if (!access) {
    const guidanceOn = await isGuidanceEnabled(organizationId);
    if (!guidanceOn) {
      return {
        phase: "mobile",
        error: PORTAL_NO_ACCESS_MESSAGE,
      };
    }
  }

  const verified = await verifyOtp({
    organizationId,
    mobile: parsed.normalized,
    code,
    purpose: OtpPurpose.LOGIN,
  });
  if (!verified.ok) {
    return { phase: "otp", error: GENERIC_VERIFY, mobile: parsed.normalized };
  }

  const consumed = await consumeOtp({
    organizationId,
    challengeId: verified.challengeId,
  });
  if (!consumed.ok) {
    return { phase: "otp", error: GENERIC_VERIFY, mobile: parsed.normalized };
  }

  const requestMetadata = await readSessionRequestMetadata();

  let userId: string;
  let membershipId: string;
  let redirectPath = "/portal";

  if (access) {
    userId = access.userId;
    membershipId = access.membershipId;
    redirectPath = await resolvePostLoginRedirect({
      organizationId: access.organizationId,
      userId: access.userId,
    });
  } else {
    const provisioned = await provisionExternalGuidanceCandidate({
      organizationId,
      normalizedMobile: parsed.normalized,
      ipAddress: requestMetadata.ipAddress,
      userAgent: requestMetadata.userAgent,
    });
    if (!provisioned.ok) {
      return {
        phase: "otp",
        error: provisioned.error,
        mobile: parsed.normalized,
      };
    }
    userId = provisioned.userId;
    membershipId = provisioned.membershipId;
    redirectPath = GUIDANCE_ONBOARDING_PATH;
  }

  const { token, expiresAt } = await createPortalSession({
    userId,
    organizationMembershipId: membershipId,
    ...requestMetadata,
  });

  const now = new Date();
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: now, mobileVerifiedAt: now },
    }),
    prisma.auditLog.create({
      data: {
        organizationId,
        actorUserId: userId,
        action: AuditAction.LOGIN_SUCCESS,
        entityType: "PortalSession",
        metadata: {
          flow: access ? "portal-login" : "portal-external-candidate",
        },
      },
    }),
    prisma.auditLog.create({
      data: {
        organizationId,
        actorUserId: userId,
        action: AuditAction.OTP_VERIFIED,
        entityType: "OtpChallenge",
        entityId: verified.challengeId,
      },
    }),
  ]);

  await setPortalSessionCookie(token, expiresAt);
  redirect(redirectPath);
}
