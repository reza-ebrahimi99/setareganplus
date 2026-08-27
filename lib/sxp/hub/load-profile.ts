import { SXP_MEMBERSHIP_LEVEL_SOON } from "@/lib/sxp/constants";
import { membershipLabelFor } from "@/lib/sxp/engine/card";
import { prisma } from "@/lib/prisma";
import { ensureStudentCardsFromContext } from "@/lib/sxp/engine/handlers/student-card-refresher";
import { ensureExperienceProfile } from "@/lib/sxp/profile";
import type { PortalContext } from "@/lib/portal/auth/types";

export type ExperienceProfileDto = {
  displayName: string;
  interests: string | null;
  studentName: string | null;
  gradeName: string | null;
  schoolYear: string | null;
  portraitUrl: string | null;
  membershipLabel: string;
  membershipLevelLabel: string;
  completionRatio: number;
  studentCode: string | null;
};

export async function loadExperienceProfileHub(
  context: PortalContext,
): Promise<ExperienceProfileDto> {
  const student = context.authorizedStudents[0] ?? null;
  const profile = await ensureExperienceProfile({
    organizationId: context.organization.id,
    userId: context.user.id,
    displayName: context.user.displayName,
  });

  await ensureStudentCardsFromContext(context);
  const card = student
    ? await prisma.experienceStudentCard.findUnique({
        where: {
          organizationId_userId_studentId: {
            organizationId: context.organization.id,
            userId: context.user.id,
            studentId: student.studentId,
          },
        },
        select: {
          membershipLabel: true,
          completionRatio: true,
          studentCode: true,
        },
      })
    : null;

  return {
    displayName: profile.displayName ?? context.user.displayName,
    interests: profile.interests,
    studentName: student?.studentName ?? null,
    gradeName: student?.gradeName ?? null,
    schoolYear: student?.schoolYear ?? null,
    portraitUrl: student?.portraitUrl ?? null,
    membershipLabel:
      card?.membershipLabel ?? membershipLabelFor(context.activeLink.accountType),
    membershipLevelLabel: SXP_MEMBERSHIP_LEVEL_SOON,
    completionRatio: card?.completionRatio ?? 0,
    studentCode: card?.studentCode ?? student?.studentSlug ?? null,
  };
}
