/**
 * Guidance ERP — portal loaders (student-owned plan, org-scoped).
 */

import {
  GuidanceDocumentType,
  GuidanceDocumentVerificationStatus,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import type { GuidanceStatus } from "@/lib/guidance/types";

export type GuidancePortalPlanSummary = {
  id: string;
  publicId: string;
  status: GuidanceStatus;
  examGroup: string;
  latestFinalGrades: {
    id: string;
    versionNumber: number;
    originalFilename: string;
    verificationStatus: GuidanceDocumentVerificationStatus;
    createdAt: Date;
  } | null;
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
          isLatest: true,
        },
        take: 1,
        select: {
          id: true,
          versionNumber: true,
          originalFilename: true,
          verificationStatus: true,
          createdAt: true,
        },
      },
    },
  });

  if (!plan) return null;

  const latest = plan.documents[0] ?? null;
  return {
    id: plan.id,
    publicId: plan.publicId,
    status: plan.status as GuidanceStatus,
    examGroup: plan.examGroup,
    latestFinalGrades: latest,
  };
}
