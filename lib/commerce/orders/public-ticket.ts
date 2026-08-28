/**
 * Public booklet ticket — capability URL keyed only by qrToken.
 * No PII in the token; order fields are resolved server-side.
 *
 * `getPublicOrderTracking` reuses the same loader/mapper for the
 * order-number-keyed public tracking page (`/order/{orderNumber}`) — the two
 * public surfaces share every field; tracking adds payment/shipping status
 * labels, an invoice breakdown, and the short-link QR.
 */

import type { Prisma } from "@/generated/prisma/client";
import { CommerceOrderPaymentStatus, PaymentStatus } from "@/generated/prisma/enums";
import { BOOKLET_PICKUP_HOURS, BOOKLET_PICKUP_INSTRUCTIONS } from "@/lib/commerce/booklet-hours";
import { COMMERCE_PAYMENT_STATUS_LABELS } from "@/lib/commerce/booklet";
import {
  toCommerceBranchBadge,
  type CommerceBranchBadge,
} from "@/lib/commerce/branches";
import { bookletReadyEtaCopy } from "@/lib/commerce/orders/receipt";
import {
  COMMERCE_OPS_STAGE_LABELS,
  commerceShippingStatusLabel,
  isCommerceOpsStage,
  type CommerceOpsStageValue,
} from "@/lib/commerce/orders/ops-stage";
import {
  COMMERCE_QR_RECEIPT_SIZE,
  commerceOrderShortUrl,
  generateCommerceOrderQrDataUrl,
  generateCommerceOrderShortQrDataUrl,
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

const PUBLIC_ORDER_INCLUDE = {
  items: {
    orderBy: { createdAt: "asc" as const },
    select: {
      titleSnapshot: true,
      quantity: true,
      unitPriceRials: true,
      totalRials: true,
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
    orderBy: { occurredAt: "asc" as const },
    take: 40,
    select: {
      stage: true,
      title: true,
      note: true,
      occurredAt: true,
      actor: { select: { firstName: true, lastName: true } },
    },
  },
} satisfies Prisma.CommerceOrderInclude;

type LoadedPublicOrder = Prisma.CommerceOrderGetPayload<{
  include: typeof PUBLIC_ORDER_INCLUDE;
}>;

async function loadCommerceOrderForPublicView(
  where: Prisma.CommerceOrderWhereInput,
): Promise<{ order: LoadedPublicOrder; intent: { paidAt: Date | null; updatedAt: Date } | null } | null> {
  const order = await prisma.commerceOrder.findFirst({
    where,
    include: PUBLIC_ORDER_INCLUDE,
  });
  if (!order) return null;

  const intent = await prisma.paymentIntent.findFirst({
    where: {
      organizationId: order.organizationId,
      payableType: "COMMERCE_ORDER",
      payableId: order.id,
      status: PaymentStatus.PAID,
    },
    orderBy: { paidAt: "desc" },
    select: { paidAt: true, updatedAt: true },
  });

  return { order, intent };
}

function actorFullName(actor: { firstName: string; lastName: string } | null): string | null {
  return actor ? `${actor.firstName} ${actor.lastName}`.trim() || null : null;
}

async function buildPublicBookletTicket(
  order: LoadedPublicOrder,
  intent: { paidAt: Date | null; updatedAt: Date } | null,
): Promise<PublicBookletTicket> {
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
    deliveredByName: actorFullName(order.deliveredBy),
    pickupSignedBy: order.pickupSignedBy,
    signatureDataUrl: readSignature(order.metadata),
    events: order.events.map((event) => ({
      stage: isCommerceOpsStage(event.stage) ? event.stage : null,
      title: event.title,
      note: event.note,
      occurredAtLabel: formatJalaliDateTimeShort(event.occurredAt),
      operatorName: actorFullName(event.actor),
    })),
  };
}

export async function getPublicBookletTicket(params: {
  organizationId: string;
  token: string;
}): Promise<PublicBookletTicket | null> {
  const token = params.token.trim();
  if (!token) return null;

  const loaded = await loadCommerceOrderForPublicView({
    organizationId: params.organizationId,
    qrToken: token,
  });
  if (!loaded) return null;

  return buildPublicBookletTicket(loaded.order, loaded.intent);
}

// ─── Public order tracking (`/order/{orderNumber}`) ─────────────────────────

export type PublicOrderInvoiceLine = {
  title: string;
  quantityLabel: string;
  unitPriceLabel: string;
  totalLabel: string;
};

export type PublicOrderInvoice = {
  subtotalLabel: string;
  discountLabel: string;
  taxLabel: string;
  shippingLabel: string;
  grandTotalLabel: string;
  lines: PublicOrderInvoiceLine[];
};

export type PublicOrderTracking = PublicBookletTicket & {
  shortCode: string;
  /** `/o/{shortCode}` — the same permanent link every SMS and QR uses. */
  shortUrl: string;
  paymentStatusLabel: string;
  shippingStatusLabel: string;
  /** QR encoding the short link (distinct from the pickup-receipt `qrDataUrl`). */
  trackingQrDataUrl: string;
  invoice: PublicOrderInvoice;
};

export async function getPublicOrderTracking(params: {
  organizationId: string;
  orderNumber: string;
}): Promise<PublicOrderTracking | null> {
  const orderNumber = params.orderNumber.trim();
  if (!orderNumber) return null;

  const loaded = await loadCommerceOrderForPublicView({
    organizationId: params.organizationId,
    orderNumber,
  });
  if (!loaded) return null;

  const { order, intent } = loaded;
  const ticket = await buildPublicBookletTicket(order, intent);

  return {
    ...ticket,
    shortCode: order.shortCode,
    shortUrl: commerceOrderShortUrl(order.shortCode),
    paymentStatusLabel:
      COMMERCE_PAYMENT_STATUS_LABELS[
        order.paymentStatus as keyof typeof COMMERCE_PAYMENT_STATUS_LABELS
      ] ?? order.paymentStatus,
    shippingStatusLabel: commerceShippingStatusLabel({
      opsStage: ticket.opsStage,
      deliveryMethod: order.deliveryMethod,
    }),
    trackingQrDataUrl: await generateCommerceOrderShortQrDataUrl(
      order.shortCode,
      COMMERCE_QR_RECEIPT_SIZE,
    ),
    invoice: {
      subtotalLabel: formatRials(order.subtotalRials),
      discountLabel: formatRials(order.discountRials),
      taxLabel: formatRials(order.taxRials),
      shippingLabel: formatRials(order.shippingRials),
      grandTotalLabel: formatRials(order.grandTotalRials),
      lines: order.items.map((item) => ({
        title: item.titleSnapshot,
        quantityLabel: toPersianDigits(String(item.quantity)),
        unitPriceLabel: formatRials(item.unitPriceRials),
        totalLabel: formatRials(item.totalRials),
      })),
    },
  };
}
