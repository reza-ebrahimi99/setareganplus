import type { PortalContext } from "@/lib/portal/auth/types";
import { assertStudentVisible } from "@/lib/portal/auth";
import { loadStudentPortalDashboard } from "@/lib/portal/student/dashboard";
import { loadPortalStudentAssessments } from "@/lib/portal/student/assessments";
import { loadPortalStudentAchievements } from "@/lib/portal/student/achievements";

export async function loadGuardianStudentDashboard(
  context: PortalContext,
  studentId: string,
) {
  const access = assertStudentVisible(context, studentId);
  const [dashboard, assessments, achievements] = await Promise.all([
    access.canViewAcademicData
      ? loadStudentPortalDashboard(context, studentId)
      : Promise.resolve(null),
    access.canViewAcademicData
      ? loadPortalStudentAssessments(context, studentId)
      : Promise.resolve([]),
    access.canViewAchievements
      ? loadPortalStudentAchievements(context, studentId, {
          includeCertificates: access.canViewCertificates,
        })
      : Promise.resolve([]),
  ]);

  return {
    access,
    dashboard,
    assessments,
    achievements,
  };
}
