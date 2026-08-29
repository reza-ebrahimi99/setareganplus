import type { PortalContext } from "@/lib/portal/auth/types";
import { loadStudentPortalDashboard } from "@/lib/portal/student/dashboard";

export type GuardianPortalDashboardDto = {
  guardianLabel: string;
  students: Array<{
    studentId: string;
    studentName: string;
    gradeName: string;
    schoolYear: string | null;
    portraitUrl: string | null;
    latestScore: number | null;
    assessmentCount: number;
    achievementCount: number;
  }>;
};

export async function loadGuardianPortalDashboard(
  context: PortalContext,
): Promise<GuardianPortalDashboardDto> {
  const students = [];
  for (const authorized of context.authorizedStudents) {
    if (!authorized.canViewAcademicData && !authorized.canViewAchievements) {
      students.push({
        studentId: authorized.studentId,
        studentName: authorized.studentName,
        gradeName: authorized.gradeName,
        schoolYear: authorized.schoolYear,
        portraitUrl: authorized.portraitUrl,
        latestScore: null,
        assessmentCount: 0,
        achievementCount: 0,
      });
      continue;
    }
    const dash = await loadStudentPortalDashboard(
      context,
      authorized.studentId,
    );
    students.push({
      studentId: dash.studentId,
      studentName: dash.studentName,
      gradeName: dash.gradeName,
      schoolYear: dash.schoolYear,
      portraitUrl: dash.portraitUrl,
      latestScore: dash.latestScore,
      assessmentCount: dash.assessmentCount,
      achievementCount: dash.achievementCount,
    });
  }

  return {
    guardianLabel: context.activeLink.label,
    students,
  };
}
