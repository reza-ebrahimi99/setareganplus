/**
 * Commerce order timeline persistence helpers.
 */

import type { Prisma } from "@/generated/prisma/client";
import {
  CommerceOrderEventType,
  CommerceOpsStage,
} from "@/generated/prisma/enums";
import {
  COMMERCE_OPS_ACTIVITY_TITLES,
  COMMERCE_OPS_STAGE_LABELS,
  type CommerceOpsStageValue,
} from "@/lib/commerce/orders/ops-stage";
import { prisma } from "@/lib/prisma";

export type CommerceOrderDb = Prisma.TransactionClient | typeof prisma;

export type RecordCommerceOrderEventInput = {
  organizationId: string;
  orderId: string;
  eventType: CommerceOrderEventType;
  stage?: CommerceOpsStageValue | null;
  title: string;
  note?: string | null;
  actorUserId?: string | null;
  occurredAt?: Date;
  metadata?: Prisma.InputJsonValue;
};

export async function recordCommerceOrderEvent(
  db: CommerceOrderDb,
  input: RecordCommerceOrderEventInput,
) {
  return db.commerceOrderEvent.create({
    data: {
      organizationId: input.organizationId,
      orderId: input.orderId,
      eventType: input.eventType,
      stage: input.stage ? (input.stage as CommerceOpsStage) : null,
      title: input.title,
      note: input.note ?? null,
      actorUserId: input.actorUserId ?? null,
      occurredAt: input.occurredAt ?? new Date(),
      metadata: input.metadata,
    },
    select: { id: true },
  });
}

export function stageChangedEventInput(params: {
  organizationId: string;
  orderId: string;
  stage: CommerceOpsStageValue;
  actorUserId?: string | null;
  note?: string | null;
  rolledBack?: boolean;
}): RecordCommerceOrderEventInput {
  return {
    organizationId: params.organizationId,
    orderId: params.orderId,
    eventType: params.rolledBack
      ? CommerceOrderEventType.ROLLBACK
      : CommerceOrderEventType.STAGE_CHANGED,
    stage: params.stage,
    title: params.rolledBack
      ? `بازگشت به ${COMMERCE_OPS_STAGE_LABELS[params.stage]}`
      : COMMERCE_OPS_ACTIVITY_TITLES[params.stage],
    note: params.note,
    actorUserId: params.actorUserId,
  };
}
