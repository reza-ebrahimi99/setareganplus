import { prisma } from "@/lib/prisma";
import type { PortalContext } from "@/lib/portal/auth/types";
import { assertStudentVisible } from "@/lib/portal/auth";
import { ASSESSMENT_TYPE_LABELS } from "@/lib/assessment/types";

export type PortalAssessmentResultDto = {
  id: string;
  assessmentTitle: string;
  assessmentSlug: string;
  assessmentDate: Date | null;
  schoolYear: string | null;
  providerName: string;
  assessmentTypeLabel: string;
  score: number | null;
  scaledScore: number | null;
  percentile: number | null;
  growth: number | null;
  rankSchool: number | null;
  rankCity: number | null;
  rankProvince: number | null;
  rankCountry: number | null;
  subjects: Array<{
    name: string;
    percentage: number | null;
  }>;
};

/**
 * Private assessment history for an authorized student.
 * Policy: not deleted; assessment not deleted/archived; notes excluded.
 */
export async function loadPortalStudentAssessments(
  context: PortalContext,
  studentId: string,
): Promise<PortalAssessmentResultDto[]> {
  assertStudentVisible(context, studentId, { requireAcademic: true });

  const rows = await prisma.assessmentResult.findMany({
    where: {
      organizationId: context.organization.id,
      studentId,
      deletedAt: null,
      assessment: { deletedAt: null, archivedAt: null },
    },
    orderBy: [
      { assessment: { assessmentDate: "desc" } },
      { createdAt: "desc" },
    ],
    select: {
      id: true,
      score: true,
      scaledScore: true,
      percentile: true,
      growth: true,
      rankSchool: true,
      rankCity: true,
      rankProvince: true,
      rankCountry: true,
      assessment: {
        select: {
          title: true,
          slug: true,
          assessmentDate: true,
          schoolYear: true,
          assessmentType: true,
          provider: { select: { name: true } },
        },
      },
      subjectResults: {
        select: {
          percentage: true,
          subject: { select: { name: true, displayOrder: true } },
        },
        orderBy: { subject: { displayOrder: "asc" } },
      },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    assessmentTitle: row.assessment.title,
    assessmentSlug: row.assessment.slug,
    assessmentDate: row.assessment.assessmentDate,
    schoolYear: row.assessment.schoolYear,
    providerName: row.assessment.provider.name,
    assessmentTypeLabel: ASSESSMENT_TYPE_LABELS[row.assessment.assessmentType],
    score: row.score,
    scaledScore: row.scaledScore,
    percentile: row.percentile,
    growth: row.growth,
    rankSchool: row.rankSchool,
    rankCity: row.rankCity,
    rankProvince: row.rankProvince,
    rankCountry: row.rankCountry,
    subjects: row.subjectResults.map((subject) => ({
      name: subject.subject.name,
      percentage: subject.percentage,
    })),
  }));
}
