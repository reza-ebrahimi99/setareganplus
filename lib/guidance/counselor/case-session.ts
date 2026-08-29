/**
 * Fix loadCounselorCase to always match planPublicId via metadata scan.
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
import type {
  CounselorActivityItem,
  CounselorCaseRecord,
  CounselorNote,
  CounselorReviewStatus,
} from "@/lib/guidance/counselor/types";
import { COUNSELOR_REVIEW_STATUSES } from "@/lib/guidance/counselor/types";

export const COUNSELOR_CASE_CATEGORY = "guidance-counselor-case";
export const COUNSELOR_CASE_KIND = "guidance-counselor-case";

type StoredPayload = {
  kind: typeof COUNSELOR_CASE_KIND;
  planId: string;
  planPublicId: string;
  reviewStatus: CounselorReviewStatus;
  notes: CounselorNote[];
  activity: CounselorActivityItem[];
  assigneeUserId: string | null;
  assigneeName: string | null;
  updatedAtIso: string;
};

function emptyCase(
  planId: string,
  planPublicId: string,
): CounselorCaseRecord {
  return {
    planId,
    planPublicId,
    reviewStatus: "awaiting_review",
    notes: [],
    activity: [],
    assigneeUserId: null,
    assigneeName: null,
    updatedAtIso: null,
    mediaAssetId: null,
  };
}

function isReviewStatus(value: unknown): value is CounselorReviewStatus {
  return (
    typeof value === "string" &&
    (COUNSELOR_REVIEW_STATUSES as readonly string[]).includes(value)
  );
}

function parsePayload(raw: unknown): StoredPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (obj.kind !== COUNSELOR_CASE_KIND) return null;
  if (typeof obj.planId !== "string" || typeof obj.planPublicId !== "string") {
    return null;
  }
  if (!isReviewStatus(obj.reviewStatus)) return null;
  return {
    kind: COUNSELOR_CASE_KIND,
    planId: obj.planId,
    planPublicId: obj.planPublicId,
    reviewStatus: obj.reviewStatus,
    notes: Array.isArray(obj.notes) ? (obj.notes as CounselorNote[]) : [],
    activity: Array.isArray(obj.activity)
      ? (obj.activity as CounselorActivityItem[])
      : [],
    assigneeUserId:
      typeof obj.assigneeUserId === "string" ? obj.assigneeUserId : null,
    assigneeName:
      typeof obj.assigneeName === "string" ? obj.assigneeName : null,
    updatedAtIso:
      typeof obj.updatedAtIso === "string"
        ? obj.updatedAtIso
        : new Date().toISOString(),
  };
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

export async function loadCounselorCase(params: {
  organizationId: string;
  planId: string;
  planPublicId: string;
}): Promise<CounselorCaseRecord> {
  const candidates = await prisma.mediaAsset.findMany({
    where: {
      organizationId: params.organizationId,
      category: COUNSELOR_CASE_CATEGORY,
      deletedAt: null,
      status: MediaAssetStatus.ACTIVE,
    },
    orderBy: { updatedAt: "desc" },
    take: 120,
    select: { id: true, storageKey: true, metadata: true },
  });

  for (const asset of candidates) {
    const meta = asset.metadata as Record<string, unknown> | null;
    if (meta?.planPublicId !== params.planPublicId) continue;
    const parsed =
      parsePayload(await readJsonFile(asset.storageKey)) ?? parsePayload(meta);
    if (parsed && parsed.planPublicId === params.planPublicId) {
      return { ...parsed, mediaAssetId: asset.id };
    }
  }

  return emptyCase(params.planId, params.planPublicId);
}

export async function saveCounselorCase(input: {
  organizationId: string;
  actorUserId: string;
  planId: string;
  planPublicId: string;
  reviewStatus: CounselorReviewStatus;
  notes: readonly CounselorNote[];
  activity: readonly CounselorActivityItem[];
  assigneeUserId: string | null;
  assigneeName: string | null;
}): Promise<CounselorCaseRecord> {
  const now = new Date().toISOString();
  const existing = await loadCounselorCase({
    organizationId: input.organizationId,
    planId: input.planId,
    planPublicId: input.planPublicId,
  });

  const payload: StoredPayload = {
    kind: COUNSELOR_CASE_KIND,
    planId: input.planId,
    planPublicId: input.planPublicId,
    reviewStatus: input.reviewStatus,
    notes: [...input.notes].slice(0, 100),
    activity: [...input.activity].slice(0, 200),
    assigneeUserId: input.assigneeUserId,
    assigneeName: input.assigneeName,
    updatedAtIso: now,
  };

  const body = Buffer.from(JSON.stringify(payload, null, 2), "utf8");
  const checksum = createHash("sha256").update(body).digest("hex");

  if (existing.mediaAssetId) {
    const current = await prisma.mediaAsset.findFirst({
      where: {
        id: existing.mediaAssetId,
        organizationId: input.organizationId,
        deletedAt: null,
      },
      select: { id: true, storageKey: true },
    });
    if (current) {
      await writeMediaFile({ storageKey: current.storageKey, data: body });
      await prisma.mediaAsset.update({
        where: { id: current.id },
        data: {
          byteSize: body.byteLength,
          checksum,
          mimeType: "application/json",
          originalName: `counselor-case-${input.planPublicId}.json`,
          metadata: payload as object,
          updatedAt: new Date(),
        },
      });
      return { ...payload, mediaAssetId: current.id };
    }
  }

  const storageKey = generatePrivateGuidanceUploadStorageKey("json");
  await writeMediaFile({ storageKey, data: body });
  const created = await prisma.mediaAsset.create({
    data: {
      organizationId: input.organizationId,
      storageKey,
      originalName: `counselor-case-${input.planPublicId}.json`,
      mimeType: "application/json",
      byteSize: body.byteLength,
      checksum,
      status: MediaAssetStatus.ACTIVE,
      category: COUNSELOR_CASE_CATEGORY,
      createdByUserId: input.actorUserId,
      metadata: payload as object,
    },
    select: { id: true },
  });

  return { ...payload, mediaAssetId: created.id };
}
