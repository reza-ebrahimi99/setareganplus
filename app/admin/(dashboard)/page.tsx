import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CrmTaskStatus } from "@/generated/prisma/enums";
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
import { hasPermission } from "@/lib/auth/permissions";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { getTehranParts, tehranDayBoundsUtc } from "@/lib/datetime/tehran-zone";
import { prisma } from "@/lib/prisma";
import { getLeadRegistrationConversionReport } from "@/lib/registration/lead-conversion-analytics";
import { formatTomansFromRials } from "@/lib/registration/format";
import { toPersianDigits } from "@/lib/persian";

export const metadata: Metadata = {
  title: "نمای کلی",
};

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
  const organizationId = session.organization.id;
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);
  const today = getTehranParts(now);
  const { startUtc, endUtc } = tehranDayBoundsUtc(today.year, today.month, today.day);
  const branchScope = session.membership.allBranches
    ? {}
    : { branchId: { in: session.membership.branchIds } };
  const leadScope = { organizationId, deletedAt: null, ...branchScope };
  const [callsToday, overdue, unassigned, hotWithoutFollowUp, bookingsToday, won30, leads30, staffCalls, leadConversion] = await Promise.all([
    prisma.crmCallLog.count({ where: { organizationId, calledAt: { gte: startUtc, lte: endUtc }, lead: leadScope } }),
    prisma.crmTask.count({ where: { organizationId, deletedAt: null, status: { in: [CrmTaskStatus.OPEN, CrmTaskStatus.IN_PROGRESS] }, dueAt: { lt: now }, lead: leadScope } }),
    prisma.lead.count({ where: { ...leadScope, ownerUserId: null } }),
    prisma.lead.count({ where: { ...leadScope, scoreBand: { in: ["HOT", "QUALIFIED"] }, nextFollowUpAt: null } }),
    prisma.bookingReservation.count({ where: { organizationId, deletedAt: null, slot: { startsAt: { gte: startUtc, lte: endUtc }, ...(session.membership.allBranches ? {} : { branchId: { in: session.membership.branchIds } }) } } }),
    prisma.lead.count({ where: { ...leadScope, convertedAt: { gte: thirtyDaysAgo } } }),
    prisma.lead.count({ where: { ...leadScope, createdAt: { gte: thirtyDaysAgo } } }),
    prisma.crmCallLog.findMany({
      where: {
        organizationId,
        calledAt: { gte: startUtc, lte: endUtc },
        lead: leadScope,
      },
      orderBy: { calledAt: "desc" },
      take: 500,
      select: {
        membershipId: true,
        membership: {
          select: { user: { select: { firstName: true, lastName: true } } },
        },
      },
    }),
    getLeadRegistrationConversionReport(organizationId),
  ]);
  const managerMetrics = [
    ["تماس امروز", callsToday],
    ["پیگیری عقب‌افتاده", overdue],
    ["لید بدون مسئول", unassigned],
    ["لید داغ بدون پیگیری", hotWithoutFollowUp],
    ["رزرو امروز", bookingsToday],
    ["نرخ تبدیل ۳۰ روز", `${leads30 ? ((won30 / leads30) * 100).toFixed(1) : "0"}٪`],
  ] as const;
  const topConsultants = leadConversion.byConsultant.slice(0, 5);
  const topSources = leadConversion.bySource
    .filter((s) => s.revenueRials > 0 || s.registrations > 0)
    .slice(0, 5);
  const conversionWidgets = [
    ["ثبت‌نام امروز", toPersianDigits(String(leadConversion.todayRegistrations))],
    ["تبدیل لید امروز", toPersianDigits(String(leadConversion.todayLeadConversions))],
    [
      "نرخ تبدیل لید",
      `${toPersianDigits(String(Math.round(leadConversion.conversionRate * 100)))}٪`,
    ],
    [
      "میانگین روز تا ثبت‌نام",
      leadConversion.averageDaysToRegister == null
        ? "—"
        : toPersianDigits(String(leadConversion.averageDaysToRegister)),
    ],
  ] as const;
  const callsByStaff = [...staffCalls.reduce((map, call) => {
    const current = map.get(call.membershipId);
    map.set(call.membershipId, {
      id: call.membershipId,
      name: `${call.membership.user.firstName} ${call.membership.user.lastName}`.trim(),
      count: (current?.count ?? 0) + 1,
    });
    return map;
  }, new Map<string, { id: string; name: string; count: number }>()).values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  return (
    <>
      <AdminPageHeader
        title="نمای کلی مدیریت"
        description="پیش‌نمایش داشبورد مدیریت آموزشی. اطلاعات عملیاتی پس از اتصال پایگاه داده و احراز هویت بارگذاری می‌شوند."
        breadcrumbs={adminBreadcrumbs.dashboard}
        showNotice
      />

      <section className="mb-7 grid gap-3 sm:grid-cols-3 xl:grid-cols-6" aria-label="شاخص‌های عملیاتی مدیر">
        {managerMetrics.map(([label, value]) => <div key={label} className="admin-card p-4"><p className="text-xs text-muted">{label}</p><p className="mt-1 text-xl font-bold text-primary">{value}</p></div>)}
      </section>
      <section className="mb-7" aria-label="تبدیل لید به ثبت‌نام">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-semibold text-primary">تبدیل لید → ثبت‌نام</h2>
          <Link href="/admin/reports/lead-conversion" className="text-sm text-secondary">
            گزارش کامل
          </Link>
        </div>
        <div className="mb-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {conversionWidgets.map(([label, value]) => (
            <div key={label} className="admin-card p-4">
              <p className="text-xs text-muted">{label}</p>
              <p className="mt-1 text-xl font-bold text-primary">{value}</p>
            </div>
          ))}
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="admin-card p-5">
            <h3 className="mb-3 text-sm font-semibold text-primary">درآمد به تفکیک مشاور</h3>
            <ul className="space-y-2 text-sm">
              {topConsultants.map((row) => (
                <li
                  key={row.ownerUserId}
                  className="flex items-center justify-between gap-2 border-b border-border/50 pb-2 last:border-0"
                >
                  <span>
                    {row.ownerName}
                    <span className="mt-0.5 block text-xs text-muted">
                      {toPersianDigits(String(row.registrations))} ثبت‌نام ·{" "}
                      {toPersianDigits(String(Math.round(row.conversionRate * 100)))}٪
                    </span>
                  </span>
                  <span className="font-medium">
                    {formatTomansFromRials(row.revenueRials)}
                  </span>
                </li>
              ))}
              {topConsultants.length === 0 ? (
                <li className="text-muted">هنوز داده‌ای نیست.</li>
              ) : null}
            </ul>
          </div>
          <div className="admin-card p-5">
            <h3 className="mb-3 text-sm font-semibold text-primary">درآمد به تفکیک منبع</h3>
            <ul className="space-y-2 text-sm">
              {topSources.map((row) => (
                <li
                  key={row.source}
                  className="flex items-center justify-between gap-2 border-b border-border/50 pb-2 last:border-0"
                >
                  <span>
                    {row.source}
                    <span className="mt-0.5 block text-xs text-muted">
                      {toPersianDigits(String(row.registrations))} ثبت‌نام
                    </span>
                  </span>
                  <span className="font-medium">
                    {formatTomansFromRials(row.revenueRials)}
                  </span>
                </li>
              ))}
              {topSources.length === 0 ? (
                <li className="text-muted">هنوز داده‌ای نیست.</li>
              ) : null}
            </ul>
          </div>
        </div>
      </section>
      <Suspense fallback={<CrmDashboardInsightsSkeleton />}>
        <CrmDashboardInsightsSection session={session} />
      </Suspense>
      <section className="admin-card mb-7 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold text-primary">عملکرد تماس همکاران امروز</h2>
          <Link href="/admin/reports/staff-performance" className="text-sm text-secondary">گزارش کامل</Link>
        </div>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {callsByStaff.map((item) => <li key={item.id} className="rounded-lg border border-border p-3 text-sm"><span className="font-medium">{item.name}</span><span className="mt-1 block text-xs text-muted">{item.count} تماس</span></li>)}
          {callsByStaff.length === 0 && <li className="text-sm text-muted">امروز تماسی ثبت نشده است.</li>}
        </ul>
      </section>
      <AdminMetricGrid
        items={dashboardStats}
        heading="کارت‌های آماری"
        headingId="dashboard-stats-heading"
      />

      <AdminSection
        title="دسترسی سریع"
        headingId="quick-actions-heading"
        className="mt-8"
      >
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {dashboardQuickActions.map((action) => (
            <li key={action.label}>
              <AdminQuickAction action={action} />
            </li>
          ))}
        </ul>
      </AdminSection>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <AdminSection
          title="آمادگی فنی سکو"
          headingId="readiness-heading"
        >
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
