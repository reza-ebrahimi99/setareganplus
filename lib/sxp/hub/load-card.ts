import { prisma } from "@/lib/prisma";
import { SXP_MEMBERSHIP_LEVEL_SOON } from "@/lib/sxp/constants";
import { generateSxpCardQrDataUrl } from "@/lib/sxp/engine/qr";
import { ensureStudentCardsFromContext } from "@/lib/sxp/engine/handlers/student-card-refresher";
import { ensureExperienceProfile } from "@/lib/sxp/profile";
import type { PortalContext } from "@/lib/portal/auth/types";

export type ExperienceCardDto = {
  studentId: string;
  displayName: string;
  studentCode: string | null;
  maskedNationalCode: string | null;
  schoolName: string;
  branchName: string | null;
  gradeName: string | null;
  schoolYear: string | null;
  membershipLabel: string;
  membershipLevelLabel: string;
  portraitUrl: string | null;
  qrPayload: string;
  qrDataUrl: string;
  portalId: string;
  completionRatio: number;
};

export type ExperienceCardPageDto = {
  displayName: string;
  organizationName: string;
  cards: ExperienceCardDto[];
};

export async function loadExperienceCards(
  context: PortalContext,
): Promise<ExperienceCardPageDto> {
  const profile = await ensureExperienceProfile({
    organizationId: context.organization.id,
    userId: context.user.id,
    displayName: context.user.displayName,
  });

  await ensureStudentCardsFromContext(context);

  const authorizedIds = new Set(
    context.authorizedStudents.map((row) => row.studentId),
  );
  const rows = await prisma.experienceStudentCard.findMany({
    where: {
      organizationId: context.organization.id,
      userId: context.user.id,
    },
    orderBy: { createdAt: "asc" },
  });

  const cards: ExperienceCardDto[] = [];
  for (const row of rows) {
    if (!authorizedIds.has(row.studentId)) continue;
    cards.push({
      studentId: row.studentId,
      displayName: row.displayName,
      studentCode: row.studentCode,
      maskedNationalCode: row.maskedNationalCode,
      schoolName: row.schoolName,
      branchName: row.branchName,
      gradeName: row.gradeName,
      schoolYear: row.schoolYear,
      membershipLabel: row.membershipLabel,
      membershipLevelLabel: SXP_MEMBERSHIP_LEVEL_SOON,
      portraitUrl: row.portraitUrl,
      qrPayload: row.qrPayload,
      qrDataUrl: await generateSxpCardQrDataUrl(row.qrPayload),
      portalId: row.portalId,
      completionRatio: row.completionRatio,
    });
  }

  return {
    displayName: profile.displayName ?? context.user.displayName,
    organizationName: context.organization.name,
    cards,
  };
}
