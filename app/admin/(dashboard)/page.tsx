import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AdminMetricGrid } from "@/components/admin/AdminMetricGrid";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminQuickAction } from "@/components/admin/AdminQuickAction";
import { AdminReadinessItem } from "@/components/admin/AdminReadinessItem";
import { AdminSection } from "@/components/admin/AdminSection";
import { AdminSystemCard } from "@/components/admin/AdminSystemCard";
import { AdminTaskEmpty } from "@/components/admin/AdminTaskEmpty";
import { AdminTimelineEmpty } from "@/components/admin/AdminTimelineEmpty";
import {
  CrmDashboardInsightsSection,
  CrmDashboardInsightsSkeleton,
} from "@/components/admin/crm/CrmDashboardInsights";
import {
  adminBreadcrumbs,
  dashboardQuickActions,
  dashboardStats,
  platformReadiness,
} from "@/content/admin";
import { hasPermission, permissionsForRole, PERMISSIONS } from "@/lib/auth/permissions";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { composeDashboard } from "@/lib/dashboard/compose";
import type { ManagerOpsMetrics } from "@/lib/crm/manager-dashboard-reads";
import type { StaffCallsTodayRow } from "@/lib/crm/manager-dashboard-reads";

export const metadata: Metadata = {
  title: "نمای کلی",
};

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const session = await requireAdminSession();
  const canReport = hasPermission(session, "reports.view");
  if (!canReport) {
    if (hasPermission(session, "crm.view_assigned")) redirect("/admin/workspace");
    if (hasPermission(session, "forms.manage")) redirect("/admin/forms");
    if (hasPermission(session, "communication.manage")) redirect("/admin/settings/communication");
    if (hasPermission(session, "settings.manage")) redirect("/admin/settings/staff");
    redirect("/admin/forbidden");
  }
  if (!hasPermission(session, "crm.view_all")) redirect("/admin/reports/staff-performance");

  const permissions = session.user.isPlatformAdmin
    ? new Set(PERMISSIONS)
    : new Set(permissionsForRole(session.membership.role));
  const now = new Date();
  const composed = await composeDashboard({
    dashboardId: "manager",
    ctx: {
      organizationId: session.organization.id,
      viewerUserId: session.user.id,
      membershipId: session.membership.id,
      permissions,
      allBranches: session.membership.allBranches,
      branchIds: session.membership.branchIds,
      from: new Date(now.getTime() - 30 * 86_400_000),
      to: now,
      includeLazy: true,
    },
  });

  const widgets = composed.ok ? composed.dashboard.widgets : [];
  const opsWidget = widgets.find((w) => w.id === "manager_ops_metrics");
  const staffWidget = widgets.find((w) => w.id === "staff_performance_strip");
  const ops =
    opsWidget?.status === "ok" || opsWidget?.status === "empty"
      ? (opsWidget.data as ManagerOpsMetrics)
      : null;
  const callsByStaff =
    staffWidget?.status === "ok" || staffWidget?.status === "empty"
      ? ((staffWidget.data as StaffCallsTodayRow[]) ?? [])
      : [];

  const managerMetrics = [
    ["تماس امروز", ops?.callsToday ?? "—"],
    ["پیگیری عقب‌افتاده", ops?.overdueTasks ?? "—"],
    ["لید بدون مسئول", ops?.unassignedLeads ?? "—"],
    ["لید داغ بدون پیگیری", ops?.hotWithoutFollowUp ?? "—"],
    ["رزرو امروز", ops?.bookingsToday ?? "—"],
    ["نرخ تبدیل ۳۰ روز", ops?.conversion30dLabel ?? "—"],
  ] as const;

  return (
    <>
      <AdminPageHeader
        title="نمای کلی مدیریت"
        description="پیش‌نمایش داشبورد مدیریت آموزشی. اطلاعات عملیاتی پس از اتصال پایگاه داده و احراز هویت بارگذاری می‌شوند."
        breadcrumbs={adminBreadcrumbs.dashboard}
        showNotice
      />

      <section className="mb-7 grid gap-3 sm:grid-cols-3 xl:grid-cols-6" aria-label="شاخص‌های عملیاتی مدیر">
        {managerMetrics.map(([label, value]) => (
          <div key={label} className="admin-card p-4">
            <p className="text-xs text-muted">{label}</p>
            <p className="mt-1 text-xl font-bold text-primary">{value}</p>
          </div>
        ))}
      </section>
      <Suspense fallback={<CrmDashboardInsightsSkeleton />}>
        <CrmDashboardInsightsSection session={session} />
      </Suspense>
      <section className="admin-card mb-7 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold text-primary">عملکرد تماس همکاران امروز</h2>
          <Link href="/admin/reports/staff-performance" className="text-sm text-secondary">
            گزارش کامل
          </Link>
        </div>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {callsByStaff.map((item) => (
            <li key={item.id} className="rounded-lg border border-border p-3 text-sm">
              <span className="font-medium">{item.name}</span>
              <span className="mt-1 block text-xs text-muted">{item.count} تماس</span>
            </li>
          ))}
          {callsByStaff.length === 0 && (
            <li className="text-sm text-muted">امروز تماسی ثبت نشده است.</li>
          )}
        </ul>
      </section>
      <AdminMetricGrid
        items={dashboardStats}
        heading="کارت‌های آماری"
        headingId="dashboard-stats-heading"
      />

      <AdminSection title="دسترسی سریع" headingId="quick-actions-heading" className="mt-8">
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {dashboardQuickActions.map((action) => (
            <li key={action.label}>
              <AdminQuickAction action={action} />
            </li>
          ))}
        </ul>
      </AdminSection>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <AdminSection title="آمادگی فنی سکو" headingId="readiness-heading">
          <ul className="space-y-2">
            {platformReadiness.map((item) => (
              <AdminReadinessItem
                key={item.label}
                label={item.label}
                status={item.status}
                tone={item.tone}
              />
            ))}
          </ul>
        </AdminSection>

        <AdminSystemCard />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <AdminTimelineEmpty />
        <AdminTaskEmpty />
      </div>
    </>
  );
}
