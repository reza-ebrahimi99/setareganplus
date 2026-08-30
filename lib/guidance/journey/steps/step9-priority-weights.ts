/**
 * Guidance Journey Engine — Step 9: Priority Weight (Phase 1).
 * Student ranks all 10 fixed factors end-to-end (no enable/disable — every
 * factor always matters, only the order/weight differs).
 */

import { AuditAction } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { advanceGuidanceJourneyStep } from "@/lib/guidance/journey/advance";
import {
  loadGuidanceStepData,
  saveGuidanceStepData,
} from "@/lib/guidance/journey/step-store";
import { GUIDANCE_PRIORITY_FACTORS } from "@/lib/guidance/journey/reference-data/priority-factors";

export const STEP9_CATEGORY = "guidance-journey-step9";
export const STEP9_KIND = "guidance-journey-step9";

export type Step9Data = {
  orderedCodes: string[];
};

const ALL_CODES: readonly string[] = GUIDANCE_PRIORITY_FACTORS.map((f) => f.code);

function defaultStep9Data(): Step9Data {
  return { orderedCodes: [...ALL_CODES] };
}

function validateStoredData(raw: unknown): Step9Data | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.orderedCodes)) return null;
  const codes = obj.orderedCodes.filter(
    (c): c is string => typeof c === "string" && ALL_CODES.includes(c),
  );
  if (codes.length !== ALL_CODES.length) return null;
  return { orderedCodes: codes };
}

export async function loadStep9Data(params: {
  organizationId: string;
  planPublicId: string;
}): Promise<Step9Data> {
  const stored = await loadGuidanceStepData<Step9Data>({
    organizationId: params.organizationId,
    category: STEP9_CATEGORY,
    kind: STEP9_KIND,
    planPublicId: params.planPublicId,
    validate: validateStoredData,
  });
  return stored.data ?? defaultStep9Data();
}

export type CompleteStep9Result = { ok: true } | { ok: false; error: string };

export async function completeGuidanceStep9(params: {
  organizationId: string;
  actorUserId: string;
  studentId: string;
  planId: string;
  planPublicId: string;
  orderedCodes: string[];
}): Promise<CompleteStep9Result> {
  const unique = new Set(params.orderedCodes);
  const isValid =
    params.orderedCodes.length === ALL_CODES.length &&
    unique.size === ALL_CODES.length &&
    params.orderedCodes.every((code) => ALL_CODES.includes(code));

  if (!isValid) {
    return { ok: false, error: "ترتیب اولویت‌ها نامعتبر است." };
  }

  await saveGuidanceStepData<Step9Data>({
    organizationId: params.organizationId,
    actorUserId: params.actorUserId,
    category: STEP9_CATEGORY,
    kind: STEP9_KIND,
    planId: params.planId,
    planPublicId: params.planPublicId,
    data: { orderedCodes: params.orderedCodes },
    filenamePrefix: "guidance-step9",
  });

  await prisma.auditLog.create({
    data: {
      organizationId: params.organizationId,
      actorUserId: params.actorUserId,
      action: AuditAction.GUIDANCE_STATUS_CHANGED,
      entityType: "GuidancePlan",
      entityId: params.planId,
      metadata: { publicId: params.planPublicId, step: 9 },
    },
  });

  const advanced = await advanceGuidanceJourneyStep({
    organizationId: params.organizationId,
    actorUserId: params.actorUserId,
    studentId: params.studentId,
    stepId: 9,
  });
  if (!advanced.ok) return { ok: false, error: advanced.error };

  return { ok: true };
}
