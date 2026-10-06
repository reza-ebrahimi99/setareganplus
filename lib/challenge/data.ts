import { ChallengeAttemptStatus } from "@/generated/prisma/enums";
import type { ChallengeSessionContext } from "@/lib/challenge/auth/session";
import { prisma } from "@/lib/prisma";

export async function getChallengeParticipant(
  session: ChallengeSessionContext,
  campaignId: string,
) {
  if (session.organizationId === "") return null;
  return prisma.challengeParticipant.findFirst({
    where: {
      organizationId: session.organizationId,
      campaignId,
      userId: session.userId,
    },
    include: {
      team: {
        include: {
          scholarshipTier: true,
          participants: {
            orderBy: [{ isCaptain: "desc" }, { joinedAt: "asc" }],
            select: {
              id: true,
              fullName: true,
              normalizedMobile: true,
              isCaptain: true,
              completedAt: true,
              gradeLabel: true,
            },
          },
          invitations: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              inviteeName: true,
              normalizedMobile: true,
              status: true,
              sentAt: true,
              acceptedAt: true,
              expiresAt: true,
            },
          },
        },
      },
      certificates: {
        where: { revokedAt: null },
        orderBy: { issuedAt: "desc" },
        take: 1,
      },
      attempts: {
        where: { status: ChallengeAttemptStatus.SUBMITTED },
        orderBy: { submittedAt: "desc" },
        take: 1,
        select: {
          id: true,
          percentage: true,
          submittedAt: true,
          correctCount: true,
          wrongCount: true,
          unansweredCount: true,
        },
      },
    },
  });
}

export function maskIranianMobile(mobile: string): string {
  if (mobile.length < 8) return mobile;
  return `${mobile.slice(0, 4)}•••${mobile.slice(-4)}`;
}
