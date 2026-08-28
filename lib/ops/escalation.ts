/**
 * Append-only escalations. Reassignment must use setLeadOwner.
 * Sprint 6.6: concurrent-safe open via unique violation catch + partial unique index.
 */

import {
  DomainEventType,
  OpsEntityType,
  OpsEscalationStatus,
  OpsQueueId,
} from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { enqueueDomainEvent } from "@/lib/automation/enqueue";
import { setLeadOwner } from "@/lib/crm/lead-ownership";
import type {
  OpsEntityType as OpsEntityTypeValue,
  OpsQueueId as OpsQueueIdValue,
} from "@/lib/ops/types";
import { prisma } from "@/lib/prisma";

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

export async function openEscalation(params: {
  organizationId: string;
  entityType: OpsEntityTypeValue;
  entityId: string;
  leadId?: string | null;
  queueId: OpsQueueIdValue;
  reason: string;
  metadata?: Record<string, unknown>;
}): Promise<{ id: string; created: boolean }> {
  const existing = await prisma.opsEscalation.findFirst({
    where: {
      organizationId: params.organizationId,
      entityType: OpsEntityType[params.entityType],
      entityId: params.entityId,
      status: OpsEscalationStatus.OPEN,
    },
    select: { id: true },
  });
  if (existing) return { id: existing.id, created: false };

  try {
    const row = await prisma.opsEscalation.create({
      data: {
        organizationId: params.organizationId,
        entityType: OpsEntityType[params.entityType],
        entityId: params.entityId,
        leadId: params.leadId ?? null,
        queueId: OpsQueueId[params.queueId],
        reason: params.reason,
        status: OpsEscalationStatus.OPEN,
        metadata:
          params.metadata === undefined
            ? undefined
            : (params.metadata as Prisma.InputJsonValue),
      },
      select: { id: true },
    });

    await enqueueDomainEvent({
      organizationId: params.organizationId,
      eventType: DomainEventType.QUEUE_ITEM_ESCALATED,
      aggregateType: "OpsEscalation",
      aggregateId: row.id,
      dedupeKey: `QUEUE_ITEM_ESCALATED:${row.id}`,
      payload: {
        escalationId: row.id,
        entityType: params.entityType,
        entityId: params.entityId,
        leadId: params.leadId ?? null,
        queueId: params.queueId,
        reason: params.reason,
      },
    }).catch(() => undefined);

    return { id: row.id, created: true };
  } catch (error) {
    if (isUniqueViolation(error)) {
      const raced = await prisma.opsEscalation.findFirst({
        where: {
          organizationId: params.organizationId,
          entityType: OpsEntityType[params.entityType],
          entityId: params.entityId,
          status: OpsEscalationStatus.OPEN,
        },
        select: { id: true },
      });
      if (raced) return { id: raced.id, created: false };
    }
    throw error;
  }
}

export async function resolveEscalation(params: {
  organizationId: string;
  escalationId: string;
  resolvedByUserId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const updated = await prisma.opsEscalation.updateMany({
    where: {
      id: params.escalationId,
      organizationId: params.organizationId,
      status: OpsEscalationStatus.OPEN,
    },
    data: {
      status: OpsEscalationStatus.RESOLVED,
      resolvedAt: new Date(),
      resolvedByUserId: params.resolvedByUserId,
    },
  });
  if (updated.count !== 1) {
    return { ok: false, error: "ارجاع باز یافت نشد." };
  }
  return { ok: true };
}

/**
 * Escalate and optionally reassign lead owner via Truth Spine.
 */
export async function escalateAndReassign(params: {
  organizationId: string;
  leadId: string;
  reason: string;
  newOwnerUserId: string;
  actorUserId?: string | null;
  queueId?: OpsQueueIdValue;
  source?: "SYSTEM" | "AUTOMATION";
}): Promise<
  | { ok: true; escalationId: string }
  | { ok: false; error: string }
> {
  const opened = await openEscalation({
    organizationId: params.organizationId,
    entityType: "LEAD",
    entityId: params.leadId,
    leadId: params.leadId,
    queueId: params.queueId ?? "ESCALATION",
    reason: params.reason,
  });

  const assigned = await setLeadOwner({
    organizationId: params.organizationId,
    leadId: params.leadId,
    ownerUserId: params.newOwnerUserId,
    actorUserId: params.actorUserId,
    source: params.source ?? "SYSTEM",
  });
  if (!assigned.ok) {
    return { ok: false, error: assigned.error };
  }
  return { ok: true, escalationId: opened.id };
}
