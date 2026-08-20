/**
 * Commerce orders Excel export — one row per order item.
 */

import ExcelJS from "exceljs";
import {
  COMMERCE_FULFILLMENT_STATUS_LABELS,
  COMMERCE_PAYMENT_STATUS_LABELS,
} from "@/lib/commerce/booklet";
import { COMMERCE_OPS_STAGE_LABELS } from "@/lib/commerce/orders/ops-stage";
import { commerceOrderQrUrl } from "@/lib/commerce/orders/qr";
import {
  listAdminCommerceOrdersForExport,
  type AdminCommerceOrderListFilters,
} from "@/lib/commerce/orders/service";
import { formatJalaliDateTimeShort } from "@/lib/datetime/jalali";
import { formatRials } from "@/lib/registration/format";
import { toPersianDigits } from "@/lib/persian";

export type ExportCommerceOrdersXlsxResult =
  | { ok: true; filename: string; buffer: Buffer }
  | { ok: false; reason: "unavailable" };

export async function exportCommerceOrdersXlsx(
  filters: AdminCommerceOrderListFilters,
): Promise<ExportCommerceOrdersXlsxResult> {
  try {
    const rows = await listAdminCommerceOrdersForExport({
      ...filters,
      take: 5000,
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "StarOS";
    workbook.created = new Date();
    const sheet = workbook.addWorksheet("سفارش‌ها", {
      views: [{ rightToLeft: true }],
    });

    sheet.columns = [
      { header: "شماره سفارش", key: "orderNumber", width: 18 },
      { header: "تاریخ", key: "date", width: 20 },
      { header: "نام دانش‌آموز", key: "buyerName", width: 22 },
      { header: "موبایل", key: "buyerMobile", width: 16 },
      { header: "پایه", key: "grade", width: 12 },
      { header: "رشته", key: "major", width: 14 },
      { header: "شعبه محصول", key: "branch", width: 28 },
      { header: "محل دریافت", key: "pickupBranch", width: 28 },
      { header: "محصول", key: "product", width: 32 },
      { header: "تعداد", key: "qty", width: 10 },
      { header: "مبلغ", key: "amount", width: 18 },
      { header: "وضعیت پرداخت", key: "payment", width: 16 },
      { header: "مرحله عملیات", key: "opsStage", width: 18 },
      { header: "مسئول تحویل", key: "handover", width: 20 },
      { header: "تاریخ تحویل", key: "deliveredAt", width: 20 },
      { header: "QR", key: "qr", width: 42 },
    ];

    sheet.getRow(1).font = { bold: true };

    for (const row of rows) {
      sheet.addRow({
        orderNumber: toPersianDigits(row.orderNumber),
        date: formatJalaliDateTimeShort(row.createdAt),
        buyerName: row.buyerName ?? "—",
        buyerMobile: row.buyerMobile
          ? toPersianDigits(row.buyerMobile)
          : "—",
        grade: row.studentGradeLabel ?? "—",
        major: row.studentMajorLabel ?? "—",
        product: row.productTitle,
        qty: toPersianDigits(row.quantity),
        amount: formatRials(row.amountRials),
        payment:
          COMMERCE_PAYMENT_STATUS_LABELS[
            row.paymentStatus as keyof typeof COMMERCE_PAYMENT_STATUS_LABELS
          ] ?? row.paymentStatus,
        opsStage: COMMERCE_OPS_STAGE_LABELS[row.opsStage],
        branch: row.branchName ?? "—",
        pickupBranch: row.pickupBranchName ?? "—",
        handover: row.handoverStaffName ?? "—",
        deliveredAt: row.deliveredAt
          ? formatJalaliDateTimeShort(row.deliveredAt)
          : "—",
        fulfillment: row.fulfillmentStatus
          ? COMMERCE_FULFILLMENT_STATUS_LABELS[row.fulfillmentStatus]
          : "—",
        qr: row.qrToken
          ? `${commerceOrderQrUrl(row.qrToken)}`
          : "—",
      });
    }

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const stamp = new Date().toISOString().slice(0, 10);
    return {
      ok: true,
      filename: `commerce-orders-${stamp}.xlsx`,
      buffer,
    };
  } catch (error) {
    console.error("[commerce-export] xlsx failed", error);
    return { ok: false, reason: "unavailable" };
  }
}
