/**
 * Guidance Journey Engine — Step 7: City / Geographic Preferences (Phase 1).
 */

import { AuditAction } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { advanceGuidanceJourneyStep } from "@/lib/guidance/journey/advance";
import {
  loadGuidanceStepData,
  saveGuidanceStepData,
} from "@/lib/guidance/journey/step-store";
import {
  getCitiesForProvince,
  isValidGuidanceProvince,
} from "@/lib/guidance/journey/reference-data/cities";

export const STEP7_CATEGORY = "guidance-journey-step7";
export const STEP7_KIND = "guidance-journey-step7";

export type ProvincePreferenceItem = {
  province: string;
  enabled: boolean;
  rank: number;
  cities: string[];
};

export type Step7Data = {
  items: ProvincePreferenceItem[];
};

function validateStoredData(raw: unknown): Step7Data | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.items)) return null;
  const items: ProvincePreferenceItem[] = [];
  for (const entry of obj.items) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    if (typeof e.province !== "string" || !isValidGuidanceProvince(e.province)) continue;
    const cities = Array.isArray(e.cities)
      ? e.cities.filter((c): c is string => typeof c === "string")
      : [];
    items.push({
      province: e.province,
      enabled: Boolean(e.enabled),
      rank: typeof e.rank === "number" ? e.rank : items.length + 1,
      cities,
    });
  }
  return items.length > 0 ? { items } : null;
}

export async function loadStep7Data(params: {
  organizationId: string;
  planPublicId: string;
  homeProvince: string | null;
}): Promise<Step7Data> {
  const stored = await loadGuidanceStepData<Step7Data>({
    organizationId: params.organizationId,
    category: STEP7_CATEGORY,
    kind: STEP7_KIND,
    planPublicId: params.planPublicId,
    validate: validateStoredData,
  });
  if (stored.data) return stored.data;

  if (params.homeProvince && isValidGuidanceProvince(params.homeProvince)) {
    return {
      items: [
        {
          province: params.homeProvince,
          enabled: true,
          rank: 1,
          cities: [...getCitiesForProvince(params.homeProvince)],
        },
      ],
    };
  }

  return { items: [] };
}

export type CompleteStep7Result = { ok: true } | { ok: false; error: string };

export async function completeGuidanceStep7(params: {
  organizationId: string;
  actorUserId: string;
  studentId: string;
  planId: string;
  planPublicId: string;
  items: ProvincePreferenceItem[];
}): Promise<CompleteStep7Result> {
  const enabled = params.items.filter((item) => item.enabled);
  if (enabled.length === 0) {
    return { ok: false, error: "حداقل یک استان را فعال کن." };
  }
  if (enabled.some((item) => item.cities.length === 0)) {
    return { ok: false, error: "برای هر استان فعال، حداقل یک شهر انتخاب کن." };
  }

  await saveGuidanceStepData<Step7Data>({
    organizationId: params.organizationId,
    actorUserId: params.actorUserId,
    category: STEP7_CATEGORY,
    kind: STEP7_KIND,
    planId: params.planId,
    planPublicId: params.planPublicId,
    data: { items: params.items },
    filenamePrefix: "guidance-step7",
  });

  await prisma.auditLog.create({
    data: {
      organizationId: params.organizationId,
      actorUserId: params.actorUserId,
      action: AuditAction.GUIDANCE_STATUS_CHANGED,
      entityType: "GuidancePlan",
      entityId: params.planId,
      metadata: { publicId: params.planPublicId, step: 7, enabledCount: enabled.length },
    },
  });

  const advanced = await advanceGuidanceJourneyStep({
    organizationId: params.organizationId,
    actorUserId: params.actorUserId,
    studentId: params.studentId,
    stepId: 7,
  });
  if (!advanced.ok) return { ok: false, error: advanced.error };

  return { ok: true };
}
