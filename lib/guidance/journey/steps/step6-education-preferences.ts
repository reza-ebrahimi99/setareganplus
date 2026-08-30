/**
 * Guidance Journey Engine — Step 6: Education Type Preferences (Phase 1).
 */

import { AuditAction } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { advanceGuidanceJourneyStep } from "@/lib/guidance/journey/advance";
import {
  loadGuidanceStepData,
  saveGuidanceStepData,
} from "@/lib/guidance/journey/step-store";
import {
  GUIDANCE_EDUCATION_TYPES,
  isGuidanceEducationTypeCode,
} from "@/lib/guidance/journey/reference-data/education-types";

export const STEP6_CATEGORY = "guidance-journey-step6";
export const STEP6_KIND = "guidance-journey-step6";

export type EducationPreferenceItem = {
  code: string;
  enabled: boolean;
  rank: number;
};

export type Step6Data = {
  items: EducationPreferenceItem[];
};

function defaultStep6Data(): Step6Data {
  return {
    items: GUIDANCE_EDUCATION_TYPES.map((type, index) => ({
      code: type.code,
      enabled: index === 0,
      rank: index + 1,
    })),
  };
}

function validateStoredData(raw: unknown): Step6Data | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.items)) return null;
  const items: EducationPreferenceItem[] = [];
  for (const entry of obj.items) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    if (typeof e.code !== "string" || !isGuidanceEducationTypeCode(e.code)) continue;
    items.push({
      code: e.code,
      enabled: Boolean(e.enabled),
      rank: typeof e.rank === "number" ? e.rank : items.length + 1,
    });
  }
  return items.length > 0 ? { items } : null;
}

export async function loadStep6Data(params: {
  organizationId: string;
  planPublicId: string;
}): Promise<Step6Data> {
  const stored = await loadGuidanceStepData<Step6Data>({
    organizationId: params.organizationId,
    category: STEP6_CATEGORY,
    kind: STEP6_KIND,
    planPublicId: params.planPublicId,
    validate: validateStoredData,
  });
  return stored.data ?? defaultStep6Data();
}

export type CompleteStep6Result = { ok: true } | { ok: false; error: string };

export async function completeGuidanceStep6(params: {
  organizationId: string;
  actorUserId: string;
  studentId: string;
  planId: string;
  planPublicId: string;
  items: EducationPreferenceItem[];
}): Promise<CompleteStep6Result> {
  const enabledCount = params.items.filter((item) => item.enabled).length;
  if (enabledCount === 0) {
    return { ok: false, error: "حداقل یک نوع دوره را انتخاب کن." };
  }

  await saveGuidanceStepData<Step6Data>({
    organizationId: params.organizationId,
    actorUserId: params.actorUserId,
    category: STEP6_CATEGORY,
    kind: STEP6_KIND,
    planId: params.planId,
    planPublicId: params.planPublicId,
    data: { items: params.items },
    filenamePrefix: "guidance-step6",
  });

  await prisma.auditLog.create({
    data: {
      organizationId: params.organizationId,
      actorUserId: params.actorUserId,
      action: AuditAction.GUIDANCE_STATUS_CHANGED,
      entityType: "GuidancePlan",
      entityId: params.planId,
      metadata: { publicId: params.planPublicId, step: 6, enabledCount },
    },
  });

  const advanced = await advanceGuidanceJourneyStep({
    organizationId: params.organizationId,
    actorUserId: params.actorUserId,
    studentId: params.studentId,
    stepId: 6,
  });
  if (!advanced.ok) return { ok: false, error: advanced.error };

  return { ok: true };
}
