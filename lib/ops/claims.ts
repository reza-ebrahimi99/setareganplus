/**
 * OpsQueueClaim — claim / heartbeat / release / TTL expiration (Sprint 6.6 hardened).
 */

import {
  OpsEntityType,
  OpsQueueId,
} from "@/generated/prisma/enums";
import {
  DEFAULT_CLAIM_TTL_MS,
  MAX_CLAIM_TTL_MS,
  MIN_CLAIM_TTL_MS,
} from "@/lib/ops/types";
import type {
  OpsEntityType as OpsEntityTypeValue,
  OpsQueueId as OpsQueueIdValue,
} from "@/lib/ops/types";
import { prisma } from "@/lib/prisma";

function toEnumQueue(queueId: OpsQueueIdValue): OpsQueueId {
  return OpsQueueId[queueId];
}

function toEnumEntity(entityType: OpsEntityTypeValue): OpsEntityType {
  return OpsEntityType[entityType];
}

export function clampClaimTtlMs(raw?: number): number {
  if (raw === undefined || !Number.isFinite(raw)) return DEFAULT_CLAIM_TTL_MS;
  return Math.min(MAX_CLAIM_TTL_MS, Math.max(MIN_CLAIM_TTL_MS, Math.trunc(raw)));
}

export async function expireStaleClaims(
  organizationId: string,
): Promise<number> {
  const now = new Date();
  const result = await prisma.opsQueueClaim.updateMany({
    where: {
      organizationId,
      releasedAt: null,
      expiresAt: { lt: now },
    },
    data: { releasedAt: now },
  });
  return result.count;
}

export async function claimQueueItem(params: {
  organizationId: string;
  queueId: OpsQueueIdValue;
  entityType: OpsEntityTypeValue;
  entityId: string;
  claimedByUserId: string;
  ttlMs?: number;
}): Promise<
  | { ok: true; claimId: string; expiresAt: Date }
  | { ok: false; error: string; code: "ALREADY_CLAIMED" | "ERROR" }
> {
  await expireStaleClaims(params.organizationId);
  const ttl = clampClaimTtlMs(params.ttlMs);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttl);
  const queueId = toEnumQueue(params.queueId);
  const entityType = toEnumEntity(params.entityType);

  const existing = await prisma.opsQueueClaim.findUnique({
    where: {
      organizationId_queueId_entityType_entityId: {
        organizationId: params.organizationId,
        queueId,
        entityType,
        entityId: params.entityId,
      },
    },
  });

  if (
    existing &&
    !existing.releasedAt &&
    existing.expiresAt.getTime() > now.getTime()
  ) {
    if (existing.claimedByUserId === params.claimedByUserId) {
      const refreshed = await prisma.opsQueueClaim.updateMany({
        where: {
          id: existing.id,
          claimedByUserId: params.claimedByUserId,
          releasedAt: null,
          expiresAt: { gt: now },
        },
        data: { heartbeatAt: now, expiresAt },
      });
      if (refreshed.count !== 1) {
        return {
          ok: false,
          error: "این مورد توسط کاربر دیگری قفل شده است.",
          code: "ALREADY_CLAIMED",
        };
      }
      return { ok: true, claimId: existing.id, expiresAt };
    }
    return {
      ok: false,
      error: "این مورد توسط کاربر دیگری قفل شده است.",
      code: "ALREADY_CLAIMED",
    };
  }

  try {
    if (existing) {
      // CAS reclaim — only if expired or released
      const updated = await prisma.opsQueueClaim.updateMany({
        where: {
          id: existing.id,
          OR: [{ releasedAt: { not: null } }, { expiresAt: { lt: now } }],
        },
        data: {
          claimedByUserId: params.claimedByUserId,
          claimedAt: now,
          heartbeatAt: now,
          expiresAt,
          releasedAt: null,
        },
      });
      if (updated.count !== 1) {
        return {
          ok: false,
          error: "این مورد توسط کاربر دیگری قفل شده است.",
          code: "ALREADY_CLAIMED",
        };
      }
      return { ok: true, claimId: existing.id, expiresAt };
    }

    const created = await prisma.opsQueueClaim.create({
      data: {
        organizationId: params.organizationId,
        queueId,
        entityType,
        entityId: params.entityId,
        claimedByUserId: params.claimedByUserId,
        claimedAt: now,
        heartbeatAt: now,
        expiresAt,
      },
    });
    return { ok: true, claimId: created.id, expiresAt: created.expiresAt };
  } catch {
    return {
      ok: false,
      error: "ثبت قفل صف ممکن نشد.",
      code: "ERROR",
    };
  }
}

export async function heartbeatQueueClaim(params: {
  organizationId: string;
  claimId: string;
  claimedByUserId: string;
  ttlMs?: number;
}): Promise<{ ok: true; expiresAt: Date } | { ok: false; error: string }> {
  const ttl = clampClaimTtlMs(params.ttlMs);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttl);
  const updated = await prisma.opsQueueClaim.updateMany({
    where: {
      id: params.claimId,
      organizationId: params.organizationId,
      claimedByUserId: params.claimedByUserId,
      releasedAt: null,
      expiresAt: { gt: now },
    },
    data: { heartbeatAt: now, expiresAt },
  });
  if (updated.count !== 1) {
    return { ok: false, error: "قفل فعال یافت نشد." };
  }
  return { ok: true, expiresAt };
}

export async function releaseQueueClaim(params: {
  organizationId: string;
  claimId: string;
  claimedByUserId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const now = new Date();
  const updated = await prisma.opsQueueClaim.updateMany({
    where: {
      id: params.claimId,
      organizationId: params.organizationId,
      claimedByUserId: params.claimedByUserId,
      releasedAt: null,
    },
    data: { releasedAt: now },
  });
  if (updated.count !== 1) {
    return { ok: false, error: "قفل برای آزادسازی یافت نشد." };
  }
  return { ok: true };
}

export async function getActiveClaimMap(params: {
  organizationId: string;
  queueId: OpsQueueIdValue;
}): Promise<Map<string, { claimedByUserId: string; expiresAt: Date }>> {
  await expireStaleClaims(params.organizationId);
  const now = new Date();
  const rows = await prisma.opsQueueClaim.findMany({
    where: {
      organizationId: params.organizationId,
      queueId: toEnumQueue(params.queueId),
      releasedAt: null,
      expiresAt: { gt: now },
    },
    select: {
      entityType: true,
      entityId: true,
      claimedByUserId: true,
      expiresAt: true,
    },
  });
  const map = new Map<string, { claimedByUserId: string; expiresAt: Date }>();
  for (const row of rows) {
    map.set(`${row.entityType}:${row.entityId}`, {
      claimedByUserId: row.claimedByUserId,
      expiresAt: row.expiresAt,
    });
  }
  return map;
}
