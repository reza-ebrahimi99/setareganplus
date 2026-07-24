import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/require-admin";
import { buildCsvDocument, neutralizeSpreadsheetFormula } from "@/lib/forms/csv";
import {
  getPromotionReports,
  getReferralLeaderboard,
} from "@/lib/promotions/reports";
import { PROMOTION_TYPE_LABELS } from "@/lib/promotions/types";
import type { PromotionType } from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requirePermission("reports.view");
  const [rows, leaders] = await Promise.all([
    getPromotionReports(session.organization.id),
    getReferralLeaderboard(session.organization.id),
  ]);

  const promoRows: string[][] = [
    [
      "عنوان",
      "نوع",
      "کد",
      "استفاده",
      "تخفیف_ریال",
      "درآمد_ریال",
      "نرخ_تبدیل",
    ],
    ...rows.map((row) => [
      neutralizeSpreadsheetFormula(row.title),
      neutralizeSpreadsheetFormula(
        PROMOTION_TYPE_LABELS[row.type as PromotionType] ?? row.type,
      ),
      neutralizeSpreadsheetFormula(row.code ?? ""),
      String(row.usageCount),
      String(row.totalDiscountRials),
      String(row.revenueRials),
      String(Math.round(row.conversionRate * 1000) / 10),
    ]),
  ];

  const leaderRows: string[][] = [
    ["نام", "تعداد_ثبت‌نام", "فروش_ریال", "تخفیف_ریال"],
    ...leaders.map((row) => [
      neutralizeSpreadsheetFormula(row.ownerStaffName),
      String(row.registrationCount),
      String(row.totalSalesRials),
      String(row.totalDiscountRials),
    ]),
  ];

  const csv = [
    "### Promotion Usage",
    buildCsvDocument(promoRows).replace(/^\uFEFF/, ""),
    "",
    "### Referral Leaderboard",
    buildCsvDocument(leaderRows).replace(/^\uFEFF/, ""),
  ].join("\r\n");

  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="promotion-reports.csv"',
      "Cache-Control": "no-store",
    },
  });
}
