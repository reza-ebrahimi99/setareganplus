import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/require-admin";
import { buildCsvDocument, neutralizeSpreadsheetFormula } from "@/lib/forms/csv";
import { getLeadRegistrationConversionReport } from "@/lib/registration/lead-conversion-analytics";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requirePermission("reports.view");
  const report = await getLeadRegistrationConversionReport(
    session.organization.id,
  );

  const summary: string[][] = [
    ["متریک", "مقدار"],
    ["کل_لیدها", String(report.totalLeads)],
    ["لید_با_ثبت‌نام", String(report.leadsWithRegistration)],
    ["نرخ_تبدیل", String(Math.round(report.conversionRate * 1000) / 10)],
    [
      "میانگین_روز_تا_ثبت‌نام",
      report.averageDaysToRegister == null
        ? ""
        : String(Math.round(report.averageDaysToRegister * 10) / 10),
    ],
    ["ثبت‌نام_امروز", String(report.todayRegistrations)],
    ["تبدیل_امروز", String(report.todayLeadConversions)],
  ];

  const byConsultant: string[][] = [
    [
      "مشاور",
      "لید",
      "ثبت‌نام",
      "پرداخت‌شده",
      "درآمد_ریال",
      "نرخ_تبدیل",
    ],
    ...report.byConsultant.map((row) => [
      neutralizeSpreadsheetFormula(row.ownerName),
      String(row.leads),
      String(row.registrations),
      String(row.paidRegistrations),
      String(row.revenueRials),
      String(Math.round(row.conversionRate * 1000) / 10),
    ]),
  ];

  const bySource: string[][] = [
    ["منبع", "لید", "ثبت‌نام", "درآمد_ریال", "نرخ_تبدیل"],
    ...report.bySource.map((row) => [
      neutralizeSpreadsheetFormula(row.source),
      String(row.leads),
      String(row.registrations),
      String(row.revenueRials),
      String(Math.round(row.conversionRate * 1000) / 10),
    ]),
  ];

  const csv = [
    "### Summary",
    buildCsvDocument(summary).replace(/^\uFEFF/, ""),
    "",
    "### By Consultant",
    buildCsvDocument(byConsultant).replace(/^\uFEFF/, ""),
    "",
    "### By Source",
    buildCsvDocument(bySource).replace(/^\uFEFF/, ""),
  ].join("\r\n");

  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="lead-conversion-report.csv"',
      "Cache-Control": "no-store",
    },
  });
}
