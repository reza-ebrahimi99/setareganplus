/**
 * Pickup desk — load an order by QR token for one-scan handover.
 */

import { CommerceOrderPaymentStatus } from "@/generated/prisma/enums";
import {
  toCommerceBranchBadge,
  type CommerceBranchBadge,
} from "@/lib/commerce/branches";
import { commerceAllowedBranchScope } from "@/lib/commerce/orders/filters";
import {
  COMMERCE_OPS_ACTIVITY_TITLES,
  type CommerceOpsStageValue,
} from "@/lib/commerce/orders/ops-stage";
import { prisma } from "@/lib/prisma";
import {
  COMMERCE_STUDENT_GRADE_LABELS,
  COMMERCE_STUDENT_MAJOR_LABELS,
} from "@/lib/commerce/student-fields";

export type PickupOrderView = {
  id: string;
  qrToken: string;
  orderNumber: string;
  buyerName: string | null;
  buyerMobile: string | null;
  parentName: string | null;
  studentGradeLabel: string | null;
  studentMajorLabel: string | null;
  productTitle: string;
  grandTotalRials: number;
  paymentPaid: boolean;
  opsStage: CommerceOpsStageValue;
  lastActivityTitle: string;
  branch: CommerceBranchBadge | null;
  pickupBranch: CommerceBranchBadge | null;
  handoverStaffUserId: string | null;
  handoverStaffName: string | null;
  pickupSignedBy: string | null;
};

export async function getCommerceOrderByQrToken(params: {
  organizationId: string;
  token: string;
  allowedBranchIds?: readonly string[] | null;
}): Promise<PickupOrderView | null> {
  const token = params.token.trim();
  if (!token) return null;

  const order = await prisma.commerceOrder.findFirst({
    where: {
      organizationId: params.organizationId,
      qrToken: token,
      ...commerceAllowedBranchScope(params.allowedBranchIds),
    },
    include: {
      items: {
        orderBy: { createdAt: "asc" },
        select: { titleSnapshot: true },
      },
      branch: {
        select: {
          id: true,
          name: true,
          slug: true,
          accentColor: true,
          address: true,
          bookletOpsKey: true,
        },
      },
      pickupBranch: {
        select: {
          id: true,
          name: true,
          slug: true,
          accentColor: true,
          address: true,
          bookletOpsKey: true,
        },
      },
      handoverStaff: { select: { firstName: true, lastName: true } },
      events: {
        orderBy: { occurredAt: "desc" },
        take: 1,
        select: { title: true },
      },
    },
  });
  if (!order) return null;

  const productTitle =
    order.items.length > 1
      ? order.items.map((item) => item.titleSnapshot).join("، ")
      : (order.items[0]?.titleSnapshot ?? "—");

  return {
    id: order.id,
    qrToken: order.qrToken,
    orderNumber: order.orderNumber,
    buyerName: order.buyerName,
    buyerMobile: order.buyerMobile,
    parentName: order.parentName,
    studentGradeLabel: order.studentGrade
      ? COMMERCE_STUDENT_GRADE_LABELS[order.studentGrade]
      : null,
    studentMajorLabel: order.studentMajor
      ? COMMERCE_STUDENT_MAJOR_LABELS[order.studentMajor]
      : null,
    productTitle,
    grandTotalRials: order.grandTotalRials,
    paymentPaid: order.paymentStatus === CommerceOrderPaymentStatus.PAID,
    opsStage: order.opsStage as CommerceOpsStageValue,
    lastActivityTitle:
      order.events[0]?.title ??
      COMMERCE_OPS_ACTIVITY_TITLES[order.opsStage as CommerceOpsStageValue],
    branch: order.branch ? toCommerceBranchBadge(order.branch) : null,
    pickupBranch: order.pickupBranch
      ? toCommerceBranchBadge(order.pickupBranch)
      : null,
    handoverStaffUserId: order.handoverStaffUserId,
    handoverStaffName: order.handoverStaff
      ? `${order.handoverStaff.firstName} ${order.handoverStaff.lastName}`.trim()
      : null,
    pickupSignedBy: order.pickupSignedBy,
  };
}
