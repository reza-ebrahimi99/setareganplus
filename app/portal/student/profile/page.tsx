import type { Metadata } from "next";
import { IdentityProfileScreen } from "@/components/portal/apps/IdentityProfileScreen";
import { requireStudentPortalAccess } from "@/lib/portal/auth";
import {
  loadStudentIntelligenceSnapshot,
  StudentInsightEngine,
} from "@/lib/portal/intelligence";
import { loadExperienceProfileHub } from "@/lib/sxp/hub/load-profile";

export const metadata: Metadata = {
  title: "هویت من",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function StudentPortalProfilePage() {
  const context = await requireStudentPortalAccess();
  const studentId = context.authorizedStudents[0]!.studentId;

  const snapshot = await loadStudentIntelligenceSnapshot(context, studentId, {
    includeAssessments: false,
    includeAchievements: false,
    includeExperience: false,
  });

  const profileModel = StudentInsightEngine.profile(snapshot);
  const experience = snapshot.flags.sxpEnabled
    ? await loadExperienceProfileHub(context)
    : null;

  return (
    <IdentityProfileScreen
      profile={profileModel.profile}
      organizationName={profileModel.organizationName}
      userDisplayName={profileModel.userDisplayName}
      experience={experience}
    />
  );
}
