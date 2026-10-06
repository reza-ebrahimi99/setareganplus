import {
  ChallengeInvitationStatus,
  LeadSourceType,
  MembershipStatus,
  SystemRole,
  UserStatus,
} from "@/generated/prisma/enums";
import { isAdminPortalRole } from "@/lib/auth/constants";
import { hashChallengeToken, shortChallengeCode } from "@/lib/challenge/crypto";
import { upsertLead } from "@/lib/crm/leads";
import { prisma } from "@/lib/prisma";

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts.shift() || "دانش‌آموز",
    lastName: parts.join(" ") || "ستارگان",
  };
}

async function provisionIdentity(params: {
  organizationId: string;
  normalizedMobile: string;
  fullName: string;
}): Promise<{ userId: string; membershipId: string }> {
  const names = splitName(params.fullName);
  const now = new Date();
  const user = await prisma.user.upsert({
    where: { normalizedMobile: params.normalizedMobile },
    create: {
      mobile: params.normalizedMobile,
      normalizedMobile: params.normalizedMobile,
      firstName: names.firstName,
      lastName: names.lastName,
      status: UserStatus.ACTIVE,
      mobileVerifiedAt: now,
      lastLoginAt: now,
    },
    update: {
      mobile: params.normalizedMobile,
      status: UserStatus.ACTIVE,
      mobileVerifiedAt: now,
      lastLoginAt: now,
    },
    select: { id: true },
  });

  const existingMembership = await prisma.organizationMembership.findUnique({
    where: {
      organizationId_userId: {
        organizationId: params.organizationId,
        userId: user.id,
      },
    },
    select: { id: true, role: true, status: true, deletedAt: true },
  });

  if (existingMembership) {
    if (!isAdminPortalRole(existingMembership.role)) {
      await prisma.organizationMembership.update({
        where: { id: existingMembership.id },
        data: { status: MembershipStatus.ACTIVE, deletedAt: null },
      });
    }
    return { userId: user.id, membershipId: existingMembership.id };
  }

  const membership = await prisma.organizationMembership.create({
    data: {
      organizationId: params.organizationId,
      userId: user.id,
      role: SystemRole.STUDENT,
      status: MembershipStatus.ACTIVE,
    },
    select: { id: true },
  });
  return { userId: user.id, membershipId: membership.id };
}

async function syncParticipantLead(params: {
  participantId: string;
  organizationId: string;
  fullName: string;
  normalizedMobile: string;
  gradeLabel: string;
  majorLabel: string | null;
}): Promise<void> {
  try {
    const branch = await prisma.branch.findFirst({
      where: {
        organizationId: params.organizationId,
        isActive: true,
        deletedAt: null,
      },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (!branch) return;

    const names = splitName(params.fullName);
    const lead = await upsertLead({
      organizationId: params.organizationId,
      branchId: branch.id,
      firstName: names.firstName,
      lastName: names.lastName,
      mobile: params.normalizedMobile,
      mobileRaw: params.normalizedMobile,
      gradeLevel: params.gradeLabel,
      source: "MATH_FIVE_CHALLENGE",
      sourceType: LeadSourceType.OTHER,
      applyScoring: true,
      createInitialTask: true,
      initialTaskTitle: "پیگیری شرکت‌کننده چالش ۵ نفره ریاضی",
      initialTaskDueMinutes: 24 * 60,
    });
    if (!lead.ok) return;

    await prisma.$transaction([
      prisma.challengeParticipant.updateMany({
        where: {
          id: params.participantId,
          organizationId: params.organizationId,
        },
        data: { leadId: lead.leadId },
      }),
      prisma.lead.updateMany({
        where: { id: lead.leadId, organizationId: params.organizationId },
        data: {
          gradeLevel: params.gradeLabel,
          studyField: params.majorLabel,
          source: "MATH_FIVE_CHALLENGE",
        },
      }),
    ]);
  } catch (error) {
    console.error("[challenge] lead sync failed", error);
  }
}

export type ProvisionChallengeParticipantInput = {
  organizationId: string;
  campaignId: string;
  teamSize: number;
  fullName: string;
  normalizedMobile: string;
  gradeKey: string;
  gradeLabel: string;
  majorKey: string | null;
  majorLabel: string | null;
  inviteToken?: string | null;
  teamCode?: string | null;
  teamName?: string | null;
};

export async function provisionChallengeParticipant(
  input: ProvisionChallengeParticipantInput,
): Promise<{
  userId: string;
  membershipId: string;
  participantId: string;
  teamId: string;
}> {
  const identity = await provisionIdentity(input);
  const tokenHash = input.inviteToken
    ? hashChallengeToken(input.inviteToken)
    : null;

  const participant = await prisma.$transaction(async (tx) => {
    const existing = await tx.challengeParticipant.findFirst({
      where: {
        campaignId: input.campaignId,
        OR: [
          { userId: identity.userId },
          { normalizedMobile: input.normalizedMobile },
        ],
      },
      select: { id: true, teamId: true },
    });

    if (existing?.teamId) {
      return { id: existing.id, teamId: existing.teamId };
    }

    if (tokenHash) {
      const invitation = await tx.challengeInvitation.findFirst({
        where: {
          tokenHash,
          campaignId: input.campaignId,
          normalizedMobile: input.normalizedMobile,
          status: {
            in: [
              ChallengeInvitationStatus.PENDING,
              ChallengeInvitationStatus.SENT,
            ],
          },
          expiresAt: { gt: new Date() },
        },
        select: { id: true, teamId: true },
      });
      if (!invitation) throw new Error("CHALLENGE_INVITE_INVALID");

      const lock = await tx.challengeTeam.updateMany({
        where: {
          id: invitation.teamId,
          campaignId: input.campaignId,
          organizationId: input.organizationId,
          lockedAt: null,
        },
        data: { updatedAt: new Date() },
      });
      if (lock.count !== 1) throw new Error("CHALLENGE_TEAM_LOCKED");
      const team = await tx.challengeTeam.findUnique({
        where: { id: invitation.teamId },
        select: { id: true, capacity: true, lockedAt: true },
      });
      if (!team || team.lockedAt) throw new Error("CHALLENGE_TEAM_LOCKED");

      const memberCount = await tx.challengeParticipant.count({
        where: { teamId: team.id },
      });
      if (memberCount >= team.capacity) throw new Error("CHALLENGE_TEAM_FULL");

      const joined = existing
        ? await tx.challengeParticipant.update({
            where: { id: existing.id },
            data: {
              teamId: team.id,
              fullName: input.fullName,
              gradeKey: input.gradeKey,
              gradeLabel: input.gradeLabel,
              majorKey: input.majorKey,
              majorLabel: input.majorLabel,
              source: "INVITE",
              consentAt: new Date(),
            },
            select: { id: true, teamId: true },
          })
        : await tx.challengeParticipant.create({
            data: {
              organizationId: input.organizationId,
              campaignId: input.campaignId,
              userId: identity.userId,
              teamId: team.id,
              fullName: input.fullName,
              normalizedMobile: input.normalizedMobile,
              gradeKey: input.gradeKey,
              gradeLabel: input.gradeLabel,
              majorKey: input.majorKey,
              majorLabel: input.majorLabel,
              source: "INVITE",
              consentAt: new Date(),
            },
            select: { id: true, teamId: true },
          });

      await tx.challengeInvitation.update({
        where: { id: invitation.id },
        data: {
          status: ChallengeInvitationStatus.ACCEPTED,
          acceptedAt: new Date(),
          acceptedParticipantId: joined.id,
        },
      });
      if (memberCount + 1 >= team.capacity) {
        await tx.challengeTeam.updateMany({
          where: { id: team.id, lockedAt: null },
          data: { lockedAt: new Date() },
        });
      }
      return { id: joined.id, teamId: joined.teamId! };
    }

    if (input.teamCode?.trim()) {
      const teamCode = input.teamCode.trim().toUpperCase();
      const candidate = await tx.challengeTeam.findFirst({
        where: {
          inviteCode: teamCode,
          campaignId: input.campaignId,
          organizationId: input.organizationId,
        },
        select: { id: true },
      });
      if (!candidate) throw new Error("CHALLENGE_INVITE_INVALID");

      const lock = await tx.challengeTeam.updateMany({
        where: {
          id: candidate.id,
          campaignId: input.campaignId,
          organizationId: input.organizationId,
          lockedAt: null,
        },
        data: { updatedAt: new Date() },
      });
      if (lock.count !== 1) throw new Error("CHALLENGE_TEAM_LOCKED");
      const team = await tx.challengeTeam.findUnique({
        where: { id: candidate.id },
        select: { id: true, capacity: true, lockedAt: true },
      });
      if (!team || team.lockedAt) throw new Error("CHALLENGE_TEAM_LOCKED");
      const memberCount = await tx.challengeParticipant.count({
        where: { teamId: team.id },
      });
      if (memberCount >= team.capacity) throw new Error("CHALLENGE_TEAM_FULL");

      const joined = existing
        ? await tx.challengeParticipant.update({
            where: { id: existing.id },
            data: {
              teamId: team.id,
              fullName: input.fullName,
              gradeKey: input.gradeKey,
              gradeLabel: input.gradeLabel,
              majorKey: input.majorKey,
              majorLabel: input.majorLabel,
              source: "TEAM_LINK",
              consentAt: new Date(),
            },
            select: { id: true, teamId: true },
          })
        : await tx.challengeParticipant.create({
            data: {
              organizationId: input.organizationId,
              campaignId: input.campaignId,
              userId: identity.userId,
              teamId: team.id,
              fullName: input.fullName,
              normalizedMobile: input.normalizedMobile,
              gradeKey: input.gradeKey,
              gradeLabel: input.gradeLabel,
              majorKey: input.majorKey,
              majorLabel: input.majorLabel,
              source: "TEAM_LINK",
              consentAt: new Date(),
            },
            select: { id: true, teamId: true },
          });
      if (memberCount + 1 >= team.capacity) {
        await tx.challengeTeam.updateMany({
          where: { id: team.id, lockedAt: null },
          data: { lockedAt: new Date() },
        });
      }
      return { id: joined.id, teamId: joined.teamId! };
    }

    const code = shortChallengeCode();
    const requestedName = input.teamName?.replace(/\s+/g, " ").trim() || null;
    const teamName = requestedName ?? `تیم ${code.slice(0, 5)}`;
    if (requestedName) {
      const duplicateName = await tx.challengeTeam.findFirst({
        where: {
          campaignId: input.campaignId,
          name: { equals: requestedName, mode: "insensitive" },
        },
        select: { id: true },
      });
      if (duplicateName) throw new Error("CHALLENGE_TEAM_NAME_TAKEN");
    }
    const team = await tx.challengeTeam.create({
      data: {
        organizationId: input.organizationId,
        campaignId: input.campaignId,
        name: teamName,
        inviteCode: code,
        capacity: input.teamSize,
      },
      select: { id: true },
    });

    if (existing) {
      const updated = await tx.challengeParticipant.update({
        where: { id: existing.id },
        data: { teamId: team.id, isCaptain: true },
        select: { id: true, teamId: true },
      });
      return { id: updated.id, teamId: updated.teamId! };
    }

    const created = await tx.challengeParticipant.create({
      data: {
        organizationId: input.organizationId,
        campaignId: input.campaignId,
        userId: identity.userId,
        teamId: team.id,
        fullName: input.fullName,
        normalizedMobile: input.normalizedMobile,
        gradeKey: input.gradeKey,
        gradeLabel: input.gradeLabel,
        majorKey: input.majorKey,
        majorLabel: input.majorLabel,
        source: "DIRECT",
        isCaptain: true,
        consentAt: new Date(),
      },
      select: { id: true, teamId: true },
    });
    return { id: created.id, teamId: created.teamId! };
  }, { maxWait: 5_000, timeout: 10_000 });

  await syncParticipantLead({
    participantId: participant.id,
    organizationId: input.organizationId,
    fullName: input.fullName,
    normalizedMobile: input.normalizedMobile,
    gradeLabel: input.gradeLabel,
    majorLabel: input.majorLabel,
  });

  return {
    ...identity,
    participantId: participant.id,
    teamId: participant.teamId,
  };
}
