/**
 * V2 Step 18 — official Sanjesh submission tracking.
 * Does not call any Sanjesh API and never stores credentials.
 */

import { AuditAction, GuidanceDocumentType } from "@/generated/prisma/enums";
import { formatJalaliDateTimeShort } from "@/lib/datetime/jalali";
import { SANJESH_STATUS, type SanjeshStatus } from "@/lib/guidance/journey-v2/constants";
import { labelSanjeshStatus } from "@/lib/guidance/journey-v2/labels";
import {
  loadLatestGuidanceDocument,
  uploadGuidanceTypedDocument,
} from "@/lib/guidance/journey-v2/documents";
import { prisma } from "@/lib/prisma";

export type SanjeshCaseView = {
  status: SanjeshStatus;
  statusLabel: string;
  declaredAtLabel: string | null;
  reference: string | null;
  note: string | null;
  verifiedAtLabel: string | null;
  receipt: { id: string; filename: string; uploadedLabel: string } | null;
};

export async function loadSanjeshCase(params: {
  organizationId: string;
  planId: string;
}): Promise<SanjeshCaseView> {
  const plan = await prisma.guidancePlan.findFirst({
    where: { id: params.planId, organizationId: params.organizationId, deletedAt: null },
    select: {
      v2SanjeshStatus: true,
      v2SanjeshDeclaredAt: true,
      v2SanjeshReference: true,
      v2SanjeshNote: true,
      v2SanjeshVerifiedAt: true,
    },
  });
  const receipt = await loadLatestGuidanceDocument({
    organizationId: params.organizationId,
    planId: params.planId,
    documentType: GuidanceDocumentType.SANJESH_RECEIPT,
  });
  const status = (plan?.v2SanjeshStatus as SanjeshStatus | null) ?? SANJESH_STATUS.NOT_SUBMITTED;
  return {
    status,
    statusLabel: labelSanjeshStatus(status),
    declaredAtLabel: plan?.v2SanjeshDeclaredAt
      ? formatJalaliDateTimeShort(plan.v2SanjeshDeclaredAt)
      : null,
    reference: plan?.v2SanjeshReference ?? null,
    note: plan?.v2SanjeshNote ?? null,
    verifiedAtLabel: plan?.v2SanjeshVerifiedAt
      ? formatJalaliDateTimeShort(plan.v2SanjeshVerifiedAt)
      : null,
    receipt: receipt
      ? {
          id: receipt.id,
          filename: receipt.originalFilename,
          uploadedLabel: formatJalaliDateTimeShort(receipt.createdAt),
        }
      : null,
  };
}

export async function declareSanjeshSubmission(params: {
  organizationId: string;
  actorUserId: string;
  planId: string;
  planPublicId: string;
  reference?: string;
  note?: string;
  submittedAt?: string;
  file: File | null;
}) {
  if (params.file) {
    const uploaded = await uploadGuidanceTypedDocument({
      organizationId: params.organizationId,
      planId: params.planId,
      planPublicId: params.planPublicId,
      userId: params.actorUserId,
      file: params.file,
      documentType: GuidanceDocumentType.SANJESH_RECEIPT,
    });
    if (!uploaded.ok) return uploaded;
  }

  const declaredAt = params.submittedAt
    ? new Date(params.submittedAt)
    : new Date();

  await prisma.guidancePlan.update({
    where: { id: params.planId },
    data: {
      v2SanjeshStatus: SANJESH_STATUS.PENDING_REVIEW,
      v2SanjeshDeclaredAt: Number.isNaN(declaredAt.getTime()) ? new Date() : declaredAt,
      v2SanjeshReference: params.reference?.trim().slice(0, 80) || null,
      v2SanjeshNote: params.note?.trim().slice(0, 800) || null,
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: params.organizationId,
      actorUserId: params.actorUserId,
      action: AuditAction.GUIDANCE_STATUS_CHANGED,
      entityType: "GuidancePlan",
      entityId: params.planId,
      metadata: {
        publicId: params.planPublicId,
        step: 18,
        sanjesh: "declared",
      },
    },
  });

  return { ok: true as const };
}

export async function verifySanjeshSubmission(params: {
  organizationId: string;
  actorUserId: string;
  planId: string;
  decision: "VERIFIED" | "NEEDS_FIX";
  note?: string;
}) {
  await prisma.guidancePlan.update({
    where: { id: params.planId },
    data: {
      v2SanjeshStatus: params.decision,
      v2SanjeshVerifiedAt: params.decision === "VERIFIED" ? new Date() : null,
      v2SanjeshVerifiedByUserId: params.decision === "VERIFIED" ? params.actorUserId : null,
      v2SanjeshNote: params.note?.trim().slice(0, 800) || undefined,
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: params.organizationId,
      actorUserId: params.actorUserId,
      action: AuditAction.GUIDANCE_STATUS_CHANGED,
      entityType: "GuidancePlan",
      entityId: params.planId,
      metadata: { step: 18, sanjesh: params.decision },
    },
  });
}
