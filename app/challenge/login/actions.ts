"use server";

import { redirect } from "next/navigation";
import { AuditAction, OtpPurpose } from "@/generated/prisma/enums";
import { readSessionRequestMetadata } from "@/lib/auth/session";
import { provisionChallengeParticipant } from "@/lib/challenge/auth/provision";
import { validateChallengeAudience } from "@/lib/challenge/constants";
import { createChallengeToken } from "@/lib/challenge/crypto";
import { getActiveChallengeCampaign } from "@/lib/challenge/config";
import {
  findChallengeInvitation,
  findChallengeTeamByInviteCode,
} from "@/lib/challenge/invitations";
import { consumeOtp, requestOtp, verifyOtp } from "@/lib/communication/otp";
import { normalizeIranianMobile } from "@/lib/forms/normalize-mobile";
import { prisma } from "@/lib/prisma";
import { isPrismaUniqueConflict } from "@/lib/prisma/user-facing-error";
import {
  createPortalSession,
  setPortalSessionCookie,
} from "@/lib/portal/auth/session";

export type ChallengeLoginState = {
  phase: "profile" | "otp";
  error?: string;
  message?: string;
  fullName?: string;
  mobile?: string;
  gradeKey?: string;
  majorKey?: string;
  inviteToken?: string;
  teamCode?: string;
  teamName?: string;
};

function field(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function normalizeFullName(value: string): string | null {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length >= 3 && normalized.length <= 100 ? normalized : null;
}

function normalizeTeamName(value: string): string | null {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return null;
  return normalized.length >= 3 && normalized.length <= 40 ? normalized : null;
}

async function resolveEntry(params: {
  inviteToken: string;
  teamCode: string;
  normalizedMobile: string;
}) {
  if (params.inviteToken) {
    const invitation = await findChallengeInvitation(params.inviteToken);
    if (!invitation || invitation.normalizedMobile !== params.normalizedMobile) {
      return { ok: false as const, error: "این دعوت معتبر نیست یا برای شماره دیگری ارسال شده است." };
    }
    return {
      ok: true as const,
      campaign: invitation.campaign,
      inviteToken: params.inviteToken,
      teamCode: "",
    };
  }
  if (params.teamCode) {
    const team = await findChallengeTeamByInviteCode(params.teamCode);
    if (!team || team._count.participants >= team.capacity) {
      return { ok: false as const, error: "لینک تیم معتبر نیست یا ظرفیت آن تکمیل شده است." };
    }
    return {
      ok: true as const,
      campaign: team.campaign,
      inviteToken: "",
      teamCode: team.inviteCode,
    };
  }
  const campaign = await getActiveChallengeCampaign();
  if (!campaign) {
    return { ok: false as const, error: "ثبت‌نام این چالش در حال حاضر فعال نیست." };
  }
  return { ok: true as const, campaign, inviteToken: "", teamCode: "" };
}

function baseState(formData: FormData): ChallengeLoginState {
  return {
    phase: "profile",
    fullName: field(formData, "fullName"),
    mobile: field(formData, "mobile"),
    gradeKey: field(formData, "gradeKey"),
    majorKey: field(formData, "majorKey"),
    inviteToken: field(formData, "inviteToken"),
    teamCode: field(formData, "teamCode"),
    teamName: field(formData, "teamName"),
  };
}

export async function requestChallengeOtpAction(
  _previous: ChallengeLoginState,
  formData: FormData,
): Promise<ChallengeLoginState> {
  const state = baseState(formData);
  const fullName = normalizeFullName(state.fullName ?? "");
  const mobile = normalizeIranianMobile(state.mobile ?? "");
  const audience = validateChallengeAudience(
    state.gradeKey ?? "",
    state.majorKey,
  );
  const consent = field(formData, "consent") === "on";
  const isJoiningTeam = Boolean(state.inviteToken || state.teamCode);
  const requestedTeamName = state.teamName?.trim() ?? "";
  const teamName = isJoiningTeam ? null : normalizeTeamName(requestedTeamName);
  if (!fullName) return { ...state, error: "نام و نام خانوادگی را کامل وارد کنید." };
  if (!mobile.ok) return { ...state, error: "شماره موبایل معتبر وارد کنید." };
  if (!audience.ok) return { ...state, error: audience.error };
  if (requestedTeamName && !teamName) {
    return { ...state, error: "نام تیم باید بین ۳ تا ۴۰ نویسه باشد." };
  }
  if (!consent) return { ...state, error: "پذیرش قوانین چالش الزامی است." };

  const entry = await resolveEntry({
    inviteToken: state.inviteToken ?? "",
    teamCode: state.teamCode ?? "",
    normalizedMobile: mobile.normalized,
  });
  if (!entry.ok) return { ...state, error: entry.error };

  const requested = await requestOtp({
    organizationId: entry.campaign.organizationId,
    mobile: mobile.normalized,
    purpose: OtpPurpose.CHALLENGE_LOGIN,
    idempotencyKey: `challenge-login:${mobile.normalized}:${Math.floor(Date.now() / 60_000)}`,
  });
  if (!requested.ok) return { ...state, error: requested.error };

  await prisma.auditLog.create({
    data: {
      organizationId: entry.campaign.organizationId,
      action: AuditAction.OTP_REQUESTED,
      entityType: "OtpChallenge",
      entityId: requested.challengeId,
      metadata: { flow: "five-person-math-challenge" },
    },
  });

  return {
    phase: "otp",
    message: "کد ورود برای شما ارسال شد.",
    fullName,
    mobile: mobile.normalized,
    gradeKey: audience.gradeKey,
    majorKey: audience.majorKey ?? "",
    inviteToken: entry.inviteToken,
    teamCode: entry.teamCode,
    teamName: teamName ?? "",
  };
}

export async function verifyChallengeOtpAction(
  _previous: ChallengeLoginState,
  formData: FormData,
): Promise<ChallengeLoginState> {
  const state = baseState(formData);
  state.phase = "otp";
  const fullName = normalizeFullName(state.fullName ?? "");
  const mobile = normalizeIranianMobile(state.mobile ?? "");
  const audience = validateChallengeAudience(
    state.gradeKey ?? "",
    state.majorKey,
  );
  const code = field(formData, "code");
  const isJoiningTeam = Boolean(state.inviteToken || state.teamCode);
  const requestedTeamName = state.teamName?.trim() ?? "";
  const teamName = isJoiningTeam ? null : normalizeTeamName(requestedTeamName);
  if (!fullName || !mobile.ok || !audience.ok || !code) {
    return { ...state, error: "اطلاعات ورود معتبر نیست؛ دوباره تلاش کنید." };
  }

  const entry = await resolveEntry({
    inviteToken: state.inviteToken ?? "",
    teamCode: state.teamCode ?? "",
    normalizedMobile: mobile.normalized,
  });
  if (!entry.ok) return { ...state, error: entry.error };

  const verified = await verifyOtp({
    organizationId: entry.campaign.organizationId,
    mobile: mobile.normalized,
    code,
    purpose: OtpPurpose.CHALLENGE_LOGIN,
  });
  if (!verified.ok) return { ...state, error: "کد ورود نامعتبر یا منقضی است." };
  const consumed = await consumeOtp({
    organizationId: entry.campaign.organizationId,
    challengeId: verified.challengeId,
  });
  if (!consumed.ok) return { ...state, error: "کد ورود نامعتبر یا منقضی است." };

  let provisioned;
  try {
    provisioned = await provisionChallengeParticipant({
      organizationId: entry.campaign.organizationId,
      campaignId: entry.campaign.id,
      teamSize: entry.campaign.teamSize,
      fullName,
      normalizedMobile: mobile.normalized,
      gradeKey: audience.gradeKey,
      gradeLabel: audience.gradeLabel,
      majorKey: audience.majorKey,
      majorLabel: audience.majorLabel,
      inviteToken: entry.inviteToken,
      teamCode: entry.teamCode,
      teamName,
    });
  } catch (error) {
    const codeName = error instanceof Error ? error.message : "";
    const failureId = createChallengeToken(6).toUpperCase();
    console.error("[challenge-registration] participant provisioning failed", {
      failureId,
      campaignId: entry.campaign.id,
      mobileSuffix: mobile.normalized.slice(-4),
      invited: Boolean(entry.inviteToken),
      teamCodeEntry: Boolean(entry.teamCode),
      error:
        error instanceof Error
          ? { name: error.name, message: error.message }
          : "unknown",
    });
    const errorMessage =
      codeName === "CHALLENGE_TEAM_FULL"
        ? "ظرفیت این تیم همین حالا تکمیل شد."
        : codeName === "CHALLENGE_TEAM_LOCKED"
          ? "این تیم قفل شده و عضو جدید نمی‌پذیرد."
          : codeName === "CHALLENGE_INVITE_INVALID"
            ? "دعوت معتبر نیست یا منقضی شده است."
            : codeName === "CHALLENGE_TEAM_NAME_TAKEN" || isPrismaUniqueConflict(error)
              ? "این نام تیم قبلاً انتخاب شده است؛ یک نام دیگر وارد کنید."
            : `تکمیل ثبت‌نام ممکن نشد؛ دوباره تلاش کنید. کد پیگیری: ${failureId}`;
    return { ...state, error: errorMessage };
  }

  const requestMetadata = await readSessionRequestMetadata();
  const session = await createPortalSession({
    userId: provisioned.userId,
    organizationMembershipId: provisioned.membershipId,
    ...requestMetadata,
  });
  await setPortalSessionCookie(session.token, session.expiresAt);
  await prisma.auditLog.create({
    data: {
      organizationId: entry.campaign.organizationId,
      actorUserId: provisioned.userId,
      action: AuditAction.LOGIN_SUCCESS,
      entityType: "ChallengeParticipant",
      entityId: provisioned.participantId,
      metadata: { flow: "five-person-math-challenge" },
    },
  });
  redirect("/dashboard");
}
