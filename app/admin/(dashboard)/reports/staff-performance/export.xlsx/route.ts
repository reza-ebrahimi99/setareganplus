import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { AuditAction, SystemRole } from "@/generated/prisma/enums";
import { requirePermission } from "@/lib/auth/require-admin";
import {
  formatJalaliDateShort,
  jalaliTehranLocalToUtc,
  parseJalaliDateInput,
} from "@/lib/datetime/jalali";
import { prisma } from "@/lib/prisma";
import { loadStaffPerformance } from "@/lib/reports/staff-performance";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await requirePermission("reports.view");
  const url = new URL(request.url);
  const now = new Date();
  const fromJalali = parseJalaliDateInput(url.searchParams.get("from") ?? "");
  const toJalali = parseJalaliDateInput(url.searchParams.get("to") ?? "");
  const from = fromJalali
    ? jalaliTehranLocalToUtc(fromJalali.jy, fromJalali.jm, fromJalali.jd, 0, 0)
    : new Date(now.getTime() - 30 * 86_400_000);
  const to = toJalali
    ? jalaliTehranLocalToUtc(toJalali.jy, toJalali.jm, toJalali.jd, 23, 59)
    : now;
  const roleRaw = url.searchParams.get("role");
  const role =
    roleRaw && (Object.values(SystemRole) as string[]).includes(roleRaw)
      ? (roleRaw as SystemRole)
      : undefined;
  const report = await loadStaffPerformance(session, {
    from,
    to,
    role,
    branchId: url.searchParams.get("branch") || undefined,
    membershipId: url.searchParams.get("staff") || undefined,
    source: url.searchParams.get("source") || undefined,
    formId: url.searchParams.get("form") || undefined,
    stageId: url.searchParams.get("stage") || undefined,
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "StarOS";
  workbook.created = now;
  const sheet = workbook.addWorksheet("عملکرد همکاران", {
    views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }],
  });
  const headers = [
    "همکار",
    "نقش",
    "لیدهای واگذارشده",
    "تماس",
    "پاسخ",
    "بی‌پاسخ",
    "پیگیری تکمیل",
    "وظیفه عقب‌افتاده",
    "مشاوره",
    "واجد شرایط",
    "برد",
    "نرخ تبدیل",
    "میانگین پاسخ (دقیقه)",
    "فعالیت",
  ];
  sheet.addRow(headers);
  const header = sheet.getRow(1);
  header.font = { bold: true };
  header.alignment = { horizontal: "right", vertical: "middle" };
  for (const row of report.rows) {
    sheet.addRow([
      row.name,
      row.roleLabel,
      row.assignedLeads,
      row.calls,
      row.answered,
      row.noAnswer,
      row.followUpsCompleted,
      row.overdueTasks,
      row.consultations,
      row.qualified,
      row.won,
      row.conversionRate / 100,
      row.averageResponseMinutes === null
        ? ""
        : Math.round(row.averageResponseMinutes),
      row.activityCount,
    ]);
  }
  sheet.getColumn(12).numFmt = "0.0%";
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(1, report.rows.length + 1), column: headers.length },
  };
  for (let index = 1; index <= headers.length; index += 1) {
    const column = sheet.getColumn(index);
    column.width = index <= 2 ? 22 : 16;
    column.alignment = {
      horizontal: "right",
      vertical: "middle",
      wrapText: true,
    };
  }
  await prisma.auditLog.create({
    data: {
      organizationId: session.organization.id,
      actorUserId: session.user.id,
      action: AuditAction.DATA_EXPORTED,
      entityType: "StaffPerformanceReport",
      metadata: { format: "xlsx", rowCount: report.rows.length },
    },
  });
  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  const filename = `staff-performance-${formatJalaliDateShort(from).replace(/\//g, "-")}-${formatJalaliDateShort(to).replace(/\//g, "-")}.xlsx`;
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
