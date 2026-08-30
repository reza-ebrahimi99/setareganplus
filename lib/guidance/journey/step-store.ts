/**
 * Guidance Journey Engine — generic per-step JSON data store (Phase 1).
 *
 * Follows the exact pattern already used by lib/guidance/interest/session.ts
 * and lib/guidance/counselor/case-session.ts: a private MediaAsset row holds
 * a JSON snapshot, keyed by (category, planPublicId). This intentionally
 * avoids adding a bespoke Prisma table per step — GuidancePlan already
 * carries the authoritative progress columns (currentStep/completedSteps/
 * completionPercentage); step *payloads* (education preferences, exam
 * numbers, AI export, etc.) are architecture-flexible and do not need
 * first-class relational rows yet.
 */

import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import { MediaAssetStatus } from "@/generated/prisma/enums";
import {
  absolutePathForStorageKey,
  generatePrivateGuidanceUploadStorageKey,
  writeMediaFile,
} from "@/lib/media/storage";
import { prisma } from "@/lib/prisma";

type StoredEnvelope<T> = {
  kind: string;
  planId: string;
  planPublicId: string;
  updatedAtIso: string;
  data: T;
};

async function readJsonFile(storageKey: string): Promise<unknown | null> {
  try {
    const absolute = absolutePathForStorageKey(storageKey);
    const buf = await fs.readFile(absolute);
    return JSON.parse(buf.toString("utf8")) as unknown;
  } catch {
    return null;
  }
}

function isEnvelope(raw: unknown, kind: string): raw is StoredEnvelope<unknown> {
  if (!raw || typeof raw !== "object") return false;
  const obj = raw as Record<string, unknown>;
  return (
    obj.kind === kind &&
    typeof obj.planId === "string" &&
    typeof obj.planPublicId === "string"
  );
}

/**
 * Loads the latest JSON payload stored for (category, planPublicId).
 * `validate` should return the parsed value or null when the shape is stale/invalid.
 */
export async function loadGuidanceStepData<T>(params: {
  organizationId: string;
  category: string;
  kind: string;
  planPublicId: string;
  validate: (data: unknown) => T | null;
}): Promise<{ data: T | null; mediaAssetId: string | null; updatedAtIso: string | null }> {
  const candidates = await prisma.mediaAsset.findMany({
    where: {
      organizationId: params.organizationId,
      category: params.category,
      deletedAt: null,
      status: MediaAssetStatus.ACTIVE,
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: { id: true, storageKey: true, metadata: true },
  });

  for (const asset of candidates) {
    const meta = asset.metadata as Record<string, unknown> | null;
    if (meta?.planPublicId !== params.planPublicId) continue;

    const fileJson = await readJsonFile(asset.storageKey);
    const raw = isEnvelope(fileJson, params.kind) ? fileJson : isEnvelope(meta, params.kind) ? meta : null;
    if (!raw) continue;

    const data = params.validate(raw.data);
    if (data === null) continue;

    return {
      data,
      mediaAssetId: asset.id,
      updatedAtIso: raw.updatedAtIso,
    };
  }

  return { data: null, mediaAssetId: null, updatedAtIso: null };
}

/** Creates or overwrites the JSON payload stored for (category, planPublicId). */
export async function saveGuidanceStepData<T>(params: {
  organizationId: string;
  actorUserId: string;
  category: string;
  kind: string;
  planId: string;
  planPublicId: string;
  data: T;
  filenamePrefix: string;
}): Promise<{ mediaAssetId: string; updatedAtIso: string }> {
  const now = new Date().toISOString();
  const payload: StoredEnvelope<T> = {
    kind: params.kind,
    planId: params.planId,
    planPublicId: params.planPublicId,
    updatedAtIso: now,
    data: params.data,
  };

  const body = Buffer.from(JSON.stringify(payload, null, 2), "utf8");
  const checksum = createHash("sha256").update(body).digest("hex");

  const existing = await prisma.mediaAsset.findFirst({
    where: {
      organizationId: params.organizationId,
      category: params.category,
      deletedAt: null,
      status: MediaAssetStatus.ACTIVE,
    },
    select: { id: true, storageKey: true, metadata: true },
  });

  const existingForPlan =
    existing &&
    (existing.metadata as Record<string, unknown> | null)?.planPublicId ===
      params.planPublicId
      ? existing
      : await (async () => {
          const rows = await prisma.mediaAsset.findMany({
            where: {
              organizationId: params.organizationId,
              category: params.category,
              deletedAt: null,
              status: MediaAssetStatus.ACTIVE,
            },
            orderBy: { updatedAt: "desc" },
            take: 50,
            select: { id: true, storageKey: true, metadata: true },
          });
          return (
            rows.find(
              (row) =>
                (row.metadata as Record<string, unknown> | null)
                  ?.planPublicId === params.planPublicId,
            ) ?? null
          );
        })();

  if (existingForPlan) {
    await writeMediaFile({ storageKey: existingForPlan.storageKey, data: body });
    await prisma.mediaAsset.update({
      where: { id: existingForPlan.id },
      data: {
        byteSize: body.byteLength,
        checksum,
        mimeType: "application/json",
        originalName: `${params.filenamePrefix}-${params.planPublicId}.json`,
        metadata: payload as object,
        updatedAt: new Date(),
      },
    });
    return { mediaAssetId: existingForPlan.id, updatedAtIso: now };
  }

  const storageKey = generatePrivateGuidanceUploadStorageKey("json");
  await writeMediaFile({ storageKey, data: body });
  const created = await prisma.mediaAsset.create({
    data: {
      organizationId: params.organizationId,
      storageKey,
      originalName: `${params.filenamePrefix}-${params.planPublicId}.json`,
      mimeType: "application/json",
      byteSize: body.byteLength,
      checksum,
      status: MediaAssetStatus.ACTIVE,
      category: params.category,
      createdByUserId: params.actorUserId,
      metadata: payload as object,
    },
    select: { id: true },
  });

  return { mediaAssetId: created.id, updatedAtIso: now };
}
