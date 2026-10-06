import { randomUUID } from "node:crypto";
import { ChallengeAttemptStatus } from "@/generated/prisma/enums";
import { getChallengePublicOrigin } from "@/lib/challenge/host";
import { deliverChallengeSmsNow } from "@/lib/challenge/invitations";
import { enqueueSms } from "@/lib/communication/queue";
import { prisma } from "@/lib/prisma";

function fillTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{([a-zA-Z]+)\}\}/g, (_match, key: string) => {
    return values[key] ?? "";
  });
}

function verificationCode(): string {
  return randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase();
}

function serialNumber(): string {
  const year = new Date().getUTCFullYear();
  return `SP-${year}-${randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`;
}

export async function finalizeChallengeTeam(teamId: string): Promise<{
  unlocked: boolean;
  newlyUnlocked: boolean;
}> {
  const finalization = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${teamId}))`;
    const team = await tx.challengeTeam.findUnique({
      where: { id: teamId },
      include: {
        campaign: true,
        participants: {
          orderBy: { joinedAt: "asc" },
          select: {
            id: true,
            fullName: true,
            normalizedMobile: true,
          },
        },
      },
    });
    if (!team) return { unlocked: false, newlyUnlocked: false, team: null };
    if (team.resultUnlockedAt) {
      return { unlocked: true, newlyUnlocked: false, team: null };
    }
    if (team.participants.length !== team.capacity) {
      return { unlocked: false, newlyUnlocked: false, team: null };
    }

    const participantIds = team.participants.map((member) => member.id);
    const attempts = await tx.challengeAttempt.findMany({
      where: {
        participantId: { in: participantIds },
        status: ChallengeAttemptStatus.SUBMITTED,
      },
      orderBy: { submittedAt: "desc" },
      select: {
        participantId: true,
        rawScore: true,
        percentage: true,
        correctCount: true,
        wrongCount: true,
        unansweredCount: true,
      },
    });
    const byParticipant = new Map<
      string,
      (typeof attempts)[number]
    >();
    for (const attempt of attempts) {
      if (!byParticipant.has(attempt.participantId)) {
        byParticipant.set(attempt.participantId, attempt);
      }
    }
    if (participantIds.some((id) => !byParticipant.has(id))) {
      return { unlocked: false, newlyUnlocked: false, team: null };
    }

    const completed = participantIds.map((id) => byParticipant.get(id)!);
    const teamScore = completed.reduce((sum, item) => sum + (item.rawScore ?? 0), 0);
    const averagePercentage =
      completed.reduce((sum, item) => sum + (item.percentage ?? 0), 0) /
      completed.length;
    const totalCorrect = completed.reduce(
      (sum, item) => sum + (item.correctCount ?? 0),
      0,
    );
    const totalWrong = completed.reduce(
      (sum, item) => sum + (item.wrongCount ?? 0),
      0,
    );
    const totalUnanswered = completed.reduce(
      (sum, item) => sum + (item.unansweredCount ?? 0),
      0,
    );

    const tiers = await tx.challengeScholarshipTier.findMany({
      where: {
        campaignId: team.campaignId,
        isActive: true,
        minPercentage: { lte: averagePercentage },
      },
      orderBy: [{ minPercentage: "desc" }, { sortOrder: "asc" }],
    });
    const tier =
      tiers.find(
        (item) =>
          item.maxPercentage === null || averagePercentage <= item.maxPercentage,
      ) ?? null;
    const now = new Date();

    await tx.challengeTeam.update({
      where: { id: team.id },
      data: {
        lockedAt: team.lockedAt ?? now,
        resultUnlockedAt: now,
        teamScore: Math.round(teamScore * 100) / 100,
        averagePercentage: Math.round(averagePercentage * 100) / 100,
        totalCorrect,
        totalWrong,
        totalUnanswered,
        scholarshipTierId: tier?.id ?? null,
      },
    });

    await tx.challengeCertificate.createMany({
      data: team.participants.map((member) => ({
        organizationId: team.organizationId,
        campaignId: team.campaignId,
        teamId: team.id,
        participantId: member.id,
        verificationCode: verificationCode(),
        serialNumber: serialNumber(),
        metadata: {
          campaignTitle: team.campaign.title,
          teamName: team.name,
          participantName: member.fullName,
          averagePercentage: Math.round(averagePercentage * 100) / 100,
          scholarshipTier: tier?.title ?? null,
          prizeLabel: tier?.prizeLabel ?? null,
        },
      })),
      skipDuplicates: true,
    });

    return {
      unlocked: true,
      newlyUnlocked: true,
      team: {
        id: team.id,
        organizationId: team.organizationId,
        campaignId: team.campaignId,
        campaignTitle: team.campaign.title,
        smsTemplate: team.campaign.completionSmsTemplate,
        participants: team.participants,
      },
    };
  });

  if (finalization.newlyUnlocked && finalization.team) {
    const resultUrl = `${getChallengePublicOrigin()}/result`;
    await Promise.allSettled(
      finalization.team.participants.map(async (member) => {
        const queued = await enqueueSms({
          organizationId: finalization.team!.organizationId,
          toMobile: member.normalizedMobile,
          body: fillTemplate(finalization.team!.smsTemplate, {
            name: member.fullName,
            campaignTitle: finalization.team!.campaignTitle,
            resultUrl,
          }),
          purpose: "challenge_result_ready",
          idempotencyKey: `challenge-result:${finalization.team!.id}:${member.id}`,
          relatedType: "ChallengeTeam",
          relatedId: finalization.team!.id,
          metadata: {
            campaignId: finalization.team!.campaignId,
            teamId: finalization.team!.id,
          },
        });
        if (queued.ok) await deliverChallengeSmsNow(queued.messageId);
      }),
    );
  }

  return {
    unlocked: finalization.unlocked,
    newlyUnlocked: finalization.newlyUnlocked,
  };
}
