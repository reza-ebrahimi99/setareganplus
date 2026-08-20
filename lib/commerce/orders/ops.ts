/**
 * Commerce order operations mutations (advance / rollback / notes / edit).
 */

import {
  CommerceFulfillmentStatus,
  CommerceOpsStage,
  CommerceOrderEventType,
  CommerceOrderPaymentStatus,
  CommerceOrderStatus,
} from "@/generated/prisma/enums";
import { normalizeIranianMobile } from "@/lib/forms/normalize-mobile";
import { commerceAllowedBranchScope } from "@/lib/commerce/orders/filters";
import { prisma } from "@/lib/prisma";
import {
  canAdvanceCommerceOpsStage,
  canRollbackCommerceOpsStage,
  syncedLifecycleForOpsStage,
  type CommerceOpsStageValue,
} from "@/lib/commerce/orders/ops-stage";
import {
  recordCommerceOrderEvent,
  stageChangedEventInput,
} from "@/lib/commerce/orders/timeline";

export type CommerceOpsResult =
  | { ok: true }
  | { ok: false; error: string };

async function loadOrderForOps(params: {
  organizationId: string;
  orderId: string;
  allowedBranchIds?: readonly string[] | null;
}) {
  const order = await prisma.commerceOrder.findFirst({
    where: {
      id: params.orderId,
      organizationId: params.organizationId,
      ...commerceAllowedBranchScope(params.allowedBranchIds),
    },
    select: {
      id: true,
      organizationId: true,
      branchId: true,
      opsStage: true,
      paymentStatus: true,
      notes: true,
      buyerName: true,
      buyerMobile: true,
    },
  });
  return order;
}

function applyLifecycle(
  stage: CommerceOpsStageValue,
  paymentPaid: boolean,
  extra: {
    deliveredAt?: Date | null;
    deliveredByUserId?: string | null;
    readyForPickupAt?: Date | null;
    readyForPickupByUserId?: string | null;
    deliveryNote?: string | null;
  } = {},
) {
  const synced = syncedLifecycleForOpsStage(stage, paymentPaid);
  return {
    opsStage: stage as CommerceOpsStage,
    status: synced.status as CommerceOrderStatus,
    fulfillmentStatus: synced.fulfillmentStatus as CommerceFulfillmentStatus | null,
    ...extra,
  };
}

export async function advanceCommerceOrderStage(params: {
  organizationId: string;
  orderId: string;
  actorUserId: string;
  note?: string | null;
  allowedBranchIds?: readonly string[] | null;
}): Promise<CommerceOpsResult> {
  const order = await loadOrderForOps(params);
  if (!order) return { ok: false, error: "سفارش یافت نشد." };

  const paymentPaid = order.paymentStatus === CommerceOrderPaymentStatus.PAID;
  const gate = canAdvanceCommerceOpsStage({
    current: order.opsStage as CommerceOpsStageValue,
    paymentPaid,
  });
  if (!gate.ok) return gate;

  const now = new Date();
  const extra =
    gate.next === "READY_FOR_PICKUP"
      ? {
          readyForPickupAt: now,
          readyForPickupByUserId: params.actorUserId,
        }
      : gate.next === "DELIVERED_TO_STUDENT"
        ? {
            deliveredAt: now,
            deliveredByUserId: params.actorUserId,
            deliveryNote: params.note?.trim() || null,
          }
        : {};

  await prisma.$transaction(async (tx) => {
    await tx.commerceOrder.update({
      where: { id: order.id },
      data: applyLifecycle(gate.next, paymentPaid, extra),
    });
    await recordCommerceOrderEvent(
      tx,
      stageChangedEventInput({
        organizationId: order.organizationId,
        orderId: order.id,
        stage: gate.next,
        actorUserId: params.actorUserId,
        note: params.note,
      }),
    );
  });

  return { ok: true };
}

export async function rollbackCommerceOrderStage(params: {
  organizationId: string;
  orderId: string;
  actorUserId: string;
  note?: string | null;
  allowedBranchIds?: readonly string[] | null;
}): Promise<CommerceOpsResult> {
  const order = await loadOrderForOps(params);
  if (!order) return { ok: false, error: "سفارش یافت نشد." };

  const paymentPaid = order.paymentStatus === CommerceOrderPaymentStatus.PAID;
  const gate = canRollbackCommerceOpsStage({
    current: order.opsStage as CommerceOpsStageValue,
    paymentPaid,
  });
  if (!gate.ok) return gate;

  const extra =
    order.opsStage === "DELIVERED_TO_STUDENT"
      ? {
          deliveredAt: null,
          deliveredByUserId: null,
          deliveryNote: null,
        }
      : order.opsStage === "READY_FOR_PICKUP"
        ? {
            readyForPickupAt: null,
            readyForPickupByUserId: null,
          }
        : {};

  await prisma.$transaction(async (tx) => {
    await tx.commerceOrder.update({
      where: { id: order.id },
      data: applyLifecycle(gate.previous, paymentPaid, extra),
    });
    await recordCommerceOrderEvent(
      tx,
      stageChangedEventInput({
        organizationId: order.organizationId,
        orderId: order.id,
        stage: gate.previous,
        actorUserId: params.actorUserId,
        note: params.note,
        rolledBack: true,
      }),
    );
  });

  return { ok: true };
}

export async function addCommerceOrderNote(params: {
  organizationId: string;
  orderId: string;
  actorUserId: string;
  body: string;
  allowedBranchIds?: readonly string[] | null;
}): Promise<CommerceOpsResult> {
  const note = params.body.trim();
  if (!note) return { ok: false, error: "متن یادداشت خالی است." };

  const order = await loadOrderForOps(params);
  if (!order) return { ok: false, error: "سفارش یافت نشد." };

  const merged = [order.notes?.trim(), note].filter(Boolean).join("\n\n");

  await prisma.$transaction(async (tx) => {
    await tx.commerceOrder.update({
      where: { id: order.id },
      data: { notes: merged },
    });
    await recordCommerceOrderEvent(tx, {
      organizationId: order.organizationId,
      orderId: order.id,
      eventType: CommerceOrderEventType.NOTE_ADDED,
      title: "یادداشت داخلی",
      note,
      actorUserId: params.actorUserId,
    });
  });

  return { ok: true };
}

export async function updateCommerceOrderDetails(params: {
  organizationId: string;
  orderId: string;
  actorUserId: string;
  buyerName?: string;
  buyerMobile?: string;
  branchId?: string | null;
  notes?: string;
  allowedBranchIds?: readonly string[] | null;
}): Promise<CommerceOpsResult> {
  const order = await loadOrderForOps(params);
  if (!order) return { ok: false, error: "سفارش یافت نشد." };

  const buyerName =
    params.buyerName !== undefined ? params.buyerName.trim() : undefined;
  if (buyerName !== undefined && !buyerName) {
    return { ok: false, error: "نام مشتری الزامی است." };
  }

  let buyerMobile: string | undefined;
  if (params.buyerMobile !== undefined) {
    const mobile = normalizeIranianMobile(params.buyerMobile);
    if (!mobile.ok) return { ok: false, error: mobile.error };
    buyerMobile = mobile.normalized;
  }

  const branchId = params.branchId;
  if (branchId !== undefined && branchId) {
    const branch = await prisma.branch.findFirst({
      where: {
        id: branchId,
        organizationId: params.organizationId,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!branch) return { ok: false, error: "شعبه معتبر نیست." };
    if (
      params.allowedBranchIds &&
      !params.allowedBranchIds.includes(branch.id)
    ) {
      return { ok: false, error: "دسترسی به این شعبه ندارید." };
    }
  }

  const branchChanged =
    branchId !== undefined && (branchId || null) !== (order.branchId || null);

  await prisma.$transaction(async (tx) => {
    await tx.commerceOrder.update({
      where: { id: order.id },
      data: {
        ...(buyerName !== undefined ? { buyerName } : {}),
        ...(buyerMobile !== undefined ? { buyerMobile } : {}),
        ...(branchId !== undefined ? { branchId: branchId || null } : {}),
        ...(params.notes !== undefined ? { notes: params.notes.trim() } : {}),
      },
    });
    await recordCommerceOrderEvent(tx, {
      organizationId: order.organizationId,
      orderId: order.id,
      eventType: branchChanged
        ? CommerceOrderEventType.BRANCH_ASSIGNED
        : CommerceOrderEventType.EDITED,
      title: branchChanged ? "شعبه به‌روزرسانی شد" : "ویرایش سفارش",
      actorUserId: params.actorUserId,
      metadata: {
        buyerName: buyerName ?? null,
        branchId: branchId ?? null,
      },
    });
  });

  return { ok: true };
}
