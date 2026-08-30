import { ensureExperienceProfile } from "@/lib/sxp/profile";
import type { PortalContext } from "@/lib/portal/auth/types";

export type ExperienceProfileDto = {
  displayName: string;
  interests: string | null;
  studentName: string | null;
  gradeName: string | null;
  schoolYear: string | null;
  portraitUrl: string | null;
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

  return {
    displayName: profile.displayName ?? context.user.displayName,
    interests: profile.interests,
    studentName: student?.studentName ?? null,
    gradeName: student?.gradeName ?? null,
    schoolYear: student?.schoolYear ?? null,
    portraitUrl: student?.portraitUrl ?? null,
  };
}
