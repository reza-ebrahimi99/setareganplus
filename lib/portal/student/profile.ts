import type { PortalContext } from "@/lib/portal/auth/types";
import { assertStudentVisible } from "@/lib/portal/auth";

export type PortalStudentProfileDto = {
  studentId: string;
  studentName: string;
  studentSlug: string;
  gradeName: string;
  schoolYear: string | null;
  portraitUrl: string | null;
};

export function loadPortalStudentProfile(
  context: PortalContext,
  studentId: string,
): PortalStudentProfileDto {
  const student = assertStudentVisible(context, studentId);
  return {
    studentId: student.studentId,
    studentName: student.studentName,
    studentSlug: student.studentSlug,
    gradeName: student.gradeName,
    schoolYear: student.schoolYear,
    portraitUrl: student.portraitUrl,
  };
}
