/**
 * Public booklet ticket — capability URL keyed only by qrToken.
 * No PII in the token; order fields are resolved server-side.
 */

import { CommerceOrderPaymentStatus, PaymentStatus } from "@/generated/prisma/enums";
import { BOOKLET_PICKUP_HOURS, BOOKLET_PICKUP_INSTRUCTIONS } from "@/lib/commerce/booklet-hours";
import {
  toCommerceBranchBadge,
  type CommerceBranchBadge,
} from "@/lib/commerce/branches";
import { bookletReadyEtaCopy } from "@/lib/commerce/orders/receipt";
import {
  COMMERCE_OPS_STAGE_LABELS,
  isCommerceOpsStage,
  type CommerceOpsStageValue,
} from "@/lib/commerce/orders/ops-stage";
import {
  COMMERCE_QR_RECEIPT_SIZE,
  generateCommerceOrderQrDataUrl,
} from "@/lib/commerce/orders/qr";
import { prisma } from "@/lib/prisma";
import {
  COMMERCE_STUDENT_GRADE_LABELS,
  COMMERCE_STUDENT_MAJOR_LABELS,
  commerceGradeRequiresMajor,
  isCommerceStudentGrade,
  isCommerceStudentMajor,
} from "@/lib/commerce/student-fields";
import { formatJalaliDateShort, formatJalaliDateTimeShort } from "@/lib/datetime/jalali";
import { formatTehranTime24 } from "@/lib/datetime/tehran-zone";
import { toPersianDigits } from "@/lib/persian";
import { formatRials } from "@/lib/registration/format";

export type PublicBookletTicket = {
  qrToken: string;
  orderNumber: string;
  studentName: string;
  parentName: string | null;
  mobile: string | null;
  nationalCode: string | null;
  gradeLabel: string | null;
  majorLabel: string | null;
  booklet: string;
  instructor: string | null;
  amountLabel: string;
  paymentPaid: boolean;
  paidAtLabel: string | null;
  opsStage: CommerceOpsStageValue;
  statusLabel: string;
  pickupBranch: CommerceBranchBadge | null;
  hours: string;
  instructions: string;
  eta: ReturnType<typeof bookletReadyEtaCopy>;
  qrDataUrl: string;
  delivered: boolean;
  deliveredAtLabel: string | null;
  deliveredByName: string | null;
  pickupSignedBy: string | null;
  signatureDataUrl: string | null;
  events: Array<{
    stage: CommerceOpsStageValue | null;
    title: string;
    note: string | null;
    occurredAtLabel: string;
    operatorName: string | null;
  }>;
};

function readSignature(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const value = Reflect.get(metadata, "pickupSignaturePng");
  return typeof value === "string" && value.startsWith("data:image/png") ? value : null;
}

export async function getPublicBookletTicket(params: {
  organizationId: string;
  token: string;
}): Promise<PublicBookletTicket | null> {
  const token = params.token.trim();
  if (!token) return null;

  const order = await prisma.commerceOrder.findFirst({
    where: {
      organizationId: params.organizationId,
      qrToken: token,
    },
    include: {
      items: {
        orderBy: { createdAt: "asc" },
        select: {
          titleSnapshot: true,
          item: { select: { authors: true } },
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
      deliveredBy: { select: { firstName: true, lastName: true } },
      events: {
        orderBy: { occurredAt: "asc" },
        take: 40,
        select: {
          stage: true,
          title: true,
          note: true,
          occurredAt: true,
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
      status: PaymentStatus.PAID,
    },
    orderBy: { paidAt: "desc" },
    select: { paidAt: true, updatedAt: true },
  });

  const stage = isCommerceOpsStage(order.opsStage) ? order.opsStage : "REGISTERED";
  const studentName =
    order.buyerName?.trim() ||
    `${order.buyerFirstName ?? ""} ${order.buyerLastName ?? ""}`.trim() ||
    "—";
  const booklet =
    order.items.map((item) => item.titleSnapshot).filter(Boolean).join("، ") || "—";
  const instructor =
    order.items
      .map((item) => item.item?.authors?.trim())
      .filter((value): value is string => Boolean(value))
      .join("، ") || null;
  const actorName = (actor: { firstName: string; lastName: string } | null) =>
    actor ? `${actor.firstName} ${actor.lastName}`.trim() || null : null;

  return {
    qrToken: order.qrToken,
    orderNumber: order.orderNumber,
    studentName,
    parentName: order.parentName,
    mobile: order.buyerMobile,
    nationalCode: order.buyerNationalCode,
    gradeLabel: isCommerceStudentGrade(order.studentGrade)
      ? COMMERCE_STUDENT_GRADE_LABELS[order.studentGrade]
      : null,
    majorLabel:
      commerceGradeRequiresMajor(order.studentGrade) &&
      isCommerceStudentMajor(order.studentMajor)
        ? COMMERCE_STUDENT_MAJOR_LABELS[order.studentMajor]
        : null,
    booklet,
    instructor,
    amountLabel: formatRials(order.grandTotalRials),
    paymentPaid: order.paymentStatus === CommerceOrderPaymentStatus.PAID,
    paidAtLabel: intent?.paidAt
      ? `${formatJalaliDateShort(intent.paidAt)} ${toPersianDigits(formatTehranTime24(intent.paidAt))}`
      : intent?.updatedAt
        ? `${formatJalaliDateShort(intent.updatedAt)} ${toPersianDigits(formatTehranTime24(intent.updatedAt))}`
        : null,
    opsStage: stage,
    statusLabel: COMMERCE_OPS_STAGE_LABELS[stage],
    pickupBranch: order.pickupBranch ? toCommerceBranchBadge(order.pickupBranch) : null,
    hours: BOOKLET_PICKUP_HOURS,
    instructions: BOOKLET_PICKUP_INSTRUCTIONS,
    eta: bookletReadyEtaCopy(stage),
    qrDataUrl: await generateCommerceOrderQrDataUrl(order.qrToken, COMMERCE_QR_RECEIPT_SIZE),
    delivered: stage === "DELIVERED_TO_STUDENT",
    deliveredAtLabel: order.deliveredAt
      ? `${formatJalaliDateShort(order.deliveredAt)} ${toPersianDigits(formatTehranTime24(order.deliveredAt))}`
      : null,
    deliveredByName: actorName(order.deliveredBy),
    pickupSignedBy: order.pickupSignedBy,
    signatureDataUrl: readSignature(order.metadata),
    events: order.events.map((event) => ({
      stage: isCommerceOpsStage(event.stage) ? event.stage : null,
      title: event.title,
      note: event.note,
      occurredAtLabel: formatJalaliDateTimeShort(event.occurredAt),
      operatorName: actorName(event.actor),
    })),
  };
}
