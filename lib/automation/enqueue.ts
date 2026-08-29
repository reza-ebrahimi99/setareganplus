import type { Prisma } from "@/generated/prisma/client";
import { DomainEventType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

export type EnqueueDomainEventParams = {
  organizationId: string;
  branchId?: string | null;
  eventType: DomainEventType;
  aggregateType: string;
  aggregateId: string;
  payload?: Record<string, unknown>;
  dedupeKey?: string | null;
  availableAt?: Date;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx?: any;
};

/**
 * Thin producer helper — never evaluates rules.
 * Dedupes when `dedupeKey` is provided (unique per org).
 */
export async function enqueueDomainEvent(
  params: EnqueueDomainEventParams,
): Promise<{ id: string; created: boolean }> {
  const client = params.tx ?? prisma;
  const dedupeKey = params.dedupeKey?.trim() || null;

  if (dedupeKey) {
    const existing = await client.domainEventOutbox.findFirst({
      where: {
        organizationId: params.organizationId,
        dedupeKey,
      },
      select: { id: true },
    });
    if (existing) return { id: existing.id, created: false };
  }

  try {
    const row = await client.domainEventOutbox.create({
      data: {
        organizationId: params.organizationId,
        branchId: params.branchId ?? null,
        eventType: params.eventType,
        aggregateType: params.aggregateType,
        aggregateId: params.aggregateId,
        dedupeKey,
        availableAt: params.availableAt ?? new Date(),
        payload: {
          occurredAt: new Date().toISOString(),
          ...(params.payload ?? {}),
        } satisfies Prisma.InputJsonObject,
      },
      select: { id: true },
    });
    return { id: row.id, created: true };
  } catch (error) {
    if (dedupeKey) {
      const raced = await client.domainEventOutbox.findFirst({
        where: {
          organizationId: params.organizationId,
          dedupeKey,
        },
        select: { id: true },
      });
      if (raced) return { id: raced.id, created: false };
    }
    throw error;
  }
}
