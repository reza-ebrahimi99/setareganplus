/**
 * Ghalamchi Book POS — audited inventory mutations + reads.
 *
 * The BookStockMovement ledger is the single source of truth for stock history.
 * Never mutate BookSku.stockQuantity without writing a movement row here.
 */

import type { Prisma } from "@/generated/prisma/client";
import { BookStockMovementReason } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

export type PosDbClient = Prisma.TransactionClient | typeof prisma;

/** Books at or below this on-hand quantity are flagged low-stock in the UI. */
export const POS_LOW_STOCK_THRESHOLD = 5;

export type AdjustBookStockInput = {
  organizationId: string;
  bookSkuId: string;
  /** Signed change: positive = in (restock/initial), negative = out (sale/correction). */
  delta: number;
  reason: BookStockMovementReason;
  actorUserId?: string | null;
  orderId?: string | null;
  importJobId?: string | null;
  note?: string | null;
};

export type AdjustBookStockResult =
  | { ok: true; delta: number; balanceAfter: number }
  | { ok: false; error: string };

/**
 * Apply a signed stock delta to a BookSku and append a movement row, in one
 * step. Decrements on tracked books use an atomic guard so concurrent POS
 * sales can never oversell. Enables inventory tracking on first write.
 */
export async function adjustBookStock(
  client: PosDbClient,
  params: AdjustBookStockInput,
): Promise<AdjustBookStockResult> {
  const delta = Math.trunc(params.delta);
  if (!Number.isInteger(delta) || delta === 0) {
    return { ok: false, error: "مقدار تغییر موجودی نامعتبر است." };
  }

  const sku = await client.bookSku.findFirst({
    where: {
      id: params.bookSkuId,
      organizationId: params.organizationId,
      deletedAt: null,
    },
    select: {
      id: true,
      stockQuantity: true,
      trackInventory: true,
      unlimitedStock: true,
    },
  });
  if (!sku) return { ok: false, error: "کتاب یافت نشد." };

  const current = sku.stockQuantity ?? 0;
  const newValue = current + delta;
  if (newValue < 0) return { ok: false, error: "موجودی کافی نیست." };

  const trackedNumeric = sku.trackInventory && !sku.unlimitedStock;

  if (delta < 0 && trackedNumeric) {
    // Atomic oversell guard for concurrent sales.
    const res = await client.bookSku.updateMany({
      where: {
        id: sku.id,
        organizationId: params.organizationId,
        trackInventory: true,
        unlimitedStock: false,
        stockQuantity: { gte: -delta },
      },
      data: { stockQuantity: { increment: delta } },
    });
    if (res.count === 0) return { ok: false, error: "موجودی کافی نیست." };
  } else {
    // Positive delta, or first-time enablement: write the absolute value and
    // switch the SKU into tracked/limited inventory mode.
    await client.bookSku.update({
      where: { id: sku.id },
      data: {
        stockQuantity: newValue,
        trackInventory: true,
        unlimitedStock: false,
      },
    });
  }

  const fresh = await client.bookSku.findFirst({
    where: { id: sku.id, organizationId: params.organizationId },
    select: { stockQuantity: true },
  });
  const balanceAfter = fresh?.stockQuantity ?? newValue;

  await client.bookStockMovement.create({
    data: {
      organizationId: params.organizationId,
      bookSkuId: sku.id,
      delta,
      balanceAfter,
      reason: params.reason,
      orderId: params.orderId ?? null,
      importJobId: params.importJobId ?? null,
      actorUserId: params.actorUserId ?? null,
      note: params.note ?? null,
    },
  });

  return { ok: true, delta, balanceAfter };
}

/**
 * Reconcile a book to a DESIRED absolute on-hand quantity by recording the
 * signed difference from current stock. Used by manual corrections and by the
 * Excel importer's "initial stock" rule for existing books (never blindly adds).
 * A no-op (delta 0) writes no movement.
 */
export async function reconcileBookStockToAbsolute(
  client: PosDbClient,
  params: {
    organizationId: string;
    bookSkuId: string;
    desired: number;
    reason?: BookStockMovementReason;
    actorUserId?: string | null;
    importJobId?: string | null;
    note?: string | null;
  },
): Promise<AdjustBookStockResult> {
  const desired = Math.trunc(params.desired);
  if (!Number.isInteger(desired) || desired < 0) {
    return { ok: false, error: "موجودی هدف باید عددی نامنفی باشد." };
  }
  const sku = await client.bookSku.findFirst({
    where: {
      id: params.bookSkuId,
      organizationId: params.organizationId,
      deletedAt: null,
    },
    select: { stockQuantity: true, trackInventory: true, unlimitedStock: true },
  });
  if (!sku) return { ok: false, error: "کتاب یافت نشد." };

  const current = sku.trackInventory && !sku.unlimitedStock ? sku.stockQuantity ?? 0 : sku.stockQuantity ?? 0;
  const delta = desired - current;
  if (delta === 0) {
    // Ensure tracking is on even when the value already matches.
    if (!sku.trackInventory || sku.unlimitedStock) {
      await client.bookSku.update({
        where: { id: params.bookSkuId },
        data: { stockQuantity: desired, trackInventory: true, unlimitedStock: false },
      });
    }
    return { ok: true, delta: 0, balanceAfter: desired };
  }
  return adjustBookStock(client, {
    organizationId: params.organizationId,
    bookSkuId: params.bookSkuId,
    delta,
    reason: params.reason ?? BookStockMovementReason.CORRECTION,
    actorUserId: params.actorUserId,
    importJobId: params.importJobId,
    note: params.note,
  });
}

export type PosInventoryRow = {
  id: string;
  title: string;
  internalCode: string;
  barcode: string | null;
  gradeLabel: string | null;
  imageUrl: string | null;
  priceRials: number;
  status: string;
  isActive: boolean;
  trackInventory: boolean;
  unlimitedStock: boolean;
  currentStock: number | null;
  received: number;
  sold: number;
  lowStock: boolean;
};

export async function listPosInventory(
  organizationId: string,
  options?: { q?: string; take?: number },
): Promise<PosInventoryRow[]> {
  const { publicLibraryUrl } = await import("@/lib/media/library-image");
  const { toShopPriceInput } = await import("@/lib/books/catalog/price");
  const { resolveCommercePrice } = await import("@/lib/commerce/pricing");
  const { BookSkuStatus } = await import("@/generated/prisma/enums");

  const q = options?.q?.trim();
  const skus = await prisma.bookSku.findMany({
    where: {
      organizationId,
      deletedAt: null,
      ...(q
        ? {
            OR: [
              { internalCode: { contains: q, mode: "insensitive" } },
              { barcode: { contains: q, mode: "insensitive" } },
              { title: { title: { contains: q, mode: "insensitive" } } },
              { searchText: { contains: q.toLocaleLowerCase("fa") } },
            ],
          }
        : {}),
    },
    orderBy: [{ updatedAt: "desc" }],
    take: Math.min(Math.max(options?.take ?? 500, 1), 2000),
    include: {
      title: { select: { title: true } },
      prices: {
        select: {
          id: true,
          kind: true,
          amountRials: true,
          effectiveFrom: true,
          effectiveTo: true,
        },
      },
      primaryImage: { select: { storageKey: true, status: true } },
    },
  });

  const ids = skus.map((s) => s.id);
  const [soldAgg, receivedAgg] = ids.length
    ? await Promise.all([
        prisma.bookStockMovement.groupBy({
          by: ["bookSkuId"],
          where: {
            organizationId,
            bookSkuId: { in: ids },
            reason: BookStockMovementReason.SALE,
          },
          _sum: { delta: true },
        }),
        prisma.bookStockMovement.groupBy({
          by: ["bookSkuId"],
          where: {
            organizationId,
            bookSkuId: { in: ids },
            delta: { gt: 0 },
          },
          _sum: { delta: true },
        }),
      ])
    : [[], []];

  const soldBy = new Map(soldAgg.map((r) => [r.bookSkuId, -(r._sum.delta ?? 0)]));
  const receivedBy = new Map(receivedAgg.map((r) => [r.bookSkuId, r._sum.delta ?? 0]));

  return skus.map((sku) => {
    const pricing = resolveCommercePrice(toShopPriceInput(sku.prices));
    const currentStock = sku.unlimitedStock ? null : sku.stockQuantity ?? 0;
    return {
      id: sku.id,
      title: sku.title.title,
      internalCode: sku.internalCode,
      barcode: sku.barcode,
      gradeLabel: sku.gradeLabel,
      imageUrl:
        sku.primaryImage?.status === "ACTIVE"
          ? publicLibraryUrl(sku.primaryImage.storageKey)
          : null,
      priceRials: pricing.finalPriceRials,
      status: sku.status,
      isActive: sku.status === BookSkuStatus.ACTIVE,
      trackInventory: sku.trackInventory,
      unlimitedStock: sku.unlimitedStock,
      currentStock,
      received: receivedBy.get(sku.id) ?? 0,
      sold: soldBy.get(sku.id) ?? 0,
      lowStock:
        !sku.unlimitedStock &&
        sku.trackInventory &&
        (sku.stockQuantity ?? 0) <= POS_LOW_STOCK_THRESHOLD,
    };
  });
}

export type PosStockMovementRow = {
  id: string;
  createdAt: Date;
  delta: number;
  balanceAfter: number;
  reason: BookStockMovementReason;
  note: string | null;
  orderNumber: string | null;
  actorName: string | null;
};

export async function listBookStockMovements(params: {
  organizationId: string;
  bookSkuId: string;
  take?: number;
}): Promise<PosStockMovementRow[]> {
  const rows = await prisma.bookStockMovement.findMany({
    where: { organizationId: params.organizationId, bookSkuId: params.bookSkuId },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(params.take ?? 100, 1), 500),
  });

  const orderIds = Array.from(
    new Set(rows.map((r) => r.orderId).filter((v): v is string => Boolean(v))),
  );
  const actorIds = Array.from(
    new Set(rows.map((r) => r.actorUserId).filter((v): v is string => Boolean(v))),
  );
  const [orders, actors] = await Promise.all([
    orderIds.length
      ? prisma.commerceOrder.findMany({
          where: { organizationId: params.organizationId, id: { in: orderIds } },
          select: { id: true, orderNumber: true },
        })
      : Promise.resolve([]),
    actorIds.length
      ? prisma.user.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, firstName: true, lastName: true },
        })
      : Promise.resolve([]),
  ]);
  const orderNumberById = new Map(orders.map((o) => [o.id, o.orderNumber]));
  const actorNameById = new Map(
    actors.map((a) => [a.id, `${a.firstName} ${a.lastName}`.trim()]),
  );

  return rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    delta: r.delta,
    balanceAfter: r.balanceAfter,
    reason: r.reason,
    note: r.note,
    orderNumber: r.orderId ? orderNumberById.get(r.orderId) ?? null : null,
    actorName: r.actorUserId ? actorNameById.get(r.actorUserId) ?? null : null,
  }));
}
