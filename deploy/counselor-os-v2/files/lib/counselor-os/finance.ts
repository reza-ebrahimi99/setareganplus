/**
 * Counselor OS financial read-model. Does not create or mutate payments.
 */

import { PaymentStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  formatTomanFromRials,
  labelPackage,
  packagePresentation,
} from "@/lib/counselor-os/labels";
import type {
  CounselorFinanceItem,
  CounselorFinanceSummary,
} from "@/lib/counselor-os/view-models";
import { formatJalaliDateTimeShort } from "@/lib/datetime/jalali";

export type { CounselorFinanceItem, CounselorFinanceSummary };

function isHollandIntent(row: {
  idempotencyKey: string;
  description: string | null;
  payableType: string;
}): boolean {
  const blob = `${row.idempotencyKey} ${row.description ?? ""} ${row.payableType}`.toLowerCase();
  return blob.includes("holland") || blob.includes("رغبت");
}

export async function loadCounselorFinance(params: {
  organizationId: string;
  planId: string | null;
  studentId?: string | null;
  userId?: string | null;
  packageCode: string | null;
  packagePaidAt: Date | null;
}): Promise<CounselorFinanceSummary> {
  const payableIds = [params.planId, params.studentId, params.userId].filter(
    (id): id is string => Boolean(id),
  );
  const intents = payableIds.length
    ? await prisma.paymentIntent.findMany({
        where: {
          organizationId: params.organizationId,
          payableId: { in: payableIds },
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          payableType: true,
          status: true,
          amountRials: true,
          discountRials: true,
          finalAmountRials: true,
          paidAt: true,
          receiptNumber: true,
          trackingCode: true,
          description: true,
          idempotencyKey: true,
        },
        take: 40,
      })
    : [];

  const hollandPaid = intents.find(
    (row) => row.status === PaymentStatus.PAID && isHollandIntent(row),
  );
  const packagePaidIntent = intents.find(
    (row) =>
      row.status === PaymentStatus.PAID &&
      (row.payableType === "GUIDANCE_PACKAGE" ||
        row.idempotencyKey.includes("guidance-v2-package") ||
        row.idempotencyKey.includes("guidance-package")),
  );

  const packagePaid = Boolean(params.packagePaidAt) || Boolean(packagePaidIntent);
  const presentation = packagePresentation({
    code: params.packageCode,
    paid: packagePaid,
    activated: Boolean(params.packagePaidAt),
  });

  const items: CounselorFinanceItem[] = [];

  if (hollandPaid || intents.some(isHollandIntent)) {
    const row = hollandPaid ?? intents.find(isHollandIntent);
    items.push({
      kind: "holland",
      title: "آزمون رغبت‌سنجی اختصاصی مهندس ابراهیمی",
      amountLabel: formatTomanFromRials(row?.finalAmountRials ?? row?.amountRials ?? 2_500_000),
      statusLabel: hollandPaid ? "پرداخت‌شده — فقط رغبت‌سنجی" : "پرداخت نشده",
      activationLabel: hollandPaid ? "گزارش رغبت‌سنجی فعال" : "فعال نشده",
      paidAtLabel: hollandPaid?.paidAt
        ? formatJalaliDateTimeShort(hollandPaid.paidAt)
        : null,
      receipt: hollandPaid?.receiptNumber ?? null,
      tracking: hollandPaid?.trackingCode ?? null,
      discountLabel:
        row && row.discountRials > 0
          ? formatTomanFromRials(row.discountRials)
          : null,
      packageCode: null,
    });
  }

  items.push({
    kind: "package",
    title: `انتخاب رشته — ${labelPackage(params.packageCode)}`,
    amountLabel: formatTomanFromRials(
      packagePaidIntent?.finalAmountRials ?? packagePaidIntent?.amountRials,
    ),
    statusLabel: packagePaid ? "پرداخت‌شده" : "پرداخت نشده",
    activationLabel: presentation.label,
    paidAtLabel: params.packagePaidAt
      ? formatJalaliDateTimeShort(params.packagePaidAt)
      : packagePaidIntent?.paidAt
        ? formatJalaliDateTimeShort(packagePaidIntent.paidAt)
        : null,
    receipt: packagePaidIntent?.receiptNumber ?? null,
    tracking: packagePaidIntent?.trackingCode ?? null,
    discountLabel:
      packagePaidIntent && packagePaidIntent.discountRials > 0
        ? formatTomanFromRials(packagePaidIntent.discountRials)
        : null,
    packageCode: params.packageCode,
  });

  return {
    items,
    hollandPaid: Boolean(hollandPaid),
    packagePaid,
    packageCode: params.packageCode,
    packageTitle: labelPackage(params.packageCode),
    packageStateLabel: presentation.label,
  };
}
