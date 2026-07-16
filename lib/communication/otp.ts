/**
 * OTP challenge service (StarOS v0.6A).
 *
 * Security rules:
 * - Six cryptographically secure digits
 * - Hash only in DB (never plaintext)
 * - Two-minute expiry (configurable)
 * - Resend cooldown
 * - Max verification attempts
 * - One active PENDING challenge per mobile+purpose
 * - Persian digit normalization on input
 * - Generic Persian errors (no OTP leakage)
 * - Never log OTP codes
 */

import {
  OtpChallengeStatus,
  OtpPurpose,
} from "@/generated/prisma/enums";
import { getCommunicationConfig } from "@/lib/communication/config";
import {
  generateSecureOtpDigits,
  hashOtpCode,
  normalizeOtpInput,
  verifyOtpCode,
} from "@/lib/communication/otp-crypto";
import { normalizeIranianMobile } from "@/lib/forms/normalize-mobile";
import { prisma } from "@/lib/prisma";

const GENERIC_INVALID = "کد تأیید نامعتبر است.";
const GENERIC_EXPIRED = "کد تأیید منقضی شده است. لطفاً دوباره درخواست دهید.";
const GENERIC_LOCKED = "تعداد تلاش‌ها بیش از حد مجاز است. لطفاً بعداً دوباره تلاش کنید.";
const GENERIC_COOLDOWN = "لطفاً کمی صبر کنید و دوباره درخواست دهید.";
const GENERIC_MOBILE = "شماره موبایل واردشده معتبر نیست.";

export type RequestOtpInput = {
  organizationId: string;
  mobile: string;
  purpose?: OtpPurpose;
  idempotencyKey?: string | null;
  /** When true, return the plaintext code for isolated tests only — never in production paths. */
  _testReturnCode?: boolean;
};

export type RequestOtpResult =
  | {
      ok: true;
      challengeId: string;
      expiresAt: Date;
      resendAvailableAt: Date;
      /** Present only when `_testReturnCode` is set (test harness). */
      _testCode?: string;
    }
  | { ok: false; error: string };

export type VerifyOtpInput = {
  organizationId: string;
  mobile: string;
  code: string;
  purpose?: OtpPurpose;
};

export type VerifyOtpResult =
  | { ok: true; challengeId: string }
  | { ok: false; error: string };

export type ConsumeOtpInput = {
  organizationId: string;
  challengeId: string;
};

export type ConsumeOtpResult =
  | { ok: true }
  | { ok: false; error: string };

function resolvePurpose(purpose?: OtpPurpose): OtpPurpose {
  return purpose ?? OtpPurpose.GENERIC;
}

/**
 * Issue a new OTP challenge. Invalidates any prior PENDING challenge
 * for the same organization + mobile + purpose.
 */
export async function requestOtp(
  input: RequestOtpInput,
): Promise<RequestOtpResult> {
  const mobile = normalizeIranianMobile(input.mobile);
  if (!mobile.ok) {
    return { ok: false, error: GENERIC_MOBILE };
  }

  const config = getCommunicationConfig();
  const purpose = resolvePurpose(input.purpose);
  const now = new Date();

  const active = await prisma.otpChallenge.findFirst({
    where: {
      organizationId: input.organizationId,
      normalizedMobile: mobile.normalized,
      purpose,
      status: OtpChallengeStatus.PENDING,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      resendAvailableAt: true,
      expiresAt: true,
    },
  });

  if (active?.resendAvailableAt && active.resendAvailableAt > now) {
    return { ok: false, error: GENERIC_COOLDOWN };
  }

  const code = generateSecureOtpDigits(6);
  const codeHash = hashOtpCode(code);
  const expiresAt = new Date(now.getTime() + config.otpExpirySeconds * 1000);
  const resendAvailableAt = new Date(
    now.getTime() + config.otpResendCooldownSeconds * 1000,
  );

  try {
    const challenge = await prisma.$transaction(async (tx) => {
      if (active) {
        await tx.otpChallenge.update({
          where: { id: active.id },
          data: { status: OtpChallengeStatus.EXPIRED },
        });
      }

      // Expire any other stale PENDING rows for this mobile/purpose.
      await tx.otpChallenge.updateMany({
        where: {
          organizationId: input.organizationId,
          normalizedMobile: mobile.normalized,
          purpose,
          status: OtpChallengeStatus.PENDING,
          id: active ? { not: active.id } : undefined,
        },
        data: { status: OtpChallengeStatus.EXPIRED },
      });

      return tx.otpChallenge.create({
        data: {
          organizationId: input.organizationId,
          normalizedMobile: mobile.normalized,
          purpose,
          codeHash,
          status: OtpChallengeStatus.PENDING,
          expiresAt,
          maxAttempts: config.otpMaxAttempts,
          lastSentAt: now,
          resendAvailableAt,
          idempotencyKey: input.idempotencyKey?.trim() || null,
        },
        select: { id: true },
      });
    });

    return {
      ok: true,
      challengeId: challenge.id,
      expiresAt,
      resendAvailableAt,
      ...(input._testReturnCode ? { _testCode: code } : {}),
    };
  } catch {
    return {
      ok: false,
      error: "درخواست کد تأیید در حال حاضر ممکن نیست. لطفاً دوباره تلاش کنید.",
    };
  }
}

/**
 * Verify OTP without consuming. Marks VERIFIED on success.
 * Replay of an already-verified/consumed challenge fails generically.
 */
export async function verifyOtp(
  input: VerifyOtpInput,
): Promise<VerifyOtpResult> {
  const mobile = normalizeIranianMobile(input.mobile);
  if (!mobile.ok) {
    return { ok: false, error: GENERIC_MOBILE };
  }

  const code = normalizeOtpInput(input.code);
  if (code.length !== 6) {
    return { ok: false, error: GENERIC_INVALID };
  }

  const purpose = resolvePurpose(input.purpose);
  const now = new Date();

  const challenge = await prisma.otpChallenge.findFirst({
    where: {
      organizationId: input.organizationId,
      normalizedMobile: mobile.normalized,
      purpose,
      status: {
        in: [
          OtpChallengeStatus.PENDING,
          OtpChallengeStatus.VERIFIED,
          OtpChallengeStatus.CONSUMED,
          OtpChallengeStatus.LOCKED,
          OtpChallengeStatus.EXPIRED,
        ],
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!challenge) {
    return { ok: false, error: GENERIC_INVALID };
  }

  if (
    challenge.status === OtpChallengeStatus.CONSUMED ||
    challenge.status === OtpChallengeStatus.VERIFIED
  ) {
    // Replay protection — do not reveal prior success.
    return { ok: false, error: GENERIC_INVALID };
  }

  if (challenge.status === OtpChallengeStatus.LOCKED) {
    return { ok: false, error: GENERIC_LOCKED };
  }

  if (
    challenge.status === OtpChallengeStatus.EXPIRED ||
    challenge.expiresAt <= now
  ) {
    if (challenge.status === OtpChallengeStatus.PENDING) {
      await prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { status: OtpChallengeStatus.EXPIRED },
      });
    }
    return { ok: false, error: GENERIC_EXPIRED };
  }

  const match = verifyOtpCode(code, challenge.codeHash);
  if (!match) {
    const nextAttempts = challenge.attemptCount + 1;
    const locked = nextAttempts >= challenge.maxAttempts;
    await prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: {
        attemptCount: nextAttempts,
        status: locked ? OtpChallengeStatus.LOCKED : OtpChallengeStatus.PENDING,
      },
    });
    return {
      ok: false,
      error: locked ? GENERIC_LOCKED : GENERIC_INVALID,
    };
  }

  await prisma.otpChallenge.update({
    where: { id: challenge.id },
    data: { status: OtpChallengeStatus.VERIFIED },
  });

  return { ok: true, challengeId: challenge.id };
}

/**
 * Consume a previously verified challenge (one-time use after verify).
 */
export async function consumeOtp(
  input: ConsumeOtpInput,
): Promise<ConsumeOtpResult> {
  const now = new Date();
  const challenge = await prisma.otpChallenge.findFirst({
    where: {
      id: input.challengeId,
      organizationId: input.organizationId,
    },
  });

  if (!challenge) {
    return { ok: false, error: GENERIC_INVALID };
  }

  if (challenge.status === OtpChallengeStatus.CONSUMED) {
    return { ok: false, error: GENERIC_INVALID };
  }

  if (challenge.status !== OtpChallengeStatus.VERIFIED) {
    return { ok: false, error: GENERIC_INVALID };
  }

  if (challenge.expiresAt <= now) {
    await prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { status: OtpChallengeStatus.EXPIRED },
    });
    return { ok: false, error: GENERIC_EXPIRED };
  }

  await prisma.otpChallenge.update({
    where: { id: challenge.id },
    data: {
      status: OtpChallengeStatus.CONSUMED,
      consumedAt: now,
    },
  });

  return { ok: true };
}
