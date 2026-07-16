import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { adminBreadcrumbs } from "@/content/admin";
import { hasPermission, scopedLeadWhere } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-admin";
import { ensureDefaultPipeline } from "@/lib/crm/pipeline";
import { toPersianDigits } from "@/lib/persian";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "متقاضیان و CRM",
};

export default async function AdminLeadsPage() {
  const session = await requirePermission("crm.view_assigned");
  await ensureDefaultPipeline(session.organization.id);
  const leadScope = scopedLeadWhere(session);

  const [total, hot, openTasks, recent] = await Promise.all([
    prisma.lead.count({
      where: leadScope,
    }),
    prisma.lead.count({
      where: {
        ...leadScope,
        scoreBand: { in: ["HOT", "QUALIFIED"] },
      },
    }),
    prisma.crmTask.count({
      where: {
        organizationId: session.organization.id,
        deletedAt: null,
        status: { in: ["OPEN", "IN_PROGRESS"] },
        lead: leadScope,
      },
    }),
    prisma.lead.findMany({
      where: leadScope,
      orderBy: { updatedAt: "desc" },
      take: 30,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        score: true,
        scoreBand: true,
        source: true,
        stage: { select: { name: true } },
        owner: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);

  return (
    <>
      <AdminPageHeader
        title="متقاضیان و CRM"
        description="فهرست متقاضیان سازمان — برای نمای پایپ‌لاین از تابلوی CRM استفاده کنید"
        breadcrumbs={adminBreadcrumbs.leads}
        compact
      />

      <div className="mb-5 flex flex-wrap gap-3">
        <Link href="/admin/crm" className="rounded-lg bg-primary px-4 py-2 text-sm text-white">
          تابلوی پایپ‌لاین
        </Link>
        {hasPermission(session, "automations.manage") && <Link href="/admin/settings/automations" className="rounded-lg border border-border px-4 py-2 text-sm">قوانین اتوماسیون</Link>}
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="admin-card px-4 py-3">
          <p className="text-xs text-muted">کل لیدها</p>
          <p className="text-xl font-bold text-primary">{toPersianDigits(total)}</p>
        </div>
        <div className="admin-card px-4 py-3">
          <p className="text-xs text-muted">داغ / واجد شرایط</p>
          <p className="text-xl font-bold text-primary">{toPersianDigits(hot)}</p>
        </div>
        <div className="admin-card px-4 py-3">
          <p className="text-xs text-muted">وظایف باز</p>
          <p className="text-xl font-bold text-primary">{toPersianDigits(openTasks)}</p>
        </div>
      </div>

      <div className="admin-card overflow-x-auto px-2 py-2">
        <table className="w-full min-w-[40rem] text-sm">
          <thead>
            <tr className="border-b border-border text-right text-xs text-muted">
              <th className="px-3 py-2 font-medium">نام</th>
              <th className="px-3 py-2 font-medium">مرحله</th>
              <th className="px-3 py-2 font-medium">امتیاز</th>
              <th className="px-3 py-2 font-medium">مسئول</th>
              <th className="px-3 py-2 font-medium">منبع</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((lead) => (
              <tr key={lead.id} className="border-b border-border/60">
                <td className="px-3 py-2">
                  <Link href={`/admin/leads/${lead.id}`} className="text-primary hover:underline">
                    {lead.firstName} {lead.lastName}
                  </Link>
                </td>
                <td className="px-3 py-2">{lead.stage?.name ?? "—"}</td>
                <td className="px-3 py-2">{toPersianDigits(lead.score)} · {lead.scoreBand}</td>
                <td className="px-3 py-2">
                  {lead.owner
                    ? `${lead.owner.firstName} ${lead.owner.lastName}`
                    : "—"}
                </td>
                <td className="px-3 py-2">{lead.source}</td>
              </tr>
            ))}
            {recent.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-muted">
                  هنوز متقاضی ثبت نشده است.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
