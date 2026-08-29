/**
 * Bulk booklet ops — reuses single-order mutations.
 */

import { advanceCommerceOrderStage } from "@/lib/commerce/orders/ops";
import { prisma } from "@/lib/prisma";
import { commerceAllowedBranchScope } from "@/lib/commerce/orders/filters";
import { CommerceOrderEventType } from "@/generated/prisma/enums";
import { recordCommerceOrderEvent } from "@/lib/commerce/orders/timeline";
import { assertCommerceHandoverStaff } from "@/lib/commerce/orders/staff";

export type CommerceBulkAction =
  | "production"
  | "ready"
  | "deliver"
  | "assignStaff"
  | "assignPickup";

export type CommerceBulkResult = {
  ok: boolean;
  done: number;
  failed: number;
  error?: string;
};

function uniqueIds(raw: readonly string[]): string[] {
  return [...new Set(raw.map((id) => id.trim()).filter(Boolean))].slice(0, 200);
}

export async function bulkAdvanceCommerceOrders(params: {
  organizationId: string;
  actorUserId: string;
  orderIds: readonly string[];
  target: "production" | "ready" | "deliver";
  handoverStaffUserId?: string | null;
  allowedBranchIds?: readonly string[] | null;
}): Promise<CommerceBulkResult> {
  const ids = uniqueIds(params.orderIds);
  if (ids.length === 0) return { ok: false, done: 0, failed: 0, error: "سفارشی انتخاب نشده است." };

  if (params.target === "deliver") {
    const staff = await assertCommerceHandoverStaff({
      organizationId: params.organizationId,
      userId: (params.handoverStaffUserId ?? "").trim(),
    });
    if (!staff.ok) return { ok: false, done: 0, failed: ids.length, error: staff.error };
  }

  let done = 0;
  let failed = 0;
  let lastError: string | undefined;
  for (const orderId of ids) {
    const current = await prisma.commerceOrder.findFirst({
      where: {
        id: orderId,
        organizationId: params.organizationId,
        ...commerceAllowedBranchScope(params.allowedBranchIds),
      },
      select: { opsStage: true },
    });
    if (!current) {
      failed += 1;
      continue;
    }
    const want =
      params.target === "production"
        ? "IN_PRODUCTION"
        : params.target === "ready"
          ? "READY_FOR_PICKUP"
          : "DELIVERED_TO_STUDENT";
    if (current.opsStage === want) {
      done += 1;
      continue;
    }
    let safety = 0;
    let stage = current.opsStage;
    let advanced = false;
    while (stage !== want && safety < 5) {
      const result = await advanceCommerceOrderStage({
        organizationId: params.organizationId,
        orderId,
        actorUserId: params.actorUserId,
        handoverStaffUserId: params.handoverStaffUserId,
        allowedBranchIds: params.allowedBranchIds,
      });
      if (!result.ok) {
        lastError = result.error;
        break;
      }
      advanced = true;
      const next = await prisma.commerceOrder.findFirst({
        where: { id: orderId },
        select: { opsStage: true },
      });
      if (!next || next.opsStage === stage) break;
      stage = next.opsStage;
      safety += 1;
    }
    if (advanced && stage === want) done += 1;
    else failed += 1;
  }
  return { ok: failed === 0, done, failed, error: lastError };
}

export async function bulkAssignCommerceOrders(params: {
  organizationId: string;
  actorUserId: string;
  orderIds: readonly string[];
  handoverStaffUserId?: string | null;
  pickupBranchId?: string | null;
  allowedBranchIds?: readonly string[] | null;
}): Promise<CommerceBulkResult> {
  const ids = uniqueIds(params.orderIds);
  if (ids.length === 0) return { ok: false, done: 0, failed: 0, error: "سفارشی انتخاب نشده است." };

  if (params.handoverStaffUserId) {
    const staff = await assertCommerceHandoverStaff({
      organizationId: params.organizationId,
      userId: params.handoverStaffUserId,
    });
    if (!staff.ok) return { ok: false, done: 0, failed: ids.length, error: staff.error };
  }

  if (params.pickupBranchId) {
    const branch = await prisma.branch.findFirst({
      where: {
        id: params.pickupBranchId,
        organizationId: params.organizationId,
        deletedAt: null,
        isActive: true,
      },
      select: { id: true },
    });
    if (!branch) {
      return { ok: false, done: 0, failed: ids.length, error: "محل دریافت معتبر نیست." };
    }
  }

  const found = await prisma.commerceOrder.findMany({
    where: {
      id: { in: ids },
      organizationId: params.organizationId,
      ...commerceAllowedBranchScope(params.allowedBranchIds),
    },
    select: { id: true },
  });
  const allowed = found.map((row) => row.id);
  if (allowed.length === 0) {
    return { ok: false, done: 0, failed: ids.length, error: "دسترسی به سفارش‌ها نیست." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.commerceOrder.updateMany({
      where: { id: { in: allowed }, organizationId: params.organizationId },
      data: {
        ...(params.handoverStaffUserId
          ? { handoverStaffUserId: params.handoverStaffUserId }
          : {}),
        ...(params.pickupBranchId ? { pickupBranchId: params.pickupBranchId } : {}),
      },
    });
    for (const orderId of allowed) {
      await recordCommerceOrderEvent(tx, {
        organizationId: params.organizationId,
        orderId,
        eventType: CommerceOrderEventType.EDITED,
        title: params.handoverStaffUserId
          ? "مسئول تحویل گروهی ثبت شد"
          : "محل دریافت گروهی به‌روزرسانی شد",
        actorUserId: params.actorUserId,
      });
    }
  });

  return { ok: true, done: allowed.length, failed: ids.length - allowed.length };
}
