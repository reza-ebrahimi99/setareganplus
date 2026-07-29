/**
 * Commerce inventory mutations — transactional, idempotent-friendly.
 */

import type { Prisma } from "@/generated/prisma/client";
import { CommerceItemStatus } from "@/generated/prisma/enums";

export async function decrementCommerceItemStock(params: {
  tx: Prisma.TransactionClient;
  organizationId: string;
  itemId: string;
  quantity: number;
}): Promise<{ ok: true; remaining: number | null } | { ok: false; error: string }> {
  const quantity = Math.trunc(params.quantity);
  if (!Number.isInteger(quantity) || quantity < 1) {
    return { ok: false, error: "تعداد کاهش موجودی نامعتبر است." };
  }

  const item = await params.tx.commerceItem.findFirst({
    where: {
      id: params.itemId,
      organizationId: params.organizationId,
      deletedAt: null,
    },
    select: {
      id: true,
      trackInventory: true,
      unlimitedStock: true,
      stockQuantity: true,
      status: true,
    },
  });

  if (!item) {
    return { ok: false, error: "محصول یافت نشد." };
  }

  if (!item.trackInventory || item.unlimitedStock) {
    return { ok: true, remaining: null };
  }

  const updated = await params.tx.commerceItem.updateMany({
    where: {
      id: item.id,
      organizationId: params.organizationId,
      trackInventory: true,
      unlimitedStock: false,
      stockQuantity: { gte: quantity },
    },
    data: {
      stockQuantity: { decrement: quantity },
    },
  });

  if (updated.count === 0) {
    return { ok: false, error: "موجودی کافی نیست." };
  }

  const fresh = await params.tx.commerceItem.findFirst({
    where: { id: item.id, organizationId: params.organizationId },
    select: { stockQuantity: true, status: true },
  });

  const remaining = fresh?.stockQuantity ?? 0;
  if (
    remaining <= 0 &&
    fresh &&
    fresh.status !== CommerceItemStatus.ARCHIVED &&
    fresh.status !== CommerceItemStatus.DRAFT
  ) {
    await params.tx.commerceItem.update({
      where: { id: item.id },
      data: { status: CommerceItemStatus.OUT_OF_STOCK, stockQuantity: 0 },
    });
  }

  return { ok: true, remaining };
}
