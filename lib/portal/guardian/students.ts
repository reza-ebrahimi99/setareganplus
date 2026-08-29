import type { PortalContext } from "@/lib/portal/auth/types";

export function listGuardianAuthorizedStudents(context: PortalContext) {
  return context.authorizedStudents.map((student) => ({
    studentId: student.studentId,
    studentName: student.studentName,
    gradeName: student.gradeName,
    schoolYear: student.schoolYear,
    portraitUrl: student.portraitUrl,
    canViewAcademicData: student.canViewAcademicData,
    canViewAchievements: student.canViewAchievements,
    canViewCertificates: student.canViewCertificates,
    relationshipType: student.relationshipType,
  }));
}
