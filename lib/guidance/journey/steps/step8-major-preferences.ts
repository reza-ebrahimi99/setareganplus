/**
 * Guidance Journey Engine — Step 8: Major Preferences (Phase 1).
 * Majors are scoped strictly to the plan's exam group (never all majors).
 */

import { AuditAction } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { advanceGuidanceJourneyStep } from "@/lib/guidance/journey/advance";
import {
  loadGuidanceStepData,
  saveGuidanceStepData,
} from "@/lib/guidance/journey/step-store";
import { getMajorsForExamGroup } from "@/lib/guidance/journey/reference-data/majors";
import type { GuidanceExamGroup } from "@/lib/guidance/types";

export const STEP8_CATEGORY = "guidance-journey-step8";
export const STEP8_KIND = "guidance-journey-step8";

export type MajorPreferenceItem = {
  code: string;
  enabled: boolean;
  favorite: boolean;
  rank: number;
};

export type Step8Data = {
  items: MajorPreferenceItem[];
};

function defaultStep8Data(examGroup: GuidanceExamGroup): Step8Data {
  const majors = getMajorsForExamGroup(examGroup);
  return {
    items: majors.map((major, index) => ({
      code: major.code,
      enabled: false,
      favorite: false,
      rank: index + 1,
    })),
  };
}

function validateStoredData(
  raw: unknown,
  validCodes: ReadonlySet<string>,
): Step8Data | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.items)) return null;
  const items: MajorPreferenceItem[] = [];
  for (const entry of obj.items) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    if (typeof e.code !== "string" || !validCodes.has(e.code)) continue;
    items.push({
      code: e.code,
      enabled: Boolean(e.enabled),
      favorite: Boolean(e.favorite),
      rank: typeof e.rank === "number" ? e.rank : items.length + 1,
    });
  }
  return items.length > 0 ? { items } : null;
}

export async function loadStep8Data(params: {
  organizationId: string;
  planPublicId: string;
  examGroup: GuidanceExamGroup;
}): Promise<Step8Data> {
  const majors = getMajorsForExamGroup(params.examGroup);
  const validCodes = new Set(majors.map((m) => m.code));

  const stored = await loadGuidanceStepData<Step8Data>({
    organizationId: params.organizationId,
    category: STEP8_CATEGORY,
    kind: STEP8_KIND,
    planPublicId: params.planPublicId,
    validate: (raw) => validateStoredData(raw, validCodes),
  });

  return stored.data ?? defaultStep8Data(params.examGroup);
}

export type CompleteStep8Result = { ok: true } | { ok: false; error: string };

export async function completeGuidanceStep8(params: {
  organizationId: string;
  actorUserId: string;
  studentId: string;
  planId: string;
  planPublicId: string;
  examGroup: GuidanceExamGroup;
  items: MajorPreferenceItem[];
}): Promise<CompleteStep8Result> {
  const validCodes = new Set(
    getMajorsForExamGroup(params.examGroup).map((m) => m.code),
  );
  const filtered = params.items.filter((item) => validCodes.has(item.code));
  const enabled = filtered.filter((item) => item.enabled);
  if (enabled.length === 0) {
    return { ok: false, error: "حداقل یک رشته را فعال کن." };
  }

  await saveGuidanceStepData<Step8Data>({
    organizationId: params.organizationId,
    actorUserId: params.actorUserId,
    category: STEP8_CATEGORY,
    kind: STEP8_KIND,
    planId: params.planId,
    planPublicId: params.planPublicId,
    data: { items: filtered },
    filenamePrefix: "guidance-step8",
  });

  await prisma.auditLog.create({
    data: {
      organizationId: params.organizationId,
      actorUserId: params.actorUserId,
      action: AuditAction.GUIDANCE_STATUS_CHANGED,
      entityType: "GuidancePlan",
      entityId: params.planId,
      metadata: { publicId: params.planPublicId, step: 8, enabledCount: enabled.length },
    },
  });

  const advanced = await advanceGuidanceJourneyStep({
    organizationId: params.organizationId,
    actorUserId: params.actorUserId,
    studentId: params.studentId,
    stepId: 8,
  });
  if (!advanced.ok) return { ok: false, error: advanced.error };

  return { ok: true };
}
