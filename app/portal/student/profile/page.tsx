import type { Metadata } from "next";
import { IdentityProfileScreen } from "@/components/portal/apps/IdentityProfileScreen";
import { requireStudentPortalAccess } from "@/lib/portal/auth";
import { loadPortalStudentProfile } from "@/lib/portal/student/profile";
import { isSxpEnabled } from "@/lib/sxp/flags";
import { loadExperienceProfileHub } from "@/lib/sxp/hub/load-profile";

export const metadata: Metadata = {
  title: "هویت من",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function StudentPortalProfilePage() {
  const context = await requireStudentPortalAccess();
  const studentId = context.authorizedStudents[0]!.studentId;
  const profile = loadPortalStudentProfile(context, studentId);
  const sxpEnabled = await isSxpEnabled(context.organization.id);
  const experience = sxpEnabled
    ? await loadExperienceProfileHub(context)
    : null;

  return (
    <IdentityProfileScreen
      profile={profile}
      organizationName={context.organization.name}
      userDisplayName={context.user.displayName}
      experience={experience}
    />
  );
}
