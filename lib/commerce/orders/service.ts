/**
 * Single-item commerce order create + fulfillment helpers.
 */

import type { Prisma } from "@/generated/prisma/client";
import {
  CommerceAcquisitionSource,
  CommerceBookletPaymentMethod,
  CommerceDeliveryMethod,
  CommerceFulfillmentStatus,
  CommerceItemStatus,
  CommerceOpsStage,
  CommerceOrderEventType,
  CommerceOrderPaymentStatus,
  CommerceOrderStatus,
  CommerceStudentGrade,
  CommerceStudentMajor,
  CommerceSystemKind,
} from "@/generated/prisma/enums";
import {
  toCommerceBranchBadge,
  type CommerceBranchBadge,
} from "@/lib/commerce/branches";
import { tehranPresetBounds } from "@/lib/commerce/orders/date-range";
import { commerceAllowedBranchScope } from "@/lib/commerce/orders/filters";
import {
  buildCommerceOpsIntelligence,
  COMMERCE_OPS_PRIORITY_RANK,
  PRODUCTION_DELAY_MS,
  READY_DELAY_MS,
  type CommerceOpsHealthLevel,
  type CommerceOpsPriority,
} from "@/lib/commerce/orders/intelligence";
import { listCommerceOrderSmsHistory } from "@/lib/commerce/commerce-sms";
import { notifyCommerceOpsStaff } from "@/lib/commerce/orders/notify";
import {
  COMMERCE_OPS_ACTIVITY_TITLES,
  isCommerceOpsStage,
  type CommerceOpsStageValue,
} from "@/lib/commerce/orders/ops-stage";
import { parseCommerceOrderQrInput } from "@/lib/commerce/orders/qr";
import { parseBookletOrderProfile } from "@/lib/commerce/orders/profile";
import { recordCommerceOrderEvent } from "@/lib/commerce/orders/timeline";
import { resolveCommercePrice } from "@/lib/commerce/pricing";
import {
  buildCommerceOrderNumber,
  calculateOrderTotals,
} from "@/lib/commerce/orders/totals";
import { prisma } from "@/lib/prisma";
import {
  COMMERCE_ACQUISITION_SOURCE_LABELS,
  COMMERCE_BOOKLET_PAYMENT_METHOD_LABELS,
  COMMERCE_STUDENT_GRADE_LABELS,
  COMMERCE_STUDENT_MAJOR_LABELS,
} from "@/lib/commerce/student-fields";

export type CreateSingleItemOrderInput = {
  organizationId: string;
  itemId: string;
  buyerFirstName: string;
  buyerLastName: string;
  buyerMobile: string;
  pickupBranchId?: string | null;
  /** Legacy alias for pickupBranchId (shop checkout used branchId as delivery). */
  branchId?: string | null;
  orderBranchId?: string | null;
  parentName?: string | null;
  buyerNationalCode?: string | null;
  studentGrade?: string | null;
  studentMajor?: string | null;
  notes?: string | null;
  specialNotes?: string | null;
  urgentDelivery?: boolean | string | null;
  preferredPickupAt?: string | Date | null;
  acquisitionSource?: string | null;
  referredBy?: string | null;
  discountCode?: string | null;
  bookletPaymentMethod?: string | null;
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
  const parsed = parseBookletOrderProfile(input);
  if (!parsed.ok) return parsed;
  const profile = parsed.profile;

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

  const pickup = await prisma.branch.findFirst({
    where: {
      id: profile.pickupBranchId,
      organizationId: input.organizationId,
      deletedAt: null,
      isActive: true,
    },
    select: { id: true },
  });
  if (!pickup) {
    return { ok: false, error: "محل دریافت جزوه معتبر نیست." };
  }

  const requestedOrderBranchId =
    (input.orderBranchId ?? "").trim() || item.branchId || pickup.id;
  const orderBranch = await prisma.branch.findFirst({
    where: {
      id: requestedOrderBranchId,
      organizationId: input.organizationId,
      deletedAt: null,
      isActive: true,
    },
    select: { id: true },
  });
  if (!orderBranch) {
    return { ok: false, error: "شعبه محصول معتبر نیست." };
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
          branchId: orderBranch.id,
          pickupBranchId: pickup.id,
          orderNumber,
          status: CommerceOrderStatus.AWAITING_PAYMENT,
          paymentStatus: CommerceOrderPaymentStatus.PENDING,
          opsStage: CommerceOpsStage.REGISTERED,
          buyerName: profile.buyerName,
          buyerFirstName: profile.buyerFirstName,
          buyerLastName: profile.buyerLastName,
          parentName: profile.parentName,
          buyerMobile: profile.buyerMobile,
          buyerNationalCode: profile.buyerNationalCode,
          studentGrade: profile.studentGrade as CommerceStudentGrade,
          studentMajor: profile.studentMajor
            ? (profile.studentMajor as CommerceStudentMajor)
            : null,
          acquisitionSource: profile.acquisitionSource
            ? (profile.acquisitionSource as CommerceAcquisitionSource)
            : null,
          referredBy: profile.referredBy,
          discountCode: profile.discountCode,
          bookletPaymentMethod: profile.bookletPaymentMethod
            ? (profile.bookletPaymentMethod as CommerceBookletPaymentMethod)
            : null,
          urgentDelivery: profile.urgentDelivery,
          preferredPickupAt: profile.preferredPickupAt,
          notes: profile.notes,
          specialNotes: profile.specialNotes,
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

    void notifyCommerceOpsStaff({
      organizationId: input.organizationId,
      orderId: created.id,
      kind: "NEW_ORDER",
      body: profile.buyerName,
    }).catch((error) => console.error("[commerce-ops] notify failed", error));

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
  buyerFirstName: string | null;
  buyerLastName: string | null;
  parentName: string | null;
  buyerMobile: string | null;
  buyerNationalCode: string | null;
  studentGrade: string | null;
  studentGradeLabel: string | null;
  studentMajor: string | null;
  studentMajorLabel: string | null;
  productTitle: string;
  quantity: number;
  lineTotalRials: number;
  grandTotalRials: number;
  paymentStatus: CommerceOrderPaymentStatus;
  fulfillmentStatus: CommerceFulfillmentStatus | null;
  opsStage: CommerceOpsStageValue;
  lastActivityTitle: string;
  lastActivityAt: Date;
  lastActivityIsRollback: boolean;
  branch: CommerceBranchBadge | null;
  pickupBranch: CommerceBranchBadge | null;
  createdAt: Date;
  trackingCode: string | null;
  deliveredAt: Date | null;
  deliveredByName: string | null;
  handoverStaffUserId: string | null;
  handoverStaffName: string | null;
  urgentDelivery: boolean;
  opsVip: boolean;
  qrToken: string;
  inProductionAt: Date | null;
  readyForPickupAt: Date | null;
  preferredPickupAt: Date | null;
  rollbackCount: number;
  priority: CommerceOpsPriority;
  delayed: boolean;
  delayKind: "production" | "ready" | null;
  healthScore: number;
  healthLevel: CommerceOpsHealthLevel;
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
  pickupBranchId?: string;
  studentGrade?: string;
  studentMajor?: string;
  handoverStaffUserId?: string;
  /** Restrict to these branch ids (RBAC). `null` = all; empty array matches nothing. */
  allowedBranchIds?: readonly string[] | null;
  paidOnly?: boolean;
  undeliveredOnly?: boolean;
  readyForPickup?: boolean;
  waitingProduction?: boolean;
  datePreset?: "today" | "yesterday" | "thisWeek" | "thisMonth" | "";
  todayOnly?: boolean;
  deliveredOnly?: boolean;
  deliveredToday?: boolean;
  delayedOnly?: boolean;
  mine?: boolean;
  mineUserId?: string;
  opsVipOnly?: boolean;
  sort?: "priority" | "createdAt";
  dateFrom?: string;
  dateTo?: string;
  orderIds?: readonly string[];
  take?: number;
};

function parseDateBound(raw: string | undefined, endOfDay: boolean): Date | null {
  const value = (raw ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(
    Date.UTC(y, m - 1, d, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0),
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

const BRANCH_SELECT = {
  id: true,
  name: true,
  slug: true,
  accentColor: true,
  address: true,
  bookletOpsKey: true,
} as const;

export function buildAdminCommerceOrderWhere(
  params: AdminCommerceOrderListFilters,
): Prisma.CommerceOrderWhereInput {
  const q = (params.q ?? "").trim();
  const buyerName = (params.buyerName ?? "").trim();
  const buyerMobile = (params.buyerMobile ?? "").trim();
  const productQuery = (params.productQuery ?? "").trim();
  const itemId = (params.itemId ?? "").trim();
  const branchId = (params.branchId ?? "").trim();
  const pickupBranchId = (params.pickupBranchId ?? "").trim();
  const studentGrade = (params.studentGrade ?? "").trim();
  const studentMajor = (params.studentMajor ?? "").trim();
  const handoverStaffUserId = (params.handoverStaffUserId ?? "").trim();

  let from = parseDateBound(params.dateFrom, false);
  let to = parseDateBound(params.dateTo, true);
  const preset = params.datePreset || (params.todayOnly ? "today" : "");
  if (preset === "today" || preset === "yesterday" || preset === "thisWeek" || preset === "thisMonth") {
    const bounds = tehranPresetBounds(preset);
    from = bounds.from;
    to = bounds.to;
  }

  const paymentStatus = params.paidOnly
    ? CommerceOrderPaymentStatus.PAID
    : params.paymentStatus || undefined;

  const and: Prisma.CommerceOrderWhereInput[] = [
    { organizationId: params.organizationId },
  ];

  const scope = commerceAllowedBranchScope(params.allowedBranchIds);
  if (Object.keys(scope).length > 0) {
    and.push(scope);
  }

  if (paymentStatus) and.push({ paymentStatus });

  if (branchId) {
    if (params.allowedBranchIds != null && !params.allowedBranchIds.includes(branchId)) {
      and.push({ id: { in: [] } });
    } else {
      and.push({ branchId });
    }
  }

  if (pickupBranchId) {
    if (
      params.allowedBranchIds != null &&
      !params.allowedBranchIds.includes(pickupBranchId)
    ) {
      and.push({ id: { in: [] } });
    } else {
      and.push({ pickupBranchId });
    }
  }

  const opsStage = isCommerceOpsStage(params.opsStage) ? params.opsStage : undefined;
  if (params.deliveredToday) {
    const today = tehranPresetBounds("today");
    and.push({
      opsStage: CommerceOpsStage.DELIVERED_TO_STUDENT,
      deliveredAt: { gte: today.from, lte: today.to },
    });
  } else if (params.deliveredOnly) {
    and.push({ opsStage: CommerceOpsStage.DELIVERED_TO_STUDENT });
  } else if (params.readyForPickup) {
    and.push({ opsStage: CommerceOpsStage.READY_FOR_PICKUP });
  } else if (params.waitingProduction) {
    and.push({ opsStage: CommerceOpsStage.PAID });
  } else if (opsStage) {
    and.push({ opsStage });
  } else if (params.undeliveredOnly) {
    and.push({ opsStage: { not: CommerceOpsStage.DELIVERED_TO_STUDENT } });
  } else if (params.fulfillmentStatus) {
    and.push({ fulfillmentStatus: params.fulfillmentStatus });
  }

  if (from || to) {
    and.push({
      createdAt: {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      },
    });
  }

  if (buyerName) {
    and.push({
      OR: [
        { buyerName: { contains: buyerName, mode: "insensitive" } },
        { buyerFirstName: { contains: buyerName, mode: "insensitive" } },
        { buyerLastName: { contains: buyerName, mode: "insensitive" } },
        { parentName: { contains: buyerName, mode: "insensitive" } },
      ],
    });
  }
  if (buyerMobile) {
    and.push({ buyerMobile: { contains: buyerMobile } });
  }
  if (studentGrade) {
    and.push({ studentGrade: studentGrade as CommerceStudentGrade });
  }
  if (studentMajor) {
    and.push({ studentMajor: studentMajor as CommerceStudentMajor });
  }
  if (handoverStaffUserId) {
    and.push({ handoverStaffUserId });
  }
  if (params.mineUserId) {
    and.push({
      OR: [
        { handoverStaffUserId: params.mineUserId },
        { readyForPickupByUserId: params.mineUserId },
        { deliveredByUserId: params.mineUserId },
      ],
    });
  }
  if (params.opsVipOnly) {
    and.push({ opsVip: true });
  }
  if (params.orderIds && params.orderIds.length > 0) {
    and.push({ id: { in: [...params.orderIds].slice(0, 200) } });
  }
  if (params.delayedOnly) {
    const productionCutoff = new Date(Date.now() - PRODUCTION_DELAY_MS);
    const readyCutoff = new Date(Date.now() - READY_DELAY_MS);
    and.push({
      OR: [
        {
          opsStage: CommerceOpsStage.IN_PRODUCTION,
          inProductionAt: { lte: productionCutoff },
        },
        {
          opsStage: CommerceOpsStage.READY_FOR_PICKUP,
          readyForPickupAt: { lte: readyCutoff },
        },
      ],
    });
  }

  if (itemId || productQuery) {
    and.push({
      items: {
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
      },
    });
  }

  if (q) {
    const tokenFromLink = parseCommerceOrderQrInput(q);
    and.push({
      OR: [
        { orderNumber: { contains: q, mode: "insensitive" } },
        { buyerName: { contains: q, mode: "insensitive" } },
        { buyerFirstName: { contains: q, mode: "insensitive" } },
        { buyerLastName: { contains: q, mode: "insensitive" } },
        { parentName: { contains: q, mode: "insensitive" } },
        { buyerMobile: { contains: q } },
        { buyerNationalCode: { contains: q } },
        { qrToken: { contains: q, mode: "insensitive" } },
        ...(tokenFromLink ? [{ qrToken: tokenFromLink }] : []),
        { branch: { name: { contains: q, mode: "insensitive" } } },
        { pickupBranch: { name: { contains: q, mode: "insensitive" } } },
        {
          items: {
            some: {
              titleSnapshot: { contains: q, mode: "insensitive" },
            },
          },
        },
      ],
    });
  }

  return { AND: and };
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
      handoverStaff: {
        select: { firstName: true, lastName: true },
      },
      branch: {
        select: BRANCH_SELECT,
      },
      pickupBranch: {
        select: BRANCH_SELECT,
      },
      events: {
        orderBy: { occurredAt: "desc" },
        take: 1,
        select: { title: true, occurredAt: true, stage: true, eventType: true },
      },
      _count: {
        select: {
          events: { where: { eventType: CommerceOrderEventType.ROLLBACK } },
        },
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

  const rows = orders.map((order) => {
    const first = order.items[0];
    const productTitle =
      order.items.length > 1
        ? order.items.map((i) => i.titleSnapshot).join("، ")
        : (first?.titleSnapshot ?? "—");
    const quantity = order.items.reduce((sum, i) => sum + i.quantity, 0);
    const intel = buildCommerceOpsIntelligence({
      opsStage: order.opsStage as CommerceOpsStageValue,
      paymentPaid: order.paymentStatus === CommerceOrderPaymentStatus.PAID,
      urgentDelivery: order.urgentDelivery,
      opsVip: order.opsVip,
      preferredPickupAt: order.preferredPickupAt,
      inProductionAt: order.inProductionAt,
      readyForPickupAt: order.readyForPickupAt,
      rollbackCount: order._count.events,
    });
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      buyerName: order.buyerName,
      buyerFirstName: order.buyerFirstName,
      buyerLastName: order.buyerLastName,
      parentName: order.parentName,
      buyerMobile: order.buyerMobile,
      buyerNationalCode: order.buyerNationalCode,
      studentGrade: order.studentGrade,
      studentGradeLabel: order.studentGrade
        ? COMMERCE_STUDENT_GRADE_LABELS[order.studentGrade]
        : null,
      studentMajor: order.studentMajor,
      studentMajorLabel: order.studentMajor
        ? COMMERCE_STUDENT_MAJOR_LABELS[order.studentMajor]
        : null,
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
      lastActivityIsRollback: order.events[0]?.eventType === CommerceOrderEventType.ROLLBACK,
      branch: order.branch ? toCommerceBranchBadge(order.branch) : null,
      pickupBranch: order.pickupBranch ? toCommerceBranchBadge(order.pickupBranch) : null,
      createdAt: order.createdAt,
      trackingCode: trackingByOrder.get(order.id) ?? null,
      deliveredAt: order.deliveredAt,
      deliveredByName: order.deliveredBy
        ? `${order.deliveredBy.firstName} ${order.deliveredBy.lastName}`.trim()
        : null,
      handoverStaffUserId: order.handoverStaffUserId,
      handoverStaffName: order.handoverStaff
        ? `${order.handoverStaff.firstName} ${order.handoverStaff.lastName}`.trim()
        : null,
      urgentDelivery: order.urgentDelivery,
      opsVip: order.opsVip,
      qrToken: order.qrToken,
      inProductionAt: order.inProductionAt,
      readyForPickupAt: order.readyForPickupAt,
      preferredPickupAt: order.preferredPickupAt,
      rollbackCount: order._count.events,
      priority: intel.priority,
      delayed: intel.delayed,
      delayKind: intel.delayKind,
      healthScore: intel.healthScore,
      healthLevel: intel.healthLevel,
      notes: order.notes,
    };
  });

  if (params.sort === "priority") {
    rows.sort(
      (a, b) =>
        COMMERCE_OPS_PRIORITY_RANK[a.priority] - COMMERCE_OPS_PRIORITY_RANK[b.priority] ||
        Number(b.delayed) - Number(a.delayed) ||
        b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }
  return rows;
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
  pickupBranchName: string | null;
  studentGradeLabel: string | null;
  studentMajorLabel: string | null;
  handoverStaffName: string | null;
  deliveredAt: Date | null;
  qrToken: string | null;
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
      pickupBranch: { select: { name: true } },
      handoverStaff: { select: { firstName: true, lastName: true } },
    },
  });

  const rows: AdminCommerceOrderExportRow[] = [];
  for (const order of orders) {
    const handoverStaffName = order.handoverStaff
      ? `${order.handoverStaff.firstName} ${order.handoverStaff.lastName}`.trim()
      : null;
    const studentGradeLabel = order.studentGrade
      ? COMMERCE_STUDENT_GRADE_LABELS[order.studentGrade]
      : null;
    const studentMajorLabel = order.studentMajor
      ? COMMERCE_STUDENT_MAJOR_LABELS[order.studentMajor]
      : null;
    const base = {
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      buyerName: order.buyerName,
      buyerMobile: order.buyerMobile,
      paymentStatus: order.paymentStatus,
      fulfillmentStatus: order.fulfillmentStatus,
      opsStage: order.opsStage as CommerceOpsStageValue,
      branchName: order.branch?.name ?? null,
      pickupBranchName: order.pickupBranch?.name ?? null,
      studentGradeLabel,
      studentMajorLabel,
      handoverStaffName,
      deliveredAt: order.deliveredAt,
      qrToken: order.qrToken,
    };
    if (order.items.length === 0) {
      rows.push({
        ...base,
        productTitle: "—",
        quantity: 0,
        amountRials: order.grandTotalRials,
      });
      continue;
    }
    for (const item of order.items) {
      rows.push({
        ...base,
        productTitle: item.titleSnapshot,
        quantity: item.quantity,
        amountRials: item.totalRials,
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
      bookletOpsKey: { not: null },
      ...(params.allowedBranchIds != null
        ? { id: { in: [...params.allowedBranchIds] } }
        : {}),
    },
    orderBy: { bookletOpsKey: "asc" },
    select: BRANCH_SELECT,
  });
  if (branches.length > 0) {
    const rank: Record<string, number> = { BOYS: 0, GIRLS: 1, ELEMENTARY: 2 };
    return branches
      .map(toCommerceBranchBadge)
      .sort(
        (a, b) =>
          (rank[a.bookletOpsKey ?? ""] ?? 9) - (rank[b.bookletOpsKey ?? ""] ?? 9),
      );
  }
  const fallback = await prisma.branch.findMany({
    where: {
      organizationId: params.organizationId,
      deletedAt: null,
      isActive: true,
      ...(params.allowedBranchIds != null
        ? { id: { in: [...params.allowedBranchIds] } }
        : {}),
    },
    orderBy: { name: "asc" },
    select: BRANCH_SELECT,
  });
  return fallback.map(toCommerceBranchBadge);
}

export type CommerceItemOption = {
  id: string;
  title: string;
  branchId: string | null;
};

export async function listCommerceItemOptionsForOps(
  organizationId: string,
): Promise<CommerceItemOption[]> {
  return prisma.commerceItem.findMany({
    where: {
      organizationId,
      deletedAt: null,
      isVisible: true,
      status: CommerceItemStatus.ACTIVE,
    },
    orderBy: { title: "asc" },
    take: 300,
    select: { id: true, title: true, branchId: true },
  });
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
  specialNotes: string | null;
  referredBy: string | null;
  discountCode: string | null;
  acquisitionSource: string | null;
  acquisitionSourceLabel: string | null;
  bookletPaymentMethod: string | null;
  bookletPaymentMethodLabel: string | null;
  preferredPickupAt: Date | null;
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
  smsHistory: import("@/lib/commerce/commerce-sms").CommerceOrderSmsHistoryItem[];
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
        select: BRANCH_SELECT,
      },
      pickupBranch: {
        select: BRANCH_SELECT,
      },
      deliveredBy: { select: { firstName: true, lastName: true } },
      readyForPickupBy: { select: { firstName: true, lastName: true } },
      handoverStaff: { select: { firstName: true, lastName: true } },
      events: {
        orderBy: { occurredAt: "asc" },
        include: {
          actor: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  if (!order) return null;

  const [intent, smsHistory] = await Promise.all([
    prisma.paymentIntent.findFirst({
      where: {
        organizationId: params.organizationId,
        payableType: "COMMERCE_ORDER",
        payableId: order.id,
      },
      orderBy: { updatedAt: "desc" },
      select: { trackingCode: true, provider: true },
    }),
    listCommerceOrderSmsHistory({
      organizationId: params.organizationId,
      orderId: order.id,
    }),
  ]);

  const lastEvent = order.events[order.events.length - 1];
  const productTitle =
    order.items.length > 1
      ? order.items.map((item) => item.titleSnapshot).join("، ")
      : (order.items[0]?.titleSnapshot ?? "—");
  const rollbackCount = order.events.filter(
    (event) => event.eventType === CommerceOrderEventType.ROLLBACK,
  ).length;
  const intel = buildCommerceOpsIntelligence({
    opsStage: order.opsStage as CommerceOpsStageValue,
    paymentPaid: order.paymentStatus === CommerceOrderPaymentStatus.PAID,
    urgentDelivery: order.urgentDelivery,
    opsVip: order.opsVip,
    preferredPickupAt: order.preferredPickupAt,
    inProductionAt: order.inProductionAt,
    readyForPickupAt: order.readyForPickupAt,
    rollbackCount,
  });

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    buyerName: order.buyerName,
    buyerFirstName: order.buyerFirstName,
    buyerLastName: order.buyerLastName,
    parentName: order.parentName,
    buyerMobile: order.buyerMobile,
    buyerNationalCode: order.buyerNationalCode,
    studentGrade: order.studentGrade,
    studentGradeLabel: order.studentGrade
      ? COMMERCE_STUDENT_GRADE_LABELS[order.studentGrade]
      : null,
    studentMajor: order.studentMajor,
    studentMajorLabel: order.studentMajor
      ? COMMERCE_STUDENT_MAJOR_LABELS[order.studentMajor]
      : null,
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
    lastActivityIsRollback: lastEvent?.eventType === CommerceOrderEventType.ROLLBACK,
    branch: order.branch ? toCommerceBranchBadge(order.branch) : null,
    pickupBranch: order.pickupBranch ? toCommerceBranchBadge(order.pickupBranch) : null,
    createdAt: order.createdAt,
    trackingCode: intent?.trackingCode ?? null,
    deliveredAt: order.deliveredAt,
    deliveredByName: actorName(order.deliveredBy),
    handoverStaffUserId: order.handoverStaffUserId,
    handoverStaffName: actorName(order.handoverStaff),
    urgentDelivery: order.urgentDelivery,
    opsVip: order.opsVip,
    qrToken: order.qrToken,
    inProductionAt: order.inProductionAt,
    rollbackCount,
    priority: intel.priority,
    delayed: intel.delayed,
    delayKind: intel.delayKind,
    healthScore: intel.healthScore,
    healthLevel: intel.healthLevel,
    notes: order.notes,
    deliveryNote: order.deliveryNote,
    specialNotes: order.specialNotes,
    referredBy: order.referredBy,
    discountCode: order.discountCode,
    acquisitionSource: order.acquisitionSource,
    acquisitionSourceLabel: order.acquisitionSource
      ? COMMERCE_ACQUISITION_SOURCE_LABELS[order.acquisitionSource]
      : null,
    bookletPaymentMethod: order.bookletPaymentMethod,
    bookletPaymentMethodLabel: order.bookletPaymentMethod
      ? COMMERCE_BOOKLET_PAYMENT_METHOD_LABELS[order.bookletPaymentMethod]
      : null,
    preferredPickupAt: order.preferredPickupAt,
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
    smsHistory,
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
