/**
 * Guidance Journey V2 plan loader.
 * Does NOT reuse the V1 mapper — that clamps currentStep to 12.
 */

import { prisma } from "@/lib/prisma";
import {
  GUIDANCE_V2_STEP_COUNT,
  isGuidanceV2StepId,
  type GuidanceV2StepId,
} from "@/lib/guidance/journey-v2/catalog";
import {
  normalizeGuidanceExamGroup,
  type GuidanceExamGroup,
} from "@/lib/guidance/journey-v2/constants";

export type GuidanceV2PlanSnapshot = {
  id: string;
  publicId: string;
  organizationId: string;
  userId: string;
  studentId: string;
  examGroup: GuidanceExamGroup;
  status: string;
  currentStep: GuidanceV2StepId;
  completedSteps: readonly GuidanceV2StepId[];
  completionPercentage: number;
  quota: string | null;
  guidancePackageCode: string | null;
  packagePaidAtIso: string | null;
  choicesApprovedAtIso: string | null;
  finalApprovedAtIso: string | null;
  v2InformedAckVersion: string | null;
  v2InformedRevisionId: string | null;
  v2SanjeshStatus: string | null;
  v2SanjeshDeclaredAtIso: string | null;
  v2SanjeshReference: string | null;
  v2SanjeshNote: string | null;
  v2SanjeshVerifiedAtIso: string | null;
  journeyVersion: number;
};

const PLAN_SELECT = {
  id: true,
  publicId: true,
  organizationId: true,
  userId: true,
  studentId: true,
  examGroup: true,
  status: true,
  currentStep: true,
  completedSteps: true,
  completionPercentage: true,
  quota: true,
  guidancePackageCode: true,
  packagePaidAt: true,
  choicesApprovedAt: true,
  finalApprovedAt: true,
  v2InformedAckVersion: true,
  v2InformedRevisionId: true,
  v2SanjeshStatus: true,
  v2SanjeshDeclaredAt: true,
  v2SanjeshReference: true,
  v2SanjeshNote: true,
  v2SanjeshVerifiedAt: true,
  journeyVersion: true,
} as const;

export function parseV2CompletedSteps(raw: unknown): GuidanceV2StepId[] {
  if (!Array.isArray(raw)) return [];
  const steps = raw.filter(isGuidanceV2StepId);
  return Array.from(new Set(steps)).sort((a, b) => a - b);
}

function clampV2CurrentStep(raw: number): GuidanceV2StepId {
  if (isGuidanceV2StepId(raw)) return raw;
  if (raw < 1) return 1;
  return GUIDANCE_V2_STEP_COUNT;
}

export function mapGuidanceV2Plan(row: {
  id: string;
  publicId: string;
  organizationId: string;
  userId: string;
  studentId: string;
  examGroup: string;
  status: string;
  currentStep: number;
  completedSteps: unknown;
  completionPercentage: number;
  quota: string | null;
  guidancePackageCode: string | null;
  packagePaidAt: Date | null;
  choicesApprovedAt: Date | null;
  finalApprovedAt: Date | null;
  v2InformedAckVersion: string | null;
  v2InformedRevisionId: string | null;
  v2SanjeshStatus: string | null;
  v2SanjeshDeclaredAt: Date | null;
  v2SanjeshReference: string | null;
  v2SanjeshNote: string | null;
  v2SanjeshVerifiedAt: Date | null;
  journeyVersion: number;
}): GuidanceV2PlanSnapshot {
  return {
    id: row.id,
    publicId: row.publicId,
    organizationId: row.organizationId,
    userId: row.userId,
    studentId: row.studentId,
    examGroup: normalizeGuidanceExamGroup(row.examGroup),
    status: row.status,
    currentStep: clampV2CurrentStep(row.currentStep),
    completedSteps: parseV2CompletedSteps(row.completedSteps),
    completionPercentage: row.completionPercentage,
    quota: row.quota,
    guidancePackageCode: row.guidancePackageCode,
    packagePaidAtIso: row.packagePaidAt?.toISOString() ?? null,
    choicesApprovedAtIso: row.choicesApprovedAt?.toISOString() ?? null,
    finalApprovedAtIso: row.finalApprovedAt?.toISOString() ?? null,
    v2InformedAckVersion: row.v2InformedAckVersion,
    v2InformedRevisionId: row.v2InformedRevisionId,
    v2SanjeshStatus: row.v2SanjeshStatus,
    v2SanjeshDeclaredAtIso: row.v2SanjeshDeclaredAt?.toISOString() ?? null,
    v2SanjeshReference: row.v2SanjeshReference,
    v2SanjeshNote: row.v2SanjeshNote,
    v2SanjeshVerifiedAtIso: row.v2SanjeshVerifiedAt?.toISOString() ?? null,
    journeyVersion: row.journeyVersion,
  };
}

export async function loadGuidanceV2Plan(params: {
  organizationId: string;
  studentId: string;
  userId?: string;
}): Promise<GuidanceV2PlanSnapshot | null> {
  const row = await prisma.guidancePlan.findFirst({
    where: {
      organizationId: params.organizationId,
      studentId: params.studentId,
      deletedAt: null,
      journeyVersion: 2,
      ...(params.userId ? { userId: params.userId } : {}),
    },
    orderBy: { updatedAt: "desc" },
    select: PLAN_SELECT,
  });
  return row ? mapGuidanceV2Plan(row) : null;
}

export type GuidanceJourneyV2PlanSnapshot = GuidanceV2PlanSnapshot;

/**
 * Production Steps 1–10 name. Same callable contract as the live loader:
 * `{ organizationId, studentId, userId? }`. `userId` stays optional so both
 * the old required-style call and the new org+student call typecheck.
 */
export async function loadGuidanceJourneyV2Plan(params: {
  organizationId: string;
  studentId: string;
  userId?: string;
}): Promise<GuidanceJourneyV2PlanSnapshot | null> {
  return loadGuidanceV2Plan(params);
}

export function assertPackagePaid(plan: { packagePaidAtIso: string | null }): boolean {
  return Boolean(plan.packagePaidAtIso);
}
