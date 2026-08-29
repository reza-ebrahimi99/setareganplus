/**
 * Student 360° Profile session — private MediaAsset JSON.
 * Does NOT touch GuidancePlan schema.
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
  StudentProfileChangeItem,
  StudentProfileData,
  StudentProfileSectionId,
  StudentProfileSessionRecord,
  StudentProfileSessionStatus,
} from "@/lib/guidance/profile360/types";
import { STUDENT_PROFILE_SECTION_IDS } from "@/lib/guidance/profile360/types";

export const PROFILE360_SESSION_CATEGORY = "guidance-profile360-session";
export const PROFILE360_SESSION_KIND = "guidance-profile360-session";

type StoredPayload = {
  kind: typeof PROFILE360_SESSION_KIND;
  planId: string;
  planPublicId: string;
  status: StudentProfileSessionStatus;
  data: StudentProfileData;
  recentChanges: StudentProfileChangeItem[];
  startedAtIso: string | null;
  updatedAtIso: string;
  completedAtIso: string | null;
};

function emptySession(
  planId: string,
  planPublicId: string,
): StudentProfileSessionRecord {
  return {
    planId,
    planPublicId,
    status: "not_started",
    data: {},
    recentChanges: [],
    startedAtIso: null,
    updatedAtIso: null,
    completedAtIso: null,
    mediaAssetId: null,
  };
}

function isSectionId(value: unknown): value is StudentProfileSectionId {
  return (
    typeof value === "string" &&
    (STUDENT_PROFILE_SECTION_IDS as readonly string[]).includes(value)
  );
}

function parsePayload(raw: unknown): StoredPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (obj.kind !== PROFILE360_SESSION_KIND) return null;
  if (typeof obj.planId !== "string" || typeof obj.planPublicId !== "string") {
    return null;
  }
  const status = obj.status;
  if (
    status !== "not_started" &&
    status !== "in_progress" &&
    status !== "completed"
  ) {
    return null;
  }
  const data =
    obj.data && typeof obj.data === "object"
      ? (obj.data as StudentProfileData)
      : {};
  const recentChanges = Array.isArray(obj.recentChanges)
    ? (obj.recentChanges as StudentProfileChangeItem[]).filter(
        (c) => c && isSectionId(c.sectionId),
      )
    : [];

  return {
    kind: PROFILE360_SESSION_KIND,
    planId: obj.planId,
    planPublicId: obj.planPublicId,
    status,
    data,
    recentChanges,
    startedAtIso:
      typeof obj.startedAtIso === "string" ? obj.startedAtIso : null,
    updatedAtIso:
      typeof obj.updatedAtIso === "string"
        ? obj.updatedAtIso
        : new Date().toISOString(),
    completedAtIso:
      typeof obj.completedAtIso === "string" ? obj.completedAtIso : null,
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

export async function loadGuidanceProfile360Session(params: {
  organizationId: string;
  userId: string;
  planId: string;
  planPublicId: string;
}): Promise<StudentProfileSessionRecord> {
  const asset = await prisma.mediaAsset.findFirst({
    where: {
      organizationId: params.organizationId,
      createdByUserId: params.userId,
      category: PROFILE360_SESSION_CATEGORY,
      deletedAt: null,
      status: MediaAssetStatus.ACTIVE,
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true, storageKey: true, metadata: true },
  });

  if (!asset) {
    return emptySession(params.planId, params.planPublicId);
  }

  const meta = asset.metadata as Record<string, unknown> | null;
  if (
    meta &&
    typeof meta.planPublicId === "string" &&
    meta.planPublicId !== params.planPublicId
  ) {
    return emptySession(params.planId, params.planPublicId);
  }

  const fileJson = await readJsonFile(asset.storageKey);
  const payload = parsePayload(fileJson) ?? parsePayload(meta);
  if (!payload || payload.planPublicId !== params.planPublicId) {
    return emptySession(params.planId, params.planPublicId);
  }

  return {
    planId: payload.planId,
    planPublicId: payload.planPublicId,
    status: payload.status,
    data: payload.data,
    recentChanges: payload.recentChanges,
    startedAtIso: payload.startedAtIso,
    updatedAtIso: payload.updatedAtIso,
    completedAtIso: payload.completedAtIso,
    mediaAssetId: asset.id,
  };
}

export type SaveProfile360Input = {
  organizationId: string;
  userId: string;
  planId: string;
  planPublicId: string;
  status: StudentProfileSessionStatus;
  data: StudentProfileData;
  recentChanges: readonly StudentProfileChangeItem[];
  startedAtIso?: string | null;
  completedAtIso?: string | null;
};

export async function saveGuidanceProfile360Session(
  input: SaveProfile360Input,
): Promise<StudentProfileSessionRecord> {
  const now = new Date().toISOString();
  const existing = await loadGuidanceProfile360Session({
    organizationId: input.organizationId,
    userId: input.userId,
    planId: input.planId,
    planPublicId: input.planPublicId,
  });

  const payload: StoredPayload = {
    kind: PROFILE360_SESSION_KIND,
    planId: input.planId,
    planPublicId: input.planPublicId,
    status: input.status,
    data: input.data,
    recentChanges: [...input.recentChanges].slice(0, 12),
    startedAtIso:
      input.startedAtIso ??
      existing.startedAtIso ??
      (input.status === "not_started" ? null : now),
    updatedAtIso: now,
    completedAtIso:
      input.completedAtIso ??
      (input.status === "completed" ? existing.completedAtIso ?? now : null),
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
          originalName: `profile360-${input.planPublicId}.json`,
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
      originalName: `profile360-${input.planPublicId}.json`,
      mimeType: "application/json",
      byteSize: body.byteLength,
      checksum,
      status: MediaAssetStatus.ACTIVE,
      category: PROFILE360_SESSION_CATEGORY,
      createdByUserId: input.userId,
      metadata: payload as object,
    },
    select: { id: true },
  });

  return { ...payload, mediaAssetId: created.id };
}
