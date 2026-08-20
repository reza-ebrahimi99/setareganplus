/**
 * Single-item commerce order create + fulfillment helpers.
 */

import type { Prisma } from "@/generated/prisma/client";
import {
  CommerceDeliveryMethod,
  CommerceFulfillmentStatus,
  CommerceItemStatus,
  CommerceOpsStage,
  CommerceOrderEventType,
  CommerceOrderPaymentStatus,
  CommerceOrderStatus,
  CommerceSystemKind,
} from "@/generated/prisma/enums";
import {
  toCommerceBranchBadge,
  type CommerceBranchBadge,
} from "@/lib/commerce/branches";
import { commerceAllowedBranchScope } from "@/lib/commerce/orders/filters";
import {
  COMMERCE_OPS_ACTIVITY_TITLES,
  isCommerceOpsStage,
  type CommerceOpsStageValue,
} from "@/lib/commerce/orders/ops-stage";
import { recordCommerceOrderEvent } from "@/lib/commerce/orders/timeline";
import { resolveCommercePrice } from "@/lib/commerce/pricing";
import {
  buildCommerceOrderNumber,
  calculateOrderTotals,
} from "@/lib/commerce/orders/totals";
import { tehranLocalToUtc, getTehranParts } from "@/lib/datetime/tehran-zone";
import { normalizeIranianMobile } from "@/lib/forms/normalize-mobile";
import { prisma } from "@/lib/prisma";

export type CreateSingleItemOrderInput = {
  organizationId: string;
  itemId: string;
  buyerFirstName: string;
  buyerLastName: string;
  buyerMobile: string;
  branchId?: string | null;
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
      branchId: true,
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

  const requestedBranchId = (input.branchId ?? "").trim() || item.branchId;
  let branchId: string | null = null;
  if (requestedBranchId) {
    const branch = await prisma.branch.findFirst({
      where: {
        id: requestedBranchId,
        organizationId: input.organizationId,
        deletedAt: null,
        isActive: true,
      },
      select: { id: true },
    });
    if (!branch) {
      return { ok: false, error: "شعبه انتخاب‌شده معتبر نیست." };
    }
    branchId = branch.id;
  }

  if (!branchId) {
    const fallbackBranch = await prisma.branch.findFirst({
      where: {
        organizationId: input.organizationId,
        deletedAt: null,
        isActive: true,
      },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    branchId = fallbackBranch?.id ?? null;
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
          branchId,
          orderNumber,
          status: CommerceOrderStatus.AWAITING_PAYMENT,
          paymentStatus: CommerceOrderPaymentStatus.PENDING,
          opsStage: CommerceOpsStage.REGISTERED,
          buyerName: `${firstName} ${lastName}`.trim(),
          buyerMobile: mobile.normalized,
          subtotalRials: totals.subtotalRials,
          discountRials: totals.discountRials,
          taxRials: totals.taxRials,
          shippingRials: 0,
          grandTotalRials: totals.grandTotalRials,
          deliveryMethod: CommerceDeliveryMethod.PICKUP_ONSITE,
          fulfillmentStatus: null,
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

      await recordCommerceOrderEvent(tx, {
        organizationId: input.organizationId,
        orderId: order.id,
        eventType: CommerceOrderEventType.STAGE_CHANGED,
        stage: "REGISTERED",
        title: COMMERCE_OPS_ACTIVITY_TITLES.REGISTERED,
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
  opsStage: CommerceOpsStageValue;
  lastActivityTitle: string;
  lastActivityAt: Date;
  branch: CommerceBranchBadge | null;
  createdAt: Date;
  trackingCode: string | null;
  deliveredAt: Date | null;
  deliveredByName: string | null;
  notes: string | null;
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
  opsStage?: CommerceOpsStageValue | "";
  branchId?: string;
  /** Restrict to these branch ids (RBAC). `null` = all; empty array matches nothing. */
  allowedBranchIds?: readonly string[] | null;
  /** Shortcut: only PAID */
  paidOnly?: boolean;
  /** Shortcut: not DELIVERED (includes AWAITING_PICKUP / null) */
  undeliveredOnly?: boolean;
  /** Ready for student handover */
  readyForPickup?: boolean;
  /** Paid, waiting to enter production */
  waitingProduction?: boolean;
  /** Tehran calendar today */
  todayOnly?: boolean;
  deliveredOnly?: boolean;
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

function tehranTodayBounds(): { from: Date; to: Date } {
  const parts = getTehranParts(new Date());
  return {
    from: tehranLocalToUtc(parts.year, parts.month, parts.day, 0, 0, 0),
    to: tehranLocalToUtc(parts.year, parts.month, parts.day, 23, 59, 59),
  };
}

export function buildAdminCommerceOrderWhere(
  params: AdminCommerceOrderListFilters,
): Prisma.CommerceOrderWhereInput {
  const q = (params.q ?? "").trim();
  const buyerName = (params.buyerName ?? "").trim();
  const buyerMobile = (params.buyerMobile ?? "").trim();
  const productQuery = (params.productQuery ?? "").trim();
  const itemId = (params.itemId ?? "").trim();
  const branchId = (params.branchId ?? "").trim();
  let from = parseDateBound(params.dateFrom, false);
  let to = parseDateBound(params.dateTo, true);

  if (params.todayOnly) {
    const today = tehranTodayBounds();
    from = today.from;
    to = today.to;
  }

  const paymentStatus = params.paidOnly
    ? CommerceOrderPaymentStatus.PAID
    : params.paymentStatus || undefined;

  const where: Prisma.CommerceOrderWhereInput = {
    organizationId: params.organizationId,
  };

  if (paymentStatus) where.paymentStatus = paymentStatus;

  if (params.allowedBranchIds != null) {
    const allowed = [...params.allowedBranchIds];
    if (branchId) {
      where.branchId = allowed.includes(branchId) ? branchId : { in: [] };
    } else {
      where.branchId = { in: allowed };
    }
  } else if (branchId) {
    where.branchId = branchId;
  }

  const opsStage = isCommerceOpsStage(params.opsStage) ? params.opsStage : undefined;
  if (params.deliveredOnly) {
    where.opsStage = CommerceOpsStage.DELIVERED_TO_STUDENT;
  } else if (params.readyForPickup) {
    where.opsStage = CommerceOpsStage.READY_FOR_PICKUP;
  } else if (params.waitingProduction) {
    where.opsStage = CommerceOpsStage.PAID;
  } else if (opsStage) {
    where.opsStage = opsStage;
  } else if (params.undeliveredOnly) {
    where.opsStage = {
      not: CommerceOpsStage.DELIVERED_TO_STUDENT,
    };
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
      branch: {
        select: { id: true, name: true, slug: true, accentColor: true },
      },
      events: {
        orderBy: { occurredAt: "desc" },
        take: 1,
        select: { title: true, occurredAt: true, stage: true },
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
      opsStage: order.opsStage as CommerceOpsStageValue,
      lastActivityTitle:
        order.events[0]?.title ??
        COMMERCE_OPS_ACTIVITY_TITLES[order.opsStage as CommerceOpsStageValue],
      lastActivityAt: order.events[0]?.occurredAt ?? order.createdAt,
      branch: order.branch ? toCommerceBranchBadge(order.branch) : null,
      createdAt: order.createdAt,
      trackingCode: trackingByOrder.get(order.id) ?? null,
      deliveredAt: order.deliveredAt,
      deliveredByName: order.deliveredBy
        ? `${order.deliveredBy.firstName} ${order.deliveredBy.lastName}`.trim()
        : null,
      notes: order.notes,
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
  opsStage: CommerceOpsStageValue;
  branchName: string | null;
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
      branch: { select: { name: true } },
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
        opsStage: order.opsStage as CommerceOpsStageValue,
        branchName: order.branch?.name ?? null,
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
        opsStage: order.opsStage as CommerceOpsStageValue,
        branchName: order.branch?.name ?? null,
      });
    }
  }
  return rows;
}

export async function listCommerceBranchesForOps(params: {
  organizationId: string;
  allowedBranchIds?: readonly string[] | null;
}): Promise<CommerceBranchBadge[]> {
  const branches = await prisma.branch.findMany({
    where: {
      organizationId: params.organizationId,
      deletedAt: null,
      isActive: true,
      ...(params.allowedBranchIds != null
        ? { id: { in: [...params.allowedBranchIds] } }
        : {}),
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, accentColor: true },
  });
  return branches.map(toCommerceBranchBadge);
}

export type AdminCommerceOrderEventRow = {
  id: string;
  eventType: string;
  stage: CommerceOpsStageValue | null;
  title: string;
  note: string | null;
  occurredAt: Date;
  operatorName: string | null;
};

export type AdminCommerceOrderDetail = AdminCommerceOrderRow & {
  buyerEmail: string | null;
  deliveryNote: string | null;
  readyForPickupAt: Date | null;
  readyForPickupByName: string | null;
  paymentTrackingCode: string | null;
  paymentProvider: string | null;
  items: Array<{
    id: string;
    title: string;
    quantity: number;
    unitPriceRials: number;
    totalRials: number;
  }>;
  events: AdminCommerceOrderEventRow[];
};

function actorName(actor: { firstName: string; lastName: string } | null): string | null {
  if (!actor) return null;
  const name = `${actor.firstName} ${actor.lastName}`.trim();
  return name || null;
}

export async function getAdminCommerceOrderDetail(params: {
  organizationId: string;
  orderId: string;
  allowedBranchIds?: readonly string[] | null;
}): Promise<AdminCommerceOrderDetail | null> {
  const order = await prisma.commerceOrder.findFirst({
    where: {
      id: params.orderId,
      organizationId: params.organizationId,
      ...commerceAllowedBranchScope(params.allowedBranchIds),
    },
    include: {
      items: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          titleSnapshot: true,
          quantity: true,
          unitPriceRials: true,
          totalRials: true,
        },
      },
      branch: {
        select: { id: true, name: true, slug: true, accentColor: true },
      },
      deliveredBy: { select: { firstName: true, lastName: true } },
      readyForPickupBy: { select: { firstName: true, lastName: true } },
      events: {
        orderBy: { occurredAt: "asc" },
        include: {
          actor: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  if (!order) return null;

  const intent = await prisma.paymentIntent.findFirst({
    where: {
      organizationId: params.organizationId,
      payableType: "COMMERCE_ORDER",
      payableId: order.id,
    },
    orderBy: { updatedAt: "desc" },
    select: { trackingCode: true, provider: true },
  });

  const lastEvent = order.events[order.events.length - 1];
  const productTitle =
    order.items.length > 1
      ? order.items.map((item) => item.titleSnapshot).join("، ")
      : (order.items[0]?.titleSnapshot ?? "—");

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    buyerName: order.buyerName,
    buyerMobile: order.buyerMobile,
    buyerEmail: order.buyerEmail,
    productTitle,
    quantity: order.items.reduce((sum, item) => sum + item.quantity, 0) || 1,
    lineTotalRials: order.items[0]?.totalRials ?? order.grandTotalRials,
    grandTotalRials: order.grandTotalRials,
    paymentStatus: order.paymentStatus,
    fulfillmentStatus: order.fulfillmentStatus,
    opsStage: order.opsStage as CommerceOpsStageValue,
    lastActivityTitle:
      lastEvent?.title ??
      COMMERCE_OPS_ACTIVITY_TITLES[order.opsStage as CommerceOpsStageValue],
    lastActivityAt: lastEvent?.occurredAt ?? order.createdAt,
    branch: order.branch ? toCommerceBranchBadge(order.branch) : null,
    createdAt: order.createdAt,
    trackingCode: intent?.trackingCode ?? null,
    deliveredAt: order.deliveredAt,
    deliveredByName: actorName(order.deliveredBy),
    notes: order.notes,
    deliveryNote: order.deliveryNote,
    readyForPickupAt: order.readyForPickupAt,
    readyForPickupByName: actorName(order.readyForPickupBy),
    paymentTrackingCode: intent?.trackingCode ?? null,
    paymentProvider: intent?.provider ?? null,
    items: order.items.map((item) => ({
      id: item.id,
      title: item.titleSnapshot,
      quantity: item.quantity,
      unitPriceRials: item.unitPriceRials,
      totalRials: item.totalRials,
    })),
    events: order.events.map((event) => ({
      id: event.id,
      eventType: event.eventType,
      stage: event.stage as CommerceOpsStageValue | null,
      title: event.title,
      note: event.note,
      occurredAt: event.occurredAt,
      operatorName: actorName(event.actor),
    })),
  };
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
