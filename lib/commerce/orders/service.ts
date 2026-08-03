/**
 * Single-item commerce order create + fulfillment helpers.
 */

import type { Prisma } from "@/generated/prisma/client";
import {
  CommerceDeliveryMethod,
  CommerceFulfillmentStatus,
  CommerceItemStatus,
  CommerceOrderPaymentStatus,
  CommerceOrderStatus,
  CommerceSystemKind,
} from "@/generated/prisma/enums";
import { resolveCommercePrice } from "@/lib/commerce/pricing";
import {
  buildCommerceOrderNumber,
  calculateOrderTotals,
} from "@/lib/commerce/orders/totals";
import { normalizeIranianMobile } from "@/lib/forms/normalize-mobile";
import { prisma } from "@/lib/prisma";

export type CreateSingleItemOrderInput = {
  organizationId: string;
  itemId: string;
  buyerFirstName: string;
  buyerLastName: string;
  buyerMobile: string;
};

export type CreateSingleItemOrderResult =
  | {
      ok: true;
      orderId: string;
      orderNumber: string;
      grandTotalRials: number;
    }
  | { ok: false; error: string };

export async function createSingleItemCommerceOrder(
  input: CreateSingleItemOrderInput,
): Promise<CreateSingleItemOrderResult> {
  const firstName = input.buyerFirstName.trim();
  const lastName = input.buyerLastName.trim();
  if (!firstName || !lastName) {
    return { ok: false, error: "نام و نام خانوادگی الزامی است." };
  }

  const mobile = normalizeIranianMobile(input.buyerMobile);
  if (!mobile.ok) {
    return { ok: false, error: mobile.error };
  }

  const item = await prisma.commerceItem.findFirst({
    where: {
      id: input.itemId,
      organizationId: input.organizationId,
      deletedAt: null,
      isVisible: true,
      status: CommerceItemStatus.ACTIVE,
    },
    select: {
      id: true,
      title: true,
      sku: true,
      systemKind: true,
      basePriceRials: true,
      salePriceRials: true,
      priceStartsAt: true,
      priceEndsAt: true,
      trackInventory: true,
      unlimitedStock: true,
      stockQuantity: true,
      status: true,
    },
  });

  if (!item) {
    return { ok: false, error: "محصول برای خرید در دسترس نیست." };
  }

  if (
    item.trackInventory &&
    !item.unlimitedStock &&
    (item.stockQuantity == null || item.stockQuantity < 1)
  ) {
    return { ok: false, error: "این محصول ناموجود است." };
  }

  const pricing = resolveCommercePrice({
    basePriceRials: item.basePriceRials,
    salePriceRials: item.salePriceRials,
    priceStartsAt: item.priceStartsAt,
    priceEndsAt: item.priceEndsAt,
  });

  let totals;
  try {
    totals = calculateOrderTotals({
      lines: [
        {
          itemId: item.id,
          titleSnapshot: item.title,
          skuSnapshot: item.sku,
          systemKindSnapshot: item.systemKind as
            | "PHYSICAL"
            | "DIGITAL"
            | "COURSE"
            | "EVENT"
            | "EXAM"
            | "CONSULTING"
            | "SERVICE"
            | "CUSTOM",
          unitPriceRials: pricing.finalPriceRials,
          quantity: 1,
          discountRials: 0,
        },
      ],
      shippingRials: 0,
      taxRials: 0,
    });
  } catch (error) {
    console.error("[commerce] order totals failed", error);
    return {
      ok: false,
      error:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : "محاسبه مبلغ سفارش ناموفق بود.",
    };
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      const dayStart = new Date();
      dayStart.setUTCHours(0, 0, 0, 0);
      const countToday = await tx.commerceOrder.count({
        where: {
          organizationId: input.organizationId,
          createdAt: { gte: dayStart },
        },
      });

      const orderNumber = buildCommerceOrderNumber({
        sequence: countToday + 1,
      });

      // Nested item create under Order must NOT pass organizationId —
      // Prisma UncheckedCreateWithoutOrderInput omits it (inherited from parent).
      // Create order + lines in two steps so compound FKs stay explicit and safe.
      const order = await tx.commerceOrder.create({
        data: {
          organizationId: input.organizationId,
          orderNumber,
          status: CommerceOrderStatus.AWAITING_PAYMENT,
          paymentStatus: CommerceOrderPaymentStatus.PENDING,
          buyerName: `${firstName} ${lastName}`.trim(),
          buyerMobile: mobile.normalized,
          subtotalRials: totals.subtotalRials,
          discountRials: totals.discountRials,
          taxRials: totals.taxRials,
          shippingRials: 0,
          grandTotalRials: totals.grandTotalRials,
          deliveryMethod: CommerceDeliveryMethod.PICKUP_ONSITE,
          fulfillmentStatus: CommerceFulfillmentStatus.AWAITING_PICKUP,
          currency: "IRR",
        },
        select: { id: true, orderNumber: true, grandTotalRials: true },
      });

      await tx.commerceOrderItem.createMany({
        data: totals.lines.map((line) => ({
          organizationId: input.organizationId,
          orderId: order.id,
          itemId: line.itemId,
          titleSnapshot: line.titleSnapshot,
          skuSnapshot: line.skuSnapshot,
          systemKindSnapshot: line.systemKindSnapshot as CommerceSystemKind,
          unitPriceRials: line.unitPriceRials,
          quantity: line.quantity,
          discountRials: line.discountRials,
          totalRials: line.totalRials,
        })),
      });

      return order;
    });

    return {
      ok: true,
      orderId: created.id,
      orderNumber: created.orderNumber,
      grandTotalRials: created.grandTotalRials,
    };
  } catch (error) {
    console.error("[commerce] create order failed", {
      organizationId: input.organizationId,
      itemId: input.itemId,
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    const devDetail =
      process.env.NODE_ENV === "development" && error instanceof Error
        ? ` (${error.message})`
        : "";
    return { ok: false, error: `ثبت سفارش ناموفق بود.${devDetail}` };
  }
}

export async function markCommerceOrderDelivered(params: {
  organizationId: string;
  orderId: string;
  actorUserId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const order = await prisma.commerceOrder.findFirst({
    where: {
      id: params.orderId,
      organizationId: params.organizationId,
    },
    select: {
      id: true,
      paymentStatus: true,
      fulfillmentStatus: true,
    },
  });

  if (!order) return { ok: false, error: "سفارش یافت نشد." };
  if (order.paymentStatus !== CommerceOrderPaymentStatus.PAID) {
    return { ok: false, error: "فقط سفارش‌های پرداخت‌شده قابل تحویل هستند." };
  }
  if (order.fulfillmentStatus === CommerceFulfillmentStatus.DELIVERED) {
    return { ok: true };
  }
  if (order.fulfillmentStatus === CommerceFulfillmentStatus.CANCELLED) {
    return { ok: false, error: "سفارش لغو شده قابل تحویل نیست." };
  }

  await prisma.commerceOrder.update({
    where: { id: order.id },
    data: {
      fulfillmentStatus: CommerceFulfillmentStatus.DELIVERED,
      status: CommerceOrderStatus.COMPLETED,
      deliveredAt: new Date(),
      deliveredByUserId: params.actorUserId,
    },
  });

  return { ok: true };
}

export type AdminCommerceOrderRow = {
  id: string;
  orderNumber: string;
  buyerName: string | null;
  buyerMobile: string | null;
  productTitle: string;
  quantity: number;
  lineTotalRials: number;
  grandTotalRials: number;
  paymentStatus: CommerceOrderPaymentStatus;
  fulfillmentStatus: CommerceFulfillmentStatus | null;
  createdAt: Date;
  trackingCode: string | null;
  deliveredAt: Date | null;
  deliveredByName: string | null;
};

export type AdminCommerceOrderListFilters = {
  organizationId: string;
  q?: string;
  buyerName?: string;
  buyerMobile?: string;
  productQuery?: string;
  itemId?: string;
  paymentStatus?: CommerceOrderPaymentStatus | "";
  fulfillmentStatus?: CommerceFulfillmentStatus | "";
  /** Shortcut: only PAID */
  paidOnly?: boolean;
  /** Shortcut: not DELIVERED (includes AWAITING_PICKUP / null) */
  undeliveredOnly?: boolean;
  /** YYYY-MM-DD (inclusive start, Tehran calendar day → UTC range) */
  dateFrom?: string;
  /** YYYY-MM-DD (inclusive end) */
  dateTo?: string;
  take?: number;
};

function parseDateBound(raw: string | undefined, endOfDay: boolean): Date | null {
  const value = (raw ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  // Interpret as Tehran civil day via midday offset then snap — use UTC date parts for filter simplicity.
  // Store filter as UTC midnight of the given calendar date (admin date inputs).
  const date = new Date(Date.UTC(y, m - 1, d, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function buildAdminCommerceOrderWhere(
  params: AdminCommerceOrderListFilters,
): Prisma.CommerceOrderWhereInput {
  const q = (params.q ?? "").trim();
  const buyerName = (params.buyerName ?? "").trim();
  const buyerMobile = (params.buyerMobile ?? "").trim();
  const productQuery = (params.productQuery ?? "").trim();
  const itemId = (params.itemId ?? "").trim();
  const from = parseDateBound(params.dateFrom, false);
  const to = parseDateBound(params.dateTo, true);

  const paymentStatus = params.paidOnly
    ? CommerceOrderPaymentStatus.PAID
    : params.paymentStatus || undefined;

  const where: Prisma.CommerceOrderWhereInput = {
    organizationId: params.organizationId,
  };

  if (paymentStatus) where.paymentStatus = paymentStatus;

  if (params.undeliveredOnly) {
    where.OR = [
      { fulfillmentStatus: CommerceFulfillmentStatus.AWAITING_PICKUP },
      { fulfillmentStatus: null },
    ];
  } else if (params.fulfillmentStatus) {
    where.fulfillmentStatus = params.fulfillmentStatus;
  }

  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  }

  if (buyerName) {
    where.buyerName = { contains: buyerName, mode: "insensitive" };
  }
  if (buyerMobile) {
    where.buyerMobile = { contains: buyerMobile };
  }

  if (itemId || productQuery) {
    where.items = {
      some: {
        ...(itemId ? { itemId } : {}),
        ...(productQuery
          ? {
              titleSnapshot: {
                contains: productQuery,
                mode: "insensitive",
              },
            }
          : {}),
      },
    };
  }

  if (q) {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
      {
        OR: [
          { orderNumber: { contains: q, mode: "insensitive" } },
          { buyerName: { contains: q, mode: "insensitive" } },
          { buyerMobile: { contains: q } },
          {
            items: {
              some: {
                titleSnapshot: { contains: q, mode: "insensitive" },
              },
            },
          },
        ],
      },
    ];
  }

  return where;
}

export async function listAdminCommerceOrders(
  params: AdminCommerceOrderListFilters,
): Promise<AdminCommerceOrderRow[]> {
  const orders = await prisma.commerceOrder.findMany({
    where: buildAdminCommerceOrderWhere(params),
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(params.take ?? 200, 1), 2000),
    include: {
      items: {
        orderBy: { createdAt: "asc" },
        select: {
          titleSnapshot: true,
          quantity: true,
          totalRials: true,
        },
      },
      deliveredBy: {
        select: { firstName: true, lastName: true },
      },
    },
  });

  const orderIds = orders.map((o) => o.id);
  const intents = orderIds.length
    ? await prisma.paymentIntent.findMany({
        where: {
          organizationId: params.organizationId,
          payableType: "COMMERCE_ORDER",
          payableId: { in: orderIds },
        },
        select: {
          payableId: true,
          trackingCode: true,
          status: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: "desc" },
      })
    : [];

  const trackingByOrder = new Map<string, string | null>();
  for (const intent of intents) {
    if (!trackingByOrder.has(intent.payableId)) {
      trackingByOrder.set(intent.payableId, intent.trackingCode);
    }
  }

  return orders.map((order) => {
    const first = order.items[0];
    const productTitle =
      order.items.length > 1
        ? order.items.map((i) => i.titleSnapshot).join("، ")
        : (first?.titleSnapshot ?? "—");
    const quantity = order.items.reduce((sum, i) => sum + i.quantity, 0);
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      buyerName: order.buyerName,
      buyerMobile: order.buyerMobile,
      productTitle,
      quantity: quantity || 1,
      lineTotalRials: first?.totalRials ?? order.grandTotalRials,
      grandTotalRials: order.grandTotalRials,
      paymentStatus: order.paymentStatus,
      fulfillmentStatus: order.fulfillmentStatus,
      createdAt: order.createdAt,
      trackingCode: trackingByOrder.get(order.id) ?? null,
      deliveredAt: order.deliveredAt,
      deliveredByName: order.deliveredBy
        ? `${order.deliveredBy.firstName} ${order.deliveredBy.lastName}`.trim()
        : null,
    };
  });
}

/** Flat item rows for Excel (one row per order line). */
export type AdminCommerceOrderExportRow = {
  orderNumber: string;
  createdAt: Date;
  buyerName: string | null;
  buyerMobile: string | null;
  productTitle: string;
  quantity: number;
  amountRials: number;
  paymentStatus: CommerceOrderPaymentStatus;
  fulfillmentStatus: CommerceFulfillmentStatus | null;
};

export async function listAdminCommerceOrdersForExport(
  params: AdminCommerceOrderListFilters,
): Promise<AdminCommerceOrderExportRow[]> {
  const orders = await prisma.commerceOrder.findMany({
    where: buildAdminCommerceOrderWhere(params),
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(params.take ?? 5000, 1), 10000),
    include: {
      items: {
        orderBy: { createdAt: "asc" },
        select: {
          titleSnapshot: true,
          quantity: true,
          totalRials: true,
        },
      },
    },
  });

  const rows: AdminCommerceOrderExportRow[] = [];
  for (const order of orders) {
    if (order.items.length === 0) {
      rows.push({
        orderNumber: order.orderNumber,
        createdAt: order.createdAt,
        buyerName: order.buyerName,
        buyerMobile: order.buyerMobile,
        productTitle: "—",
        quantity: 0,
        amountRials: order.grandTotalRials,
        paymentStatus: order.paymentStatus,
        fulfillmentStatus: order.fulfillmentStatus,
      });
      continue;
    }
    for (const item of order.items) {
      rows.push({
        orderNumber: order.orderNumber,
        createdAt: order.createdAt,
        buyerName: order.buyerName,
        buyerMobile: order.buyerMobile,
        productTitle: item.titleSnapshot,
        quantity: item.quantity,
        amountRials: item.totalRials,
        paymentStatus: order.paymentStatus,
        fulfillmentStatus: order.fulfillmentStatus,
      });
    }
  }
  return rows;
}

export async function listCommerceProductFilterOptions(organizationId: string) {
  return prisma.commerceItem.findMany({
    where: {
      organizationId,
      deletedAt: null,
    },
    orderBy: { title: "asc" },
    take: 200,
    select: { id: true, title: true },
  });
}

export async function getCommerceOrderPublicReceipt(params: {
  organizationId: string;
  orderId: string;
}) {
  return prisma.commerceOrder.findFirst({
    where: {
      id: params.orderId,
      organizationId: params.organizationId,
    },
    include: {
      items: {
        orderBy: { createdAt: "asc" },
        select: {
          titleSnapshot: true,
          quantity: true,
          unitPriceRials: true,
          totalRials: true,
        },
      },
    },
  });
}
