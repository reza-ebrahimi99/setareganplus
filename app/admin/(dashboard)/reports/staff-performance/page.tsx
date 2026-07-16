import type { Metadata } from "next";
import Link from "next/link";
import { SystemRole } from "@/generated/prisma/enums";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-admin";
import {
  formatJalaliDateShort,
  jalaliTehranLocalToUtc,
  parseJalaliDateInput,
} from "@/lib/datetime/jalali";
import { prisma } from "@/lib/prisma";
import { loadStaffPerformance } from "@/lib/reports/staff-performance";

export const metadata: Metadata = { title: "عملکرد همکاران" };
export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function one(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

function dateOr(value: string, fallback: Date, end = false) {
  const parsed = parseJalaliDateInput(value);
  return parsed
    ? jalaliTehranLocalToUtc(parsed.jy, parsed.jm, parsed.jd, end ? 23 : 0, end ? 59 : 0)
    : fallback;
}

export default async function StaffPerformancePage({ searchParams }: PageProps) {
  const session = await requirePermission("reports.view");
  const params = await searchParams;
  const now = new Date();
  const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const from = dateOr(one(params.from), defaultFrom);
  const to = dateOr(one(params.to), now, true);
  const roleRaw = one(params.role);
  const role = (Object.values(SystemRole) as string[]).includes(roleRaw) ? roleRaw as SystemRole : undefined;
  const filters = {
    from,
    to,
    branchId: one(params.branch) || undefined,
    membershipId: one(params.staff) || undefined,
    role,
    source: one(params.source) || undefined,
    formId: one(params.form) || undefined,
    stageId: one(params.stage) || undefined,
  };
  const [report, staffOptions] = await Promise.all([
    loadStaffPerformance(session, filters),
    prisma.organizationMembership.findMany({
      where: {
        organizationId: session.organization.id,
        deletedAt: null,
        status: "ACTIVE",
        ...(session.membership.allBranches ? {} : {
          OR: [
            { branchMemberships: { none: { deletedAt: null } } },
            { branchMemberships: { some: { branchId: { in: session.membership.branchIds }, deletedAt: null } } },
          ],
        }),
      },
      orderBy: { user: { lastName: "asc" } },
      select: { id: true, user: { select: { firstName: true, lastName: true } } },
    }),
  ]);
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (typeof value === "string" && value) query.set(key, value);

  return (
    <>
      <AdminPageHeader title="عملکرد همکاران" description={`بازه گزارش: ${formatJalaliDateShort(from)} تا ${formatJalaliDateShort(to)}`} breadcrumbs={[{ label: "مدیریت", href: "/admin" }, { label: "گزارش‌ها" }, { label: "عملکرد همکاران" }]} compact />
      <form className="admin-card mb-5 grid gap-3 p-4 md:grid-cols-4">
        <label className="text-xs text-muted">از تاریخ شمسی<input type="text" name="from" dir="ltr" placeholder="۱۴۰۵/۰۱/۰۱" defaultValue={one(params.from) || formatJalaliDateShort(defaultFrom)} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" /></label>
        <label className="text-xs text-muted">تا تاریخ شمسی<input type="text" name="to" dir="ltr" placeholder="۱۴۰۵/۰۱/۳۰" defaultValue={one(params.to) || formatJalaliDateShort(now)} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" /></label>
        <label className="text-xs text-muted">شعبه<select name="branch" defaultValue={filters.branchId ?? ""} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"><option value="">همه شعب مجاز</option>{report.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
        <label className="text-xs text-muted">نقش<select name="role" defaultValue={role ?? ""} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"><option value="">همه نقش‌ها</option>{Object.values(SystemRole).map((item) => <option key={item} value={item}>{ROLE_LABELS[item]}</option>)}</select></label>
        <label className="text-xs text-muted">همکار<select name="staff" defaultValue={filters.membershipId ?? ""} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"><option value="">همه همکاران</option>{staffOptions.map((member) => <option key={member.id} value={member.id}>{member.user.firstName} {member.user.lastName}</option>)}</select></label>
        <label className="text-xs text-muted">منبع<input name="source" defaultValue={filters.source ?? ""} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" /></label>
        <label className="text-xs text-muted">فرم<select name="form" defaultValue={filters.formId ?? ""} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"><option value="">همه فرم‌ها</option>{report.forms.map((form) => <option key={form.id} value={form.id}>{form.title}</option>)}</select></label>
        <label className="text-xs text-muted">مرحله<select name="stage" defaultValue={filters.stageId ?? ""} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"><option value="">همه مراحل</option>{report.stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.name}</option>)}</select></label>
        <div className="flex items-end gap-2"><button className="rounded-lg bg-primary px-4 py-2 text-sm text-white">اعمال فیلتر</button><Link href={`/admin/reports/staff-performance/export?${query}`} className="rounded-lg border border-border px-4 py-2 text-sm">CSV</Link><Link href={`/admin/reports/staff-performance/export.xlsx?${query}`} className="rounded-lg border border-border px-4 py-2 text-sm">XLSX</Link></div>
      </form>
      <div className="admin-card overflow-x-auto p-2">
        <table className="min-w-[85rem] w-full text-sm">
          <thead><tr className="border-b border-border text-right text-xs text-muted"><th className="p-2">همکار</th><th>لید</th><th>تماس</th><th>پاسخ</th><th>بی‌پاسخ</th><th>پیگیری تکمیل</th><th>عقب‌افتاده</th><th>مشاوره</th><th>واجد شرایط</th><th>برد</th><th>نرخ تبدیل</th><th>میانگین پاسخ</th><th>فعالیت</th></tr></thead>
          <tbody>{report.rows.map((row) => <tr key={row.membershipId} className="border-b border-border/60"><td className="p-2 font-medium">{row.name}<span className="block text-xs text-muted">{row.roleLabel}</span></td><td>{row.assignedLeads}</td><td>{row.calls}</td><td>{row.answered}</td><td>{row.noAnswer}</td><td>{row.followUpsCompleted}</td><td>{row.overdueTasks}</td><td>{row.consultations}</td><td>{row.qualified}</td><td>{row.won}</td><td>{row.conversionRate.toFixed(1)}٪</td><td>{row.averageResponseMinutes === null ? "—" : `${row.averageResponseMinutes.toFixed(0)} دقیقه`}</td><td>{row.activityCount}</td></tr>)}</tbody>
        </table>
      </div>
      <details className="admin-card mt-5 p-4"><summary className="cursor-pointer text-sm font-semibold">تعریف دقیق شاخص‌ها</summary><dl className="mt-3 space-y-2 text-xs leading-6 text-muted">{Object.entries(report.definitions).map(([key, definition]) => <div key={key}><dt className="inline font-semibold text-primary">{key}: </dt><dd className="inline">{definition}</dd></div>)}</dl></details>
    </>
  );
}
