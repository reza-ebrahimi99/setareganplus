/**
 * Batch-load Guidance V2 step JSON payloads for export (single MediaAsset query + file reads).
 */

import { promises as fs } from "node:fs";
import { MediaAssetStatus } from "@/generated/prisma/enums";
import { ONBOARDING_SESSION_CATEGORY, ONBOARDING_SESSION_KIND } from "@/lib/guidance/onboarding";
import { KONKUR_CATEGORY, KONKUR_KIND } from "@/lib/guidance/journey-v2/constants";
import { absolutePathForStorageKey } from "@/lib/media/storage";
import { prisma } from "@/lib/prisma";

export type StepPayloadSlot = {
  data: unknown;
  updatedAtIso: string | null;
};

export type PlanStepPayloads = {
  step1: StepPayloadSlot | null;
  step2: StepPayloadSlot | null;
  holland: StepPayloadSlot | null;
  step6: StepPayloadSlot | null;
  step7: StepPayloadSlot | null;
  step8: StepPayloadSlot | null;
  step9: StepPayloadSlot | null;
  konkur: StepPayloadSlot | null;
  onboarding: StepPayloadSlot | null;
};

const CATEGORY_KIND: Array<{ category: string; kind: string; slot: keyof PlanStepPayloads }> = [
  { category: "guidance-journey-v2-step1", kind: "guidance-journey-v2-step1", slot: "step1" },
  { category: "guidance-journey-v2-step2", kind: "guidance-journey-v2-step2", slot: "step2" },
  { category: "guidance-journey-v2-holland", kind: "guidance-journey-v2-holland", slot: "holland" },
  { category: "guidance-journey-step6", kind: "guidance-journey-step6", slot: "step6" },
  { category: "guidance-journey-step7", kind: "guidance-journey-step7", slot: "step7" },
  { category: "guidance-journey-step8", kind: "guidance-journey-step8", slot: "step8" },
  { category: "guidance-journey-step9", kind: "guidance-journey-step9", slot: "step9" },
  { category: KONKUR_CATEGORY, kind: KONKUR_KIND, slot: "konkur" },
  { category: ONBOARDING_SESSION_CATEGORY, kind: ONBOARDING_SESSION_KIND, slot: "onboarding" },
];

const CATEGORY_SET = CATEGORY_KIND.map((c) => c.category);

function emptyPlanPayloads(): PlanStepPayloads {
  return {
    step1: null,
    step2: null,
    holland: null,
    step6: null,
    step7: null,
    step8: null,
    step9: null,
    konkur: null,
    onboarding: null,
  };
}

function isEnvelope(raw: unknown, kind: string): raw is {
  kind: string;
  planPublicId: string;
  updatedAtIso?: string;
  data: unknown;
  profile?: unknown;
} {
  if (!raw || typeof raw !== "object") return false;
  const obj = raw as Record<string, unknown>;
  return obj.kind === kind && typeof obj.planPublicId === "string";
}

async function readJsonFile(storageKey: string): Promise<unknown | null> {
  try {
    const absolute = absolutePathForStorageKey(storageKey);
    const buf = await fs.readFile(absolute);
    return JSON.parse(buf.toString("utf8")) as unknown;
  } catch {
    return null;
  }
}

type AssetPick = {
  storageKey: string;
  updatedAt: Date;
  metadata: unknown;
};

export async function batchLoadPlanStepPayloads(params: {
  organizationId: string;
  planPublicIds: string[];
}): Promise<Map<string, PlanStepPayloads>> {
  const out = new Map<string, PlanStepPayloads>();
  if (params.planPublicIds.length === 0) return out;

  const publicIdSet = new Set(params.planPublicIds);
  for (const id of publicIdSet) {
    out.set(id, emptyPlanPayloads());
  }

  const assets = await prisma.mediaAsset.findMany({
    where: {
      organizationId: params.organizationId,
      category: { in: [...CATEGORY_SET] },
      deletedAt: null,
      status: MediaAssetStatus.ACTIVE,
    },
    select: {
      category: true,
      storageKey: true,
      updatedAt: true,
      metadata: true,
    },
  });

  const bestByPlanCategory = new Map<string, AssetPick>();

  for (const asset of assets) {
    const meta = asset.metadata as Record<string, unknown> | null;
    const planPublicId =
      typeof meta?.planPublicId === "string"
        ? meta.planPublicId
        : typeof meta?.planId === "string"
          ? null
          : null;
    if (!planPublicId || !publicIdSet.has(planPublicId)) continue;

    const key = `${planPublicId}::${asset.category}`;
    const prev = bestByPlanCategory.get(key);
    if (!prev || asset.updatedAt > prev.updatedAt) {
      bestByPlanCategory.set(key, {
        storageKey: asset.storageKey,
        updatedAt: asset.updatedAt,
        metadata: asset.metadata,
      });
    }
  }

  const reads: Array<{
    planPublicId: string;
    slot: keyof PlanStepPayloads;
    kind: string;
    asset: AssetPick;
  }> = [];

  for (const def of CATEGORY_KIND) {
    for (const planPublicId of publicIdSet) {
      const asset = bestByPlanCategory.get(`${planPublicId}::${def.category}`);
      if (asset) {
        reads.push({ planPublicId, slot: def.slot, kind: def.kind, asset });
      }
    }
  }

  const CHUNK = 40;
  for (let i = 0; i < reads.length; i += CHUNK) {
    const chunk = reads.slice(i, i + CHUNK);
    await Promise.all(
      chunk.map(async (entry) => {
        const fileJson = await readJsonFile(entry.asset.storageKey);
        const meta = entry.asset.metadata as Record<string, unknown> | null;
        const raw = isEnvelope(fileJson, entry.kind)
          ? fileJson
          : isEnvelope(meta, entry.kind)
            ? meta
            : null;
        if (!raw) return;

        const payloads = out.get(entry.planPublicId)!;
        const data =
          entry.slot === "onboarding"
            ? { profile: raw.profile, draft: (raw as { draft?: unknown }).draft }
            : raw.data;
        payloads[entry.slot] = {
          data,
          updatedAtIso:
            typeof raw.updatedAtIso === "string"
              ? raw.updatedAtIso
              : entry.asset.updatedAt.toISOString(),
        };
      }),
    );
  }

  return out;
}

/** Load Holland attempt answer/result JSON from linked media assets (no raw question dump in export). */
export async function batchLoadHollandAttemptPayloads(
  mediaAssetIds: string[],
): Promise<Map<string, unknown>> {
  const unique = [...new Set(mediaAssetIds.filter(Boolean))];
  const out = new Map<string, unknown>();
  if (unique.length === 0) return out;

  const assets = await prisma.mediaAsset.findMany({
    where: { id: { in: unique }, deletedAt: null },
    select: { id: true, storageKey: true, metadata: true },
  });

  await Promise.all(
    assets.map(async (asset) => {
      const fileJson = await readJsonFile(asset.storageKey);
      out.set(asset.id, fileJson ?? asset.metadata ?? null);
    }),
  );

  return out;
}
