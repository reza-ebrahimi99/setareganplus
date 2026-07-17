import Link from "next/link";
import { hasPermission } from "@/lib/auth/permissions";
import type { AdminSessionContext } from "@/lib/auth/require-admin";
import { loadCrmDashboardInsights } from "@/lib/crm/dashboard-insights";
import { toPersianDigits } from "@/lib/persian";

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function number(value: number): string {
  return toPersianDigits(value);
}

export function CrmDashboardInsightsSkeleton() {
  return (
    <section
      className="mb-7 space-y-5"
      aria-label="در حال بارگذاری شاخص‌های CRM"
      aria-busy="true"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {Array.from({ length: 7 }, (_, index) => (
          <div
            key={index}
            className="admin-card h-24 animate-pulse bg-slate-50"
          />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="admin-card h-64 animate-pulse bg-slate-50" />
        <div className="admin-card h-64 animate-pulse bg-slate-50" />
      </div>
    </section>
  );
}

export async function CrmDashboardInsightsSection({
  session,
}: {
  session: AdminSessionContext;
}) {
  const result = await loadCrmDashboardInsights(session);
  if (!result.ok) {
    return (
      <section className="admin-card mb-7 border-red-200 bg-red-50 p-5" role="alert">
        <h2 className="font-semibold text-red-900">شاخص‌های مدیریت CRM</h2>
        <p className="mt-2 text-sm text-red-800">{result.error}</p>
      </section>
    );
  }

  const { overview, advisors, recentImports, alerts } = result.data;
  const canImport = hasPermission(session, "crm.import_leads");
  const managerScope = result.data.canViewAllAdvisors ? "all" : "mine";
  const overviewCards = [
    {
      label: "کل لیدها",
      value: overview.total,
      href: `/admin/leads?scope=${managerScope}`,
    },
    {
      label: "لیدهای تخصیص‌یافته",
      value: overview.assigned,
      href: `/admin/leads?scope=${managerScope}&assignment=assigned`,
    },
    {
      label: "لیدهای بدون مسئول",
      value: overview.unassigned,
      href: result.data.canViewAllAdvisors
        ? "/admin/leads?scope=unassigned"
        : "/admin/leads?scope=mine",
    },
    {
      label: "لید جدید امروز",
      value: overview.newToday,
      href: `/admin/leads?scope=${managerScope}&created=today`,
    },
    {
      label: "ورودی امروز",
      value: overview.importedToday,
      href: `/admin/leads?scope=${managerScope}&sourceType=IMPORT&created=today`,
    },
    {
      label: "ثبت‌نام‌شده",
      value: overview.registered,
      href: `/admin/leads?scope=${managerScope}&outcome=registered`,
    },
    {
      label: "از دست‌رفته",
      value: overview.lost,
      href: `/admin/leads?scope=${managerScope}&outcome=lost`,
    },
  ];
  const quickActions = [
    {
      label: "باز کردن لیدهای CRM",
      href: `/admin/leads?scope=${managerScope}`,
    },
    ...(canImport
      ? [{ label: "ورود Excel / CSV", href: "/admin/crm/import" }]
      : []),
    ...(result.data.canViewAllAdvisors
      ? [{ label: "لیدهای بدون مسئول", href: "/admin/leads?scope=unassigned" }]
      : []),
    { label: "لیدهای من", href: "/admin/leads?scope=mine" },
    ...(result.data.latestImportReportId
      ? [{
          label: "آخرین گزارش ورود",
          href: `/admin/crm/import/reports/${result.data.latestImportReportId}`,
        }]
      : []),
  ];

  return (
    <section className="mb-7 space-y-5" aria-labelledby="crm-insights-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-secondary">مدیریت فروش و پذیرش</p>
          <h2 id="crm-insights-heading" className="mt-1 text-lg font-bold text-primary">
            نمای مدیریتی CRM
          </h2>
        </div>
        <Link href="/admin/crm" className="text-sm font-medium text-secondary">
          مشاهده تابلوی CRM ←
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {overviewCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="admin-card group p-4 transition hover:-translate-y-0.5 hover:border-secondary/40 hover:shadow-sm"
          >
            <span className="text-xs text-muted">{card.label}</span>
            <strong className="mt-2 block text-2xl text-primary">
              {number(card.value)}
            </strong>
            <span className="mt-2 block text-[11px] text-secondary opacity-0 transition-opacity group-hover:opacity-100">
              مشاهده لیدها ←
            </span>
          </Link>
        ))}
      </div>

      <div className="grid gap-5 2xl:grid-cols-[1.35fr_1fr]">
        <section className="admin-card overflow-hidden" aria-labelledby="advisor-distribution-heading">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-5">
            <div>
              <h3 id="advisor-distribution-heading" className="font-semibold text-primary">
                توزیع لید بین مشاوران
              </h3>
              {!result.data.canViewAllAdvisors ? (
                <p className="mt-1 text-xs text-muted">فقط عملکرد شخصی شما نمایش داده می‌شود.</p>
              ) : null}
            </div>
            <Link href="/admin/reports/staff-performance" className="text-xs text-secondary">
              گزارش عملکرد
            </Link>
          </div>
          {advisors.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-right text-sm">
                <thead className="bg-background text-xs text-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">مشاور</th>
                    <th className="px-3 py-3 font-medium">کل</th>
                    <th className="px-3 py-3 font-medium">فعال</th>
                    <th className="px-3 py-3 font-medium">ثبت‌نام</th>
                    <th className="px-3 py-3 font-medium">از دست‌رفته</th>
                    <th className="px-4 py-3 font-medium">نرخ تبدیل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {advisors.map((advisor) => (
                    <tr key={advisor.ownerUserId} className="hover:bg-background/60">
                      <td className="px-4 py-3 font-medium text-primary">
                        <Link href={`/admin/leads?scope=all&owner=${encodeURIComponent(advisor.ownerUserId)}`}>
                          {advisor.ownerName}
                        </Link>
                      </td>
                      <td className="px-3 py-3">{number(advisor.total)}</td>
                      <td className="px-3 py-3">{number(advisor.active)}</td>
                      <td className="px-3 py-3 text-emerald-700">{number(advisor.registered)}</td>
                      <td className="px-3 py-3 text-red-700">{number(advisor.lost)}</td>
                      <td className="px-4 py-3 font-semibold">
                        {toPersianDigits(advisor.conversionRate.toFixed(1))}٪
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="p-5 text-sm text-muted">هنوز لیدی به مشاوران تخصیص داده نشده است.</p>
          )}
        </section>

        <section className="admin-card p-5" aria-labelledby="crm-alerts-heading">
          <h3 id="crm-alerts-heading" className="font-semibold text-primary">
            هشدارهای مدیریتی
          </h3>
          {alerts.length ? (
            <ul className="mt-3 space-y-2">
              {alerts.map((alert) => (
                <li key={alert.id}>
                  <Link
                    href={alert.href}
                    className={`block rounded-xl border p-3 text-sm ${
                      alert.tone === "danger"
                        ? "border-red-200 bg-red-50 text-red-900"
                        : "border-amber-200 bg-amber-50 text-amber-950"
                    }`}
                  >
                    <strong className="block">{alert.label}</strong>
                    <span className="mt-1 block text-xs opacity-80">{toPersianDigits(alert.detail)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              در حال حاضر هشدار مدیریتی فعالی وجود ندارد.
            </div>
          )}
        </section>
      </div>

      <section id="crm-recent-imports" className="admin-card overflow-hidden" aria-labelledby="recent-imports-heading">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
          <h3 id="recent-imports-heading" className="font-semibold text-primary">
            آخرین ورودهای CRM
          </h3>
          {canImport ? (
            <Link href="/admin/crm/import" className="text-sm text-secondary">
              ورود فایل جدید
            </Link>
          ) : null}
        </div>
        {recentImports.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-right text-sm">
              <thead className="bg-background text-xs text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">زمان / کاربر</th>
                  <th className="px-3 py-3 font-medium">ردیف اصلی</th>
                  <th className="px-3 py-3 font-medium">واردشده</th>
                  <th className="px-3 py-3 font-medium">به‌روزرسانی</th>
                  <th className="px-3 py-3 font-medium">تکراری / ردشده</th>
                  <th className="px-3 py-3 font-medium">نامعتبر / خطا</th>
                  <th className="px-3 py-3 font-medium">تخصیص مسئول</th>
                  <th className="px-4 py-3 font-medium">گزارش</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentImports.map((report) => (
                  <tr key={report.id} className="align-top hover:bg-background/60">
                    <td className="px-4 py-3">
                      <strong className="block text-primary">{formatDateTime(report.createdAt)}</strong>
                      <span className="mt-1 block text-xs text-muted">{report.importedBy}</span>
                    </td>
                    <td className="px-3 py-3">{number(report.total)}</td>
                    <td className="px-3 py-3 text-emerald-700">{number(report.created)}</td>
                    <td className="px-3 py-3">{number(report.updated)}</td>
                    <td className="px-3 py-3">
                      {number(report.duplicates)} / {number(report.skipped)}
                    </td>
                    <td className="px-3 py-3 text-red-700">
                      {number(report.invalid)} / {number(report.failed)}
                    </td>
                    <td className="max-w-64 px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        {report.ownerDistribution.map((owner) => (
                          <span key={owner.ownerUserId ?? "none"} className="rounded-full bg-slate-100 px-2 py-1 text-[11px]">
                            {owner.ownerName}: {number(owner.count)}
                          </span>
                        ))}
                        {!report.ownerDistribution.length ? (
                          <span className="text-xs text-muted">بدون تخصیص</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <a href={`/admin/crm/import/reports/${report.id}`} className="text-secondary">
                        دریافت CSV
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-5 text-sm text-muted">
            هنوز گزارش ورود CRM برای دامنه قابل دسترس شما ثبت نشده است.
          </p>
        )}
      </section>

      <section className="admin-card p-5" aria-labelledby="crm-quick-actions-heading">
        <h3 id="crm-quick-actions-heading" className="font-semibold text-primary">
          دسترسی سریع CRM
        </h3>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {quickActions.map((action) => (
            <li key={action.label}>
              <Link
                href={action.href}
                className="flex h-full items-center justify-between rounded-xl border border-border px-4 py-3 text-sm font-medium text-primary transition hover:border-secondary/40 hover:bg-background"
              >
                {action.label}
                <span className="text-secondary">←</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}
