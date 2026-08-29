/**
 * Pickup desk — load an order by QR token for one-scan handover.
 */

import { CommerceOpsStage, CommerceOrderPaymentStatus } from "@/generated/prisma/enums";
import {
  toCommerceBranchBadge,
  type CommerceBranchBadge,
} from "@/lib/commerce/branches";
import { commerceAllowedBranchScope } from "@/lib/commerce/orders/filters";
import {
  buildCommerceOpsIntelligence,
  type CommerceOpsHealthLevel,
  type CommerceOpsPriority,
} from "@/lib/commerce/orders/intelligence";
import { loadOrderOpsKpiCounts } from "@/lib/commerce/orders/kpis";
import { isCommercePickupBranchAllowed } from "@/lib/commerce/orders/pickup-scope";
import {
  COMMERCE_OPS_ACTIVITY_TITLES,
  type CommerceOpsStageValue,
} from "@/lib/commerce/orders/ops-stage";
import { loadStaffOpsDashboard } from "@/lib/commerce/orders/performance";
import { prisma } from "@/lib/prisma";
import {
  COMMERCE_STUDENT_GRADE_LABELS,
  COMMERCE_STUDENT_MAJOR_LABELS,
  isCommerceStudentGrade,
  isCommerceStudentMajor,
} from "@/lib/commerce/student-fields";

export type PickupOrderView = {
  id: string;
  qrToken: string;
  orderNumber: string;
  buyerName: string | null;
  buyerFirstName: string | null;
  buyerLastName: string | null;
  buyerMobile: string | null;
  buyerNationalCode: string | null;
  parentName: string | null;
  studentGrade: string | null;
  studentGradeLabel: string | null;
  studentMajorLabel: string | null;
  productTitle: string;
  instructor: string | null;
  quantity: number;
  grandTotalRials: number;
  paymentPaid: boolean;
  opsStage: CommerceOpsStageValue;
  lastActivityTitle: string;
  branch: CommerceBranchBadge | null;
  pickupBranch: CommerceBranchBadge | null;
  handoverStaffUserId: string | null;
  handoverStaffName: string | null;
  pickupSignedBy: string | null;
  pickupSignedAt: Date | null;
  deliveredAt: Date | null;
  deliveredByName: string | null;
  opsVip: boolean;
  urgentDelivery: boolean;
  priority: CommerceOpsPriority;
  delayed: boolean;
  delayKind: "production" | "ready" | null;
  healthScore: number;
  healthLevel: CommerceOpsHealthLevel;
  events: Array<{
    id: string;
    stage: CommerceOpsStageValue | null;
    title: string;
    note: string | null;
    occurredAt: Date;
    operatorName: string | null;
  }>;
};

export type PickupScanResult =
  | { status: "not_found" }
  | {
      status: "wrong_branch";
      orderNumber: string;
      destination: CommerceBranchBadge | null;
    }
  | { status: "ok"; order: PickupOrderView };

const BRANCH_SELECT = {
  id: true,
  name: true,
  slug: true,
  accentColor: true,
  address: true,
  bookletOpsKey: true,
} as const;

function mapPickupOrder(order: {
  id: string;
  qrToken: string;
  orderNumber: string;
  buyerName: string | null;
  buyerFirstName: string | null;
  buyerLastName: string | null;
  buyerMobile: string | null;
  buyerNationalCode: string | null;
  parentName: string | null;
  studentGrade: string | null;
  studentMajor: string | null;
  grandTotalRials: number;
  paymentStatus: CommerceOrderPaymentStatus;
  opsStage: CommerceOpsStage;
  pickupSignedBy: string | null;
  pickupSignedAt: Date | null;
  deliveredAt: Date | null;
  opsVip: boolean;
  urgentDelivery: boolean;
  preferredPickupAt: Date | null;
  inProductionAt: Date | null;
  readyForPickupAt: Date | null;
  handoverStaffUserId: string | null;
  items: Array<{
    titleSnapshot: string;
    quantity: number;
    item: { authors: string } | null;
  }>;
  branch: Parameters<typeof toCommerceBranchBadge>[0] | null;
  pickupBranch: Parameters<typeof toCommerceBranchBadge>[0] | null;
  handoverStaff: { firstName: string; lastName: string } | null;
  deliveredBy: { firstName: string; lastName: string } | null;
  events: Array<{
    id: string;
    stage: CommerceOpsStage | null;
    title: string;
    note: string | null;
    occurredAt: Date;
    eventType: string;
    actor: { firstName: string; lastName: string } | null;
  }>;
}): PickupOrderView {
  const productTitle =
    order.items.length > 1
      ? order.items.map((item) => item.titleSnapshot).join("، ")
      : (order.items[0]?.titleSnapshot ?? "—");
  const instructor =
    order.items
      .map((item) => item.item?.authors?.trim())
      .filter((value): value is string => Boolean(value))
      .join("، ") || null;
  const rollbackCount = order.events.filter((event) => event.eventType === "ROLLBACK").length;
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
  const actorName = (actor: { firstName: string; lastName: string } | null) =>
    actor ? `${actor.firstName} ${actor.lastName}`.trim() || null : null;

  return {
    id: order.id,
    qrToken: order.qrToken,
    orderNumber: order.orderNumber,
    buyerName: order.buyerName,
    buyerFirstName: order.buyerFirstName,
    buyerLastName: order.buyerLastName,
    buyerMobile: order.buyerMobile,
    buyerNationalCode: order.buyerNationalCode,
    parentName: order.parentName,
    studentGrade: order.studentGrade,
    studentGradeLabel: isCommerceStudentGrade(order.studentGrade)
      ? COMMERCE_STUDENT_GRADE_LABELS[order.studentGrade]
      : null,
    studentMajorLabel: isCommerceStudentMajor(order.studentMajor)
      ? COMMERCE_STUDENT_MAJOR_LABELS[order.studentMajor]
      : null,
    productTitle,
    instructor,
    quantity: order.items.reduce((sum, item) => sum + item.quantity, 0) || 1,
    grandTotalRials: order.grandTotalRials,
    paymentPaid: order.paymentStatus === CommerceOrderPaymentStatus.PAID,
    opsStage: order.opsStage as CommerceOpsStageValue,
    lastActivityTitle:
      order.events[0]?.title ??
      COMMERCE_OPS_ACTIVITY_TITLES[order.opsStage as CommerceOpsStageValue],
    branch: order.branch ? toCommerceBranchBadge(order.branch) : null,
    pickupBranch: order.pickupBranch ? toCommerceBranchBadge(order.pickupBranch) : null,
    handoverStaffUserId: order.handoverStaffUserId,
    handoverStaffName: actorName(order.handoverStaff),
    pickupSignedBy: order.pickupSignedBy,
    pickupSignedAt: order.pickupSignedAt,
    deliveredAt: order.deliveredAt,
    deliveredByName: actorName(order.deliveredBy),
    opsVip: order.opsVip,
    urgentDelivery: order.urgentDelivery,
    priority: intel.priority,
    delayed: intel.delayed,
    delayKind: intel.delayKind,
    healthScore: intel.healthScore,
    healthLevel: intel.healthLevel,
    events: [...order.events]
      .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime())
      .map((event) => ({
        id: event.id,
        stage: event.stage as CommerceOpsStageValue | null,
        title: event.title,
        note: event.note,
        occurredAt: event.occurredAt,
        operatorName: actorName(event.actor),
      })),
  };
}

const PICKUP_INCLUDE = {
  items: {
    orderBy: { createdAt: "asc" as const },
    select: {
      titleSnapshot: true,
      quantity: true,
      item: { select: { authors: true } },
    },
  },
  branch: { select: BRANCH_SELECT },
  pickupBranch: { select: BRANCH_SELECT },
  handoverStaff: { select: { firstName: true, lastName: true } },
  deliveredBy: { select: { firstName: true, lastName: true } },
  events: {
    orderBy: { occurredAt: "desc" as const },
    take: 40,
    select: {
      id: true,
      stage: true,
      title: true,
      note: true,
      occurredAt: true,
      eventType: true,
      actor: { select: { firstName: true, lastName: true } },
    },
  },
} as const;

export async function getCommerceOrderByQrToken(params: {
  organizationId: string;
  token: string;
  allowedBranchIds?: readonly string[] | null;
}): Promise<PickupOrderView | null> {
  const result = await resolveCommercePickupScan(params);
  return result.status === "ok" ? result.order : null;
}

export async function resolveCommercePickupScan(params: {
  organizationId: string;
  token: string;
  allowedBranchIds?: readonly string[] | null;
}): Promise<PickupScanResult> {
  const token = params.token.trim();
  if (!token) return { status: "not_found" };

  const order = await prisma.commerceOrder.findFirst({
    where: {
      organizationId: params.organizationId,
      qrToken: token,
    },
    include: PICKUP_INCLUDE,
  });
  if (!order) return { status: "not_found" };

  if (
    !isCommercePickupBranchAllowed({
      pickupBranchId: order.pickupBranchId,
      catalogBranchId: order.branchId,
      allowedBranchIds: params.allowedBranchIds,
    })
  ) {
    return {
      status: "wrong_branch",
      orderNumber: order.orderNumber,
      destination: order.pickupBranch
        ? toCommerceBranchBadge(order.pickupBranch)
        : order.branch
          ? toCommerceBranchBadge(order.branch)
          : null,
    };
  }

  return { status: "ok", order: mapPickupOrder(order) };
}

export type PickupDeskStats = {
  ready: number;
  deliveredToday: number;
  waitingProduction: number;
  vip: number;
  delayed: number;
  todayDeliveries: number;
  avgDeliveryMinutes: number | null;
};

export async function loadPickupDeskStats(params: {
  organizationId: string;
  userId: string;
  allowedBranchIds?: readonly string[] | null;
}): Promise<PickupDeskStats> {
  const scope = {
    organizationId: params.organizationId,
    ...commerceAllowedBranchScope(params.allowedBranchIds),
  };
  const [kpis, waitingProduction, vip, staff] = await Promise.all([
    loadOrderOpsKpiCounts({
      organizationId: params.organizationId,
      allowedBranchIds: params.allowedBranchIds,
    }),
    prisma.commerceOrder.count({
      where: { AND: [scope, { opsStage: CommerceOpsStage.PAID }] },
    }),
    prisma.commerceOrder.count({
      where: {
        AND: [
          scope,
          { opsVip: true },
          { opsStage: { not: CommerceOpsStage.DELIVERED_TO_STUDENT } },
        ],
      },
    }),
    loadStaffOpsDashboard(params),
  ]);
  return {
    ready: kpis.ready,
    deliveredToday: kpis.deliveredToday,
    waitingProduction,
    vip,
    delayed: kpis.delayed,
    todayDeliveries: staff.completedToday,
    avgDeliveryMinutes: staff.avgDeliveryMinutes,
  };
}
