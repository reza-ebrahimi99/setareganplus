import {
  ChallengeInvitationStatus,
  SmsMessageStatus,
} from "@/generated/prisma/enums";
import { createChallengeToken, hashChallengeToken } from "@/lib/challenge/crypto";
import { getChallengePublicOrigin } from "@/lib/challenge/host";
import {
  enqueueSms,
  processSmsMessage,
  type SmsTemplateDeliveryDescriptor,
} from "@/lib/communication/queue";
import { normalizeIranianMobile } from "@/lib/forms/normalize-mobile";
import { prisma } from "@/lib/prisma";

function renderTemplate(
  template: string,
  values: Record<string, string>,
): string {
  return template.replace(/\{\{([a-zA-Z]+)\}\}/g, (_match, key: string) => {
    return values[key] ?? "";
  });
}

const SMSIR_PARAMETER_MAX_LENGTH = 25;

function readSmsIrTemplateId(value: string | undefined): string | null {
  const normalized = value?.trim() ?? "";
  return /^\d+$/.test(normalized) && Number(normalized) > 0
    ? normalized
    : null;
}

function readSmsIrParameterName(
  value: string | undefined,
  fallback: string,
): string {
  const normalized = value?.trim() || fallback;
  return /^[A-Za-z][A-Za-z0-9_]{0,49}$/.test(normalized)
    ? normalized
    : fallback;
}

function smsIrParameterValue(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, SMSIR_PARAMETER_MAX_LENGTH);
}

export function buildChallengeInviteTemplateDelivery(params: {
  inviteeName: string;
  inviterName: string;
  token: string;
}): SmsTemplateDeliveryDescriptor | undefined {
  const templateCode = readSmsIrTemplateId(
    process.env.SMSIR_CHALLENGE_INVITE_TEMPLATE_ID,
  );
  if (!templateCode) return undefined;

  const nameParameter = readSmsIrParameterName(
    process.env.SMSIR_CHALLENGE_INVITE_PARAM_NAME,
    "NAME",
  );
  const inviterParameter = readSmsIrParameterName(
    process.env.SMSIR_CHALLENGE_INVITE_PARAM_INVITER,
    "INVITER",
  );
  const tokenParameter = readSmsIrParameterName(
    process.env.SMSIR_CHALLENGE_INVITE_PARAM_TOKEN,
    "TOKEN",
  );
  const parameters = {
    [nameParameter]: smsIrParameterValue(params.inviteeName),
    [inviterParameter]: smsIrParameterValue(params.inviterName),
    [tokenParameter]: smsIrParameterValue(params.token),
  };
  if (Object.keys(parameters).length !== 3) return undefined;
  return {
    version: 1,
    kind: "pattern",
    templateCode,
    parameters,
  };
}

export async function deliverChallengeSmsNow(messageId: string): Promise<boolean> {
  const claimed = await prisma.smsMessage.updateMany({
    where: { id: messageId, status: SmsMessageStatus.PENDING },
    data: {
      status: SmsMessageStatus.PROCESSING,
      attemptCount: { increment: 1 },
    },
  });
  if (claimed.count === 1) {
    const result = await processSmsMessage(messageId);
    return result.ok && result.status === SmsMessageStatus.SENT;
  }
  const existing = await prisma.smsMessage.findUnique({
    where: { id: messageId },
    select: { status: true },
  });
  return existing?.status === SmsMessageStatus.SENT;
}

export type CreateChallengeInvitationResult =
  | { ok: true; inviteUrl: string; smsSent: boolean; message: string }
  | { ok: false; error: string };

export async function createChallengeInvitation(params: {
  organizationId: string;
  campaignId: string;
  participantId: string;
  inviteeName: string;
  mobile: string;
}): Promise<CreateChallengeInvitationResult> {
  const inviteeName = params.inviteeName.trim().replace(/\s+/g, " ");
  if (inviteeName.length < 2 || inviteeName.length > 80) {
    return { ok: false, error: "نام دوست‌تان را درست وارد کنید." };
  }
  const mobile = normalizeIranianMobile(params.mobile);
  if (!mobile.ok) return { ok: false, error: "شماره موبایل معتبر نیست." };

  const owner = await prisma.challengeParticipant.findFirst({
    where: {
      id: params.participantId,
      organizationId: params.organizationId,
      campaignId: params.campaignId,
    },
    include: {
      campaign: true,
      team: {
        include: {
          _count: { select: { participants: true } },
        },
      },
    },
  });
  if (!owner?.team) return { ok: false, error: "تیم شما پیدا نشد." };
  if (owner.team.lockedAt || owner.team.resultUnlockedAt) {
    return { ok: false, error: "تیم تکمیل و قفل شده است." };
  }
  if (owner.normalizedMobile === mobile.normalized) {
    return { ok: false, error: "نمی‌توانید خودتان را دعوت کنید." };
  }

  const alreadyMember = await prisma.challengeParticipant.findFirst({
    where: {
      campaignId: params.campaignId,
      normalizedMobile: mobile.normalized,
    },
    select: { teamId: true },
  });
  if (alreadyMember) {
    return {
      ok: false,
      error:
        alreadyMember.teamId === owner.team.id
          ? "این شماره عضو تیم شماست."
          : "این شماره قبلاً در یک تیم دیگر عضو شده است.",
    };
  }

  const now = new Date();
  const activeInvitations = await prisma.challengeInvitation.count({
    where: {
      teamId: owner.team.id,
      normalizedMobile: { not: mobile.normalized },
      status: {
        in: [
          ChallengeInvitationStatus.PENDING,
          ChallengeInvitationStatus.SENT,
        ],
      },
      expiresAt: { gt: now },
    },
  });
  if (owner.team._count.participants + activeInvitations >= owner.team.capacity) {
    return { ok: false, error: "ظرفیت تیم با دعوت‌های فعلی تکمیل است." };
  }

  const existing = await prisma.challengeInvitation.findUnique({
    where: {
      teamId_normalizedMobile: {
        teamId: owner.team.id,
        normalizedMobile: mobile.normalized,
      },
    },
    select: { id: true, lastSentAt: true, status: true },
  });
  if (
    existing?.lastSentAt &&
    existing.lastSentAt.getTime() > now.getTime() - 60_000
  ) {
    return { ok: false, error: "پیامک دعوت همین حالا ارسال شده؛ یک دقیقه صبر کنید." };
  }
  if (existing?.status === ChallengeInvitationStatus.ACCEPTED) {
    return { ok: false, error: "این دعوت قبلاً پذیرفته شده است." };
  }

  // 120 bits of entropy, while staying inside SMS.ir's 25-character
  // verification-template parameter limit.
  const token = createChallengeToken(15);
  const tokenHash = hashChallengeToken(token);
  const defaultExpiry = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const expiresAt =
    owner.campaign.endsAt && owner.campaign.endsAt < defaultExpiry
      ? owner.campaign.endsAt
      : defaultExpiry;

  const invitation = existing
    ? await prisma.challengeInvitation.update({
        where: { id: existing.id },
        data: {
          inviteeName,
          tokenHash,
          status: ChallengeInvitationStatus.PENDING,
          expiresAt,
          lastSentAt: now,
          resendCount: { increment: 1 },
        },
      })
    : await prisma.challengeInvitation.create({
        data: {
          organizationId: params.organizationId,
          campaignId: params.campaignId,
          teamId: owner.team.id,
          inviterParticipantId: owner.id,
          inviteeName,
          normalizedMobile: mobile.normalized,
          tokenHash,
          status: ChallengeInvitationStatus.PENDING,
          expiresAt,
          lastSentAt: now,
        },
      });

  await prisma.smsMessage.updateMany({
    where: {
      organizationId: params.organizationId,
      relatedType: "ChallengeInvitation",
      relatedId: invitation.id,
      status: SmsMessageStatus.PENDING,
    },
    data: { status: SmsMessageStatus.CANCELLED },
  });

  const inviteUrl = `${getChallengePublicOrigin()}/invite/${token}`;
  const body = renderTemplate(owner.campaign.inviteSmsTemplate, {
    inviterName: owner.fullName,
    inviteeName,
    campaignTitle: owner.campaign.title,
    inviteUrl,
    teamName: owner.team.name,
  });
  const templateDelivery = buildChallengeInviteTemplateDelivery({
    inviteeName,
    inviterName: owner.fullName,
    token,
  });
  const queued = await enqueueSms({
    organizationId: params.organizationId,
    toMobile: mobile.normalized,
    body,
    purpose: "challenge_invitation",
    idempotencyKey: `challenge-invite:${invitation.id}:${invitation.resendCount}`,
    templateId:
      templateDelivery?.kind === "pattern"
        ? templateDelivery.templateCode
        : null,
    relatedType: "ChallengeInvitation",
    relatedId: invitation.id,
    templateDelivery,
    metadata: {
      campaignId: params.campaignId,
      teamId: owner.team.id,
      deliveryMode: templateDelivery ? "smsir_pattern" : "text",
    },
  });

  let smsSent = false;
  if (queued.ok) smsSent = await deliverChallengeSmsNow(queued.messageId);
  await prisma.challengeInvitation.update({
    where: { id: invitation.id },
    data: {
      status: smsSent
        ? ChallengeInvitationStatus.SENT
        : ChallengeInvitationStatus.PENDING,
      sentAt: smsSent ? new Date() : null,
    },
  });

  return {
    ok: true,
    inviteUrl,
    smsSent,
    message: smsSent
      ? "دعوت ثبت شد و پیامک برای دوست‌تان ارسال شد."
      : "دعوت ثبت شد؛ پیامک در صف ارسال قرار گرفت.",
  };
}

export async function findChallengeInvitation(rawToken: string) {
  const token = rawToken.trim();
  if (token.length < 20 || token.length > 200) return null;
  const now = new Date();
  return prisma.challengeInvitation.findFirst({
    where: {
      tokenHash: hashChallengeToken(token),
      status: {
        in: [
          ChallengeInvitationStatus.PENDING,
          ChallengeInvitationStatus.SENT,
        ],
      },
      expiresAt: { gt: now },
      campaign: {
        status: "ACTIVE",
        deletedAt: null,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
        ],
      },
    },
    select: {
      id: true,
      inviteeName: true,
      normalizedMobile: true,
      expiresAt: true,
      campaign: {
        select: {
          id: true,
          organizationId: true,
          title: true,
          slug: true,
          teamSize: true,
        },
      },
      team: { select: { id: true, name: true, inviteCode: true } },
      inviter: { select: { fullName: true } },
    },
  });
}

export async function findChallengeTeamByInviteCode(rawCode: string) {
  const code = rawCode.trim().toUpperCase();
  if (!/^[A-Z2-9]{6,12}$/.test(code)) return null;
  const now = new Date();
  return prisma.challengeTeam.findFirst({
    where: {
      inviteCode: code,
      lockedAt: null,
      resultUnlockedAt: null,
      campaign: {
        status: "ACTIVE",
        deletedAt: null,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
        ],
      },
    },
    select: {
      id: true,
      name: true,
      inviteCode: true,
      capacity: true,
      campaign: {
        select: {
          id: true,
          organizationId: true,
          title: true,
          slug: true,
          teamSize: true,
        },
      },
      _count: { select: { participants: true } },
    },
  });
}
