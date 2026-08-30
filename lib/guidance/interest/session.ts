/**
 * Interest session persistence via private MediaAsset JSON.
 * Does NOT touch GuidancePlan schema. Reuses media storage primitives.
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
  InterestAnswersMap,
  InterestSectionId,
  InterestSessionRecord,
  InterestSessionStatus,
} from "@/lib/guidance/interest/types";
import { INTEREST_SECTION_IDS } from "@/lib/guidance/interest/types";

export const INTEREST_SESSION_CATEGORY = "guidance-interest-session";
export const INTEREST_SESSION_KIND = "guidance-interest-session";

type StoredPayload = {
  kind: typeof INTEREST_SESSION_KIND;
  planId: string;
  planPublicId: string;
  status: InterestSessionStatus;
  currentSectionId: InterestSectionId;
  currentQuestionId: string | null;
  answers: InterestAnswersMap;
  startedAtIso: string | null;
  updatedAtIso: string;
  completedAtIso: string | null;
};

function emptySession(
  planId: string,
  planPublicId: string,
): InterestSessionRecord {
  return {
    planId,
    planPublicId,
    status: "not_started",
    currentSectionId: "introduction",
    currentQuestionId: null,
    answers: {},
    startedAtIso: null,
    updatedAtIso: null,
    completedAtIso: null,
    mediaAssetId: null,
  };
}

function isSectionId(value: unknown): value is InterestSectionId {
  return (
    typeof value === "string" &&
    (INTEREST_SECTION_IDS as readonly string[]).includes(value)
  );
}

function parsePayload(raw: unknown): StoredPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (obj.kind !== INTEREST_SESSION_KIND) return null;
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
  if (!isSectionId(obj.currentSectionId)) return null;
  const answers =
    obj.answers && typeof obj.answers === "object"
      ? (obj.answers as InterestAnswersMap)
      : {};
  return {
    kind: INTEREST_SESSION_KIND,
    planId: obj.planId,
    planPublicId: obj.planPublicId,
    status,
    currentSectionId: obj.currentSectionId,
    currentQuestionId:
      typeof obj.currentQuestionId === "string" ? obj.currentQuestionId : null,
    answers,
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

export async function loadGuidanceInterestSession(params: {
  organizationId: string;
  userId: string;
  planId: string;
  planPublicId: string;
}): Promise<InterestSessionRecord> {
  const asset = await prisma.mediaAsset.findFirst({
    where: {
      organizationId: params.organizationId,
      createdByUserId: params.userId,
      category: INTEREST_SESSION_CATEGORY,
      deletedAt: null,
      status: MediaAssetStatus.ACTIVE,
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      storageKey: true,
      metadata: true,
    },
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
    currentSectionId: payload.currentSectionId,
    currentQuestionId: payload.currentQuestionId,
    answers: payload.answers,
    startedAtIso: payload.startedAtIso,
    updatedAtIso: payload.updatedAtIso,
    completedAtIso: payload.completedAtIso,
    mediaAssetId: asset.id,
  };
}

export type SaveInterestSessionInput = {
  organizationId: string;
  userId: string;
  planId: string;
  planPublicId: string;
  status: InterestSessionStatus;
  currentSectionId: InterestSectionId;
  currentQuestionId: string | null;
  answers: InterestAnswersMap;
  startedAtIso?: string | null;
  completedAtIso?: string | null;
};

export async function saveGuidanceInterestSession(
  input: SaveInterestSessionInput,
): Promise<InterestSessionRecord> {
  const now = new Date().toISOString();
  const existing = await loadGuidanceInterestSession({
    organizationId: input.organizationId,
    userId: input.userId,
    planId: input.planId,
    planPublicId: input.planPublicId,
  });

  const payload: StoredPayload = {
    kind: INTEREST_SESSION_KIND,
    planId: input.planId,
    planPublicId: input.planPublicId,
    status: input.status,
    currentSectionId: input.currentSectionId,
    currentQuestionId: input.currentQuestionId,
    answers: input.answers,
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
          originalName: `interest-session-${input.planPublicId}.json`,
          metadata: payload as object,
          updatedAt: new Date(),
        },
      });
      return {
        ...payload,
        mediaAssetId: current.id,
      };
    }
  }

  const storageKey = generatePrivateGuidanceUploadStorageKey("json");
  await writeMediaFile({ storageKey, data: body });
  const created = await prisma.mediaAsset.create({
    data: {
      organizationId: input.organizationId,
      storageKey,
      originalName: `interest-session-${input.planPublicId}.json`,
      mimeType: "application/json",
      byteSize: body.byteLength,
      checksum,
      status: MediaAssetStatus.ACTIVE,
      category: INTEREST_SESSION_CATEGORY,
      createdByUserId: input.userId,
      metadata: payload as object,
    },
    select: { id: true },
  });

  return {
    ...payload,
    mediaAssetId: created.id,
  };
}
