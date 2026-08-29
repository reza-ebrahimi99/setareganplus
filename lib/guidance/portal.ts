/**
 * Guidance ERP — portal loaders (student-owned plan, org-scoped).
 */

import {
  GuidanceDocumentType,
  GuidanceDocumentVerificationStatus,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import type { GuidanceStatus } from "@/lib/guidance/types";

export type GuidanceFinalGradesDocumentSummary = {
  id: string;
  versionNumber: number;
  originalFilename: string;
  verificationStatus: GuidanceDocumentVerificationStatus;
  createdAt: Date;
  isLatest: boolean;
};

export type GuidancePortalPlanSummary = {
  id: string;
  publicId: string;
  status: GuidanceStatus;
  examGroup: string;
  latestFinalGrades: GuidanceFinalGradesDocumentSummary | null;
  /** Newest-first upload versions (same query — no extra round-trip). */
  finalGradesHistory: GuidanceFinalGradesDocumentSummary[];
};

export async function loadGuidancePlanForPortalUser(params: {
  organizationId: string;
  userId: string;
  studentId: string;
}): Promise<GuidancePortalPlanSummary | null> {
  const plan = await prisma.guidancePlan.findFirst({
    where: {
      organizationId: params.organizationId,
      userId: params.userId,
      studentId: params.studentId,
      deletedAt: null,
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      publicId: true,
      status: true,
      examGroup: true,
      documents: {
        where: {
          deletedAt: null,
          documentType: GuidanceDocumentType.FINAL_GRADES,
        },
        orderBy: { versionNumber: "desc" },
        take: 12,
        select: {
          id: true,
          versionNumber: true,
          originalFilename: true,
          verificationStatus: true,
          createdAt: true,
          isLatest: true,
        },
      },
    },
  });

  if (!plan) return null;

  const history: GuidanceFinalGradesDocumentSummary[] = plan.documents.map(
    (doc) => ({
      id: doc.id,
      versionNumber: doc.versionNumber,
      originalFilename: doc.originalFilename,
      verificationStatus: doc.verificationStatus,
      createdAt: doc.createdAt,
      isLatest: doc.isLatest,
    }),
  );
  const latest =
    history.find((doc) => doc.isLatest) ?? history[0] ?? null;

  return {
    id: plan.id,
    publicId: plan.publicId,
    status: plan.status as GuidanceStatus,
    examGroup: plan.examGroup,
    latestFinalGrades: latest,
    finalGradesHistory: history,
  };
}
