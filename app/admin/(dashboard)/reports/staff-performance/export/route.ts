import { AuditAction, SystemRole } from "@/generated/prisma/enums";
import { requirePermission } from "@/lib/auth/require-admin";
import { jalaliTehranLocalToUtc, parseJalaliDateInput } from "@/lib/datetime/jalali";
import { loadStaffPerformance } from "@/lib/reports/staff-performance";
import { prisma } from "@/lib/prisma";

function csv(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  const session = await requirePermission("reports.view");
  const url = new URL(request.url);
  const now = new Date();
  const fromRaw = url.searchParams.get("from");
  const toRaw = url.searchParams.get("to");
  const fromJalali = fromRaw ? parseJalaliDateInput(fromRaw) : null;
  const toJalali = toRaw ? parseJalaliDateInput(toRaw) : null;
  const from = fromJalali
    ? jalaliTehranLocalToUtc(fromJalali.jy, fromJalali.jm, fromJalali.jd, 0, 0)
    : new Date(now.getTime() - 30 * 86_400_000);
  const to = toJalali
    ? jalaliTehranLocalToUtc(toJalali.jy, toJalali.jm, toJalali.jd, 23, 59)
    : now;
  const roleRaw = url.searchParams.get("role");
  const role = roleRaw && (Object.values(SystemRole) as string[]).includes(roleRaw)
    ? roleRaw as SystemRole
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
  const header = [
    "همکار", "نقش", "لیدهای واگذار شده", "تماس", "پاسخ", "بی‌پاسخ",
    "پیگیری تکمیل", "وظیفه عقب‌افتاده", "مشاوره", "واجد شرایط", "برد",
    "نرخ تبدیل", "میانگین پاسخ (دقیقه)", "فعالیت",
  ];
  const lines = [
    header.map(csv).join(","),
    ...report.rows.map((row) => [
      row.name, row.roleLabel, row.assignedLeads, row.calls, row.answered,
      row.noAnswer, row.followUpsCompleted, row.overdueTasks, row.consultations,
      row.qualified, row.won, row.conversionRate.toFixed(2),
      row.averageResponseMinutes?.toFixed(0) ?? "", row.activityCount,
    ].map(csv).join(",")),
  ];
  await prisma.auditLog.create({
    data: {
      organizationId: session.organization.id,
      actorUserId: session.user.id,
      action: AuditAction.DATA_EXPORTED,
      entityType: "StaffPerformanceReport",
      metadata: { format: "csv", rowCount: report.rows.length },
    },
  });
  return new Response(`\uFEFF${lines.join("\r\n")}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="staff-performance.csv"',
      "cache-control": "private, no-store",
    },
  });
}
