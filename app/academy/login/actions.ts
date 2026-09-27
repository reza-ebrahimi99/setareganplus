"use server";

import { redirect } from "next/navigation";
import { AuditAction, OtpPurpose } from "@/generated/prisma/enums";
import { readSessionRequestMetadata } from "@/lib/auth/session";
import { provisionAcademyLearner } from "@/lib/academy/auth/provision-learner";
import { getAcademyOrganizationId } from "@/lib/academy/config";
import { consumeOtp, requestOtp, verifyOtp } from "@/lib/communication/otp";
import { normalizeIranianMobile } from "@/lib/forms/normalize-mobile";
import { isSafeRelativePath } from "@/lib/guidance/office/relative-url";
import { prisma } from "@/lib/prisma";
import {
  createPortalSession,
  setPortalSessionCookie,
} from "@/lib/portal/auth/session";

const GENERIC_REQUEST = "کد ورود به شماره موبایل شما ارسال شد.";
const GENERIC_VERIFY = "کد ورود نامعتبر یا منقضی است.";

export type AcademyLoginState = {
  phase: "mobile" | "otp";
  message?: string;
  error?: string;
  mobile?: string;
  next?: string;
};

function field(formData: FormData, key: string): string {
  const item = formData.get(key);
  return typeof item === "string" ? item.trim() : "";
}

export async function requestAcademyOtpAction(
  _state: AcademyLoginState,
  formData: FormData,
): Promise<AcademyLoginState> {
  const parsed = normalizeIranianMobile(field(formData, "mobile"));
  if (!parsed.ok) {
    return { phase: "mobile", error: "شماره موبایل معتبر وارد کنید." };
  }

  const organizationId = await getAcademyOrganizationId();
  const requestedNext = field(formData, "next");

  const requested = await requestOtp({
    organizationId,
    mobile: parsed.normalized,
    purpose: OtpPurpose.LOGIN,
    idempotencyKey: `academy-login:${parsed.normalized}:${Math.floor(Date.now() / 60_000)}`,
  });

  if (requested.ok) {
    await prisma.auditLog.create({
      data: {
        organizationId,
        action: AuditAction.OTP_REQUESTED,
        entityType: "OtpChallenge",
        entityId: requested.challengeId,
        metadata: { flow: "academy-login" },
      },
    });
  }

  return {
    phase: "otp",
    message: GENERIC_REQUEST,
    mobile: parsed.normalized,
    next: isSafeRelativePath(requestedNext) ? requestedNext.trim() : undefined,
  };
}

export async function verifyAcademyOtpAction(
  _state: AcademyLoginState,
  formData: FormData,
): Promise<AcademyLoginState> {
  const parsed = normalizeIranianMobile(field(formData, "mobile"));
  const code = field(formData, "code");
  if (!parsed.ok || !code) {
    return { phase: "otp", error: GENERIC_VERIFY, mobile: field(formData, "mobile") };
  }

  const organizationId = await getAcademyOrganizationId();

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

  const provisioned = await provisionAcademyLearner({
    organizationId,
    normalizedMobile: parsed.normalized,
  });

  const requestMetadata = await readSessionRequestMetadata();
  const { token, expiresAt } = await createPortalSession({
    userId: provisioned.userId,
    organizationMembershipId: provisioned.membershipId,
    ...requestMetadata,
  });

  const now = new Date();
  await prisma.$transaction([
    prisma.user.update({
      where: { id: provisioned.userId },
      data: { lastLoginAt: now, mobileVerifiedAt: now },
    }),
    prisma.auditLog.create({
      data: {
        organizationId,
        actorUserId: provisioned.userId,
        action: AuditAction.LOGIN_SUCCESS,
        entityType: "PortalSession",
        metadata: { flow: "academy-login" },
      },
    }),
  ]);

  await setPortalSessionCookie(token, expiresAt);

  const requestedNext = field(formData, "next");
  const redirectPath = isSafeRelativePath(requestedNext)
    ? requestedNext.trim()
    : "/account/library";
  redirect(redirectPath);
}
