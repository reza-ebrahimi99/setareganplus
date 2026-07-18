/**
 * Student portal dashboard loader.
 * Assessment visibility: organization-scoped results for the authorized student,
 * excluding deleted results and deleted/archived assessments.
 * Does not require public `isPublished` (portal is private authenticated access).
 */

import { prisma } from "@/lib/prisma";
import {
  getStudentAverage,
  getStudentLatestAssessment,
  getStudentTrend,
} from "@/lib/assessment/analytics";
import type { PortalContext } from "@/lib/portal/auth/types";
import { assertStudentVisible } from "@/lib/portal/auth";

export type PortalStudentDashboardDto = {
  studentId: string;
  studentName: string;
  gradeName: string;
  schoolYear: string | null;
  portraitUrl: string | null;
  latestAssessmentTitle: string | null;
  latestScore: number | null;
  latestAssessmentDate: Date | null;
  averageScore: number | null;
  assessmentCount: number;
  achievementCount: number;
  trendPoints: Array<{
    assessmentTitle: string;
    assessmentDate: Date | null;
    score: number | null;
    percentile: number | null;
  }>;
};

export async function loadStudentPortalDashboard(
  context: PortalContext,
  studentId?: string,
): Promise<PortalStudentDashboardDto> {
  const targetId =
    studentId ?? context.authorizedStudents[0]?.studentId ?? "";
  const student = assertStudentVisible(context, targetId, {
    requireAcademic: true,
  });

  const [latest, average, trend, assessmentCount, achievementCount] =
    await Promise.all([
      getStudentLatestAssessment(context.organization.id, student.studentId),
      getStudentAverage(context.organization.id, student.studentId),
      getStudentTrend(context.organization.id, student.studentId),
      prisma.assessmentResult.count({
        where: {
          organizationId: context.organization.id,
          studentId: student.studentId,
          deletedAt: null,
          assessment: { deletedAt: null, archivedAt: null },
        },
      }),
      prisma.achievement.count({
        where: {
          organizationId: context.organization.id,
          studentId: student.studentId,
          deletedAt: null,
          archivedAt: null,
          isPublished: true,
        },
      }),
    ]);

  return {
    studentId: student.studentId,
    studentName: student.studentName,
    gradeName: student.gradeName,
    schoolYear: student.schoolYear,
    portraitUrl: student.portraitUrl,
    latestAssessmentTitle: latest?.assessmentTitle ?? null,
    latestScore: latest?.score ?? null,
    latestAssessmentDate: latest?.assessmentDate ?? null,
    averageScore: average,
    assessmentCount,
    achievementCount,
    trendPoints: (trend?.points ?? [])
      .slice(-8)
      .reverse()
      .map((point) => ({
        assessmentTitle: point.assessmentTitle,
        assessmentDate: point.assessmentDate,
        score: point.score,
        percentile: point.percentile,
      })),
  };
}
