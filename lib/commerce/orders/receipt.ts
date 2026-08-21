/**
 * Public booklet receipt helpers — estimated ready copy and payment labels.
 */

import { toCommerceBranchBadge, type CommerceBranchBadge } from "@/lib/commerce/branches";
import { COMMERCE_PAYMENT_STATUS_LABELS } from "@/lib/commerce/booklet";
import {
  COMMERCE_OPS_STAGE_LABELS,
  isCommerceOpsStage,
  type CommerceOpsStageValue,
} from "@/lib/commerce/orders/ops-stage";
import { generateCommerceOrderQrDataUrl } from "@/lib/commerce/orders/qr";
import {
  COMMERCE_BOOKLET_PAYMENT_METHOD_LABELS,
  COMMERCE_STUDENT_GRADE_LABELS,
  COMMERCE_STUDENT_MAJOR_LABELS,
  commerceGradeRequiresMajor,
  isCommerceBookletPaymentMethod,
  isCommerceStudentGrade,
  isCommerceStudentMajor,
} from "@/lib/commerce/student-fields";
import { formatJalaliDateShort } from "@/lib/datetime/jalali";
import { formatTehranTime24 } from "@/lib/datetime/tehran-zone";
import { toPersianDigits } from "@/lib/persian";
import { formatRials } from "@/lib/registration/format";

export function bookletReadyEtaCopy(stage: CommerceOpsStageValue): {
  ready: boolean;
  heading: string;
  text: string;
} {
  if (stage === "READY_FOR_PICKUP" || stage === "DELIVERED_TO_STUDENT") {
    return {
      ready: true,
      heading: "زمان تقریبی آماده شدن",
      text: "جزوه شما آماده تحویل است.",
    };
  }
  return {
    ready: false,
    heading: "زمان تقریبی آماده شدن",
    text: "۱ تا ۲ روز کاری",
  };
}

export function commerceGatewayMethodLabel(provider: string | null | undefined): string {
  const value = (provider ?? "").trim().toLowerCase();
  if (value === "zibal") return "درگاه زیبال";
  if (value === "mock") return "پرداخت آزمایشی";
  if (value) return "درگاه پرداخت";
  return "پرداخت آنلاین";
}

export type BookletReceiptLine = {
  title: string;
  instructor: string | null;
  quantity: number;
};

export type BookletReceiptView = {
  studentName: string;
  parentName: string | null;
  mobile: string | null;
  nationalCode: string | null;
  gradeLabel: string | null;
  majorLabel: string | null;
  orderNumber: string;
  trackingCode: string | null;
  amountLabel: string;
  dateLabel: string;
  timeLabel: string;
  paymentMethodLabel: string;
  orderStatusLabel: string;
  lines: BookletReceiptLine[];
  pickupBranch: CommerceBranchBadge | null;
  opsStage: CommerceOpsStageValue;
  eta: ReturnType<typeof bookletReadyEtaCopy>;
  qrDataUrl: string;
  generatedAtLabel: string;
};

export async function buildBookletReceiptView(params: {
  order: {
    orderNumber: string;
    buyerName: string | null;
    buyerFirstName: string | null;
    buyerLastName: string | null;
    parentName: string | null;
    buyerMobile: string | null;
    buyerNationalCode: string | null;
    studentGrade: string | null;
    studentMajor: string | null;
    grandTotalRials: number;
    paymentStatus: string;
    opsStage: string;
    qrToken: string;
    bookletPaymentMethod: string | null;
    pickupBranch: {
      id: string;
      name: string;
      slug: string;
      accentColor?: string | null;
      address?: string | null;
      bookletOpsKey?: string | null;
    } | null;
    items: Array<{
      titleSnapshot: string;
      quantity: number;
      item: { authors: string } | null;
    }>;
  };
  intent: {
    trackingCode: string | null;
    paidAt: Date | null;
    updatedAt: Date;
    finalAmountRials: number;
    provider: string;
  };
}): Promise<BookletReceiptView> {
  const { order, intent } = params;
  const paidAt = intent.paidAt ?? intent.updatedAt;
  const stage = isCommerceOpsStage(order.opsStage) ? order.opsStage : "PAID";
  const studentName =
    order.buyerName?.trim() ||
    `${order.buyerFirstName ?? ""} ${order.buyerLastName ?? ""}`.trim() ||
    "—";
  const paymentMethod = isCommerceBookletPaymentMethod(order.bookletPaymentMethod)
    ? COMMERCE_BOOKLET_PAYMENT_METHOD_LABELS[order.bookletPaymentMethod]
    : commerceGatewayMethodLabel(intent.provider);
  const gradeLabel = isCommerceStudentGrade(order.studentGrade)
    ? COMMERCE_STUDENT_GRADE_LABELS[order.studentGrade]
    : null;

  return {
    studentName,
    parentName: order.parentName,
    mobile: order.buyerMobile,
    nationalCode: order.buyerNationalCode,
    gradeLabel,
    majorLabel:
      commerceGradeRequiresMajor(order.studentGrade) && isCommerceStudentMajor(order.studentMajor)
        ? COMMERCE_STUDENT_MAJOR_LABELS[order.studentMajor]
        : null,
    orderNumber: order.orderNumber,
    trackingCode: intent.trackingCode,
    amountLabel: formatRials(intent.finalAmountRials || order.grandTotalRials),
    dateLabel: formatJalaliDateShort(paidAt),
    timeLabel: toPersianDigits(formatTehranTime24(paidAt)),
    paymentMethodLabel: paymentMethod,
    orderStatusLabel:
      COMMERCE_OPS_STAGE_LABELS[stage] ||
      COMMERCE_PAYMENT_STATUS_LABELS[
        order.paymentStatus as keyof typeof COMMERCE_PAYMENT_STATUS_LABELS
      ] ||
      order.paymentStatus,
    lines: order.items.map((item) => ({
      title: item.titleSnapshot,
      instructor: item.item?.authors?.trim() || null,
      quantity: item.quantity,
    })),
    pickupBranch: order.pickupBranch ? toCommerceBranchBadge(order.pickupBranch) : null,
    opsStage: stage,
    eta: bookletReadyEtaCopy(stage),
    qrDataUrl: await generateCommerceOrderQrDataUrl(order.qrToken, 360),
    generatedAtLabel: `${formatJalaliDateShort(new Date())} ${toPersianDigits(formatTehranTime24(new Date()))}`,
  };
}
