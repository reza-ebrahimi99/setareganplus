import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { requirePermission } from "@/lib/auth/require-admin";
import { getLeadRegistrationConversionReport } from "@/lib/registration/lead-conversion-analytics";
import { formatTomansFromRials } from "@/lib/registration/format";
import { toPersianDigits } from "@/lib/persian";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "تبدیل لید به ثبت‌نام",
};

export default async function LeadRegistrationConversionReportPage() {
  const session = await requirePermission("reports.view");
  const report = await getLeadRegistrationConversionReport(
    session.organization.id,
  );

  return (
    <>
      <AdminPageHeader
        title="تبدیل لید → ثبت‌نام"
        description="نرخ تبدیل، درآمد مشاوران و منابع جذب"
        breadcrumbs={[
          { label: "مدیریت", href: "/admin" },
          { label: "گزارش‌ها" },
          { label: "تبدیل لید" },
        ]}
        compact
      />

      <div className="mb-4 flex justify-end">
        <a
          href="/admin/reports/lead-conversion/export"
          className="rounded-xl border border-border bg-white px-3 py-2 text-xs font-medium text-secondary"
        >
          خروجی CSV
        </a>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Widget
          label="ثبت‌نام امروز"
          value={toPersianDigits(String(report.todayRegistrations))}
        />
        <Widget
          label="تبدیل لید امروز"
          value={toPersianDigits(String(report.todayLeadConversions))}
        />
        <Widget
          label="نرخ تبدیل"
          value={`${toPersianDigits(String(Math.round(report.conversionRate * 100)))}٪`}
        />
        <Widget
          label="میانگین روز تا ثبت‌نام"
          value={
            report.averageDaysToRegister != null
              ? toPersianDigits(String(report.averageDaysToRegister))
              : "—"
          }
        />
      </div>

      <section className="mb-8 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-primary">عملکرد مشاوران</h2>
          <Link href="/admin/crm" className="text-xs text-secondary hover:underline">
            تابلوی CRM
          </Link>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-border bg-white">
          <table className="min-w-full text-sm">
            <thead className="border-b border-border bg-slate-50 text-muted">
              <tr>
                <th className="px-3 py-2.5 text-right font-medium">مشاور</th>
                <th className="px-3 py-2.5 text-right font-medium">لید</th>
                <th className="px-3 py-2.5 text-right font-medium">ثبت‌نام</th>
                <th className="px-3 py-2.5 text-right font-medium">پرداخت‌شده</th>
                <th className="px-3 py-2.5 text-right font-medium">درآمد</th>
                <th className="px-3 py-2.5 text-right font-medium">نرخ تبدیل</th>
              </tr>
            </thead>
            <tbody>
              {report.byConsultant.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-muted">
                    داده‌ای نیست.
                  </td>
                </tr>
              ) : (
                report.byConsultant.map((row) => (
                  <tr key={row.ownerUserId} className="border-b border-border/60">
                    <td className="px-3 py-2.5 font-medium">{row.ownerName}</td>
                    <td className="px-3 py-2.5 tabular-nums">
                      {toPersianDigits(String(row.leads))}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">
                      {toPersianDigits(String(row.registrations))}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">
                      {toPersianDigits(String(row.paidRegistrations))}
                    </td>
                    <td className="px-3 py-2.5">
                      {formatTomansFromRials(row.revenueRials)}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">
                      {toPersianDigits(
                        String(Math.round(row.conversionRate * 100)),
                      )}
                      ٪
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold text-primary">تبدیل بر اساس منبع</h2>
        <div className="overflow-x-auto rounded-2xl border border-border bg-white">
          <table className="min-w-full text-sm">
            <thead className="border-b border-border bg-slate-50 text-muted">
              <tr>
                <th className="px-3 py-2.5 text-right font-medium">منبع</th>
                <th className="px-3 py-2.5 text-right font-medium">لید</th>
                <th className="px-3 py-2.5 text-right font-medium">ثبت‌نام</th>
                <th className="px-3 py-2.5 text-right font-medium">درآمد</th>
                <th className="px-3 py-2.5 text-right font-medium">نرخ تبدیل</th>
              </tr>
            </thead>
            <tbody>
              {report.bySource.map((row) => (
                <tr key={row.source} className="border-b border-border/60">
                  <td className="px-3 py-2.5 font-medium">{row.source}</td>
                  <td className="px-3 py-2.5 tabular-nums">
                    {toPersianDigits(String(row.leads))}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">
                    {toPersianDigits(String(row.registrations))}
                  </td>
                  <td className="px-3 py-2.5">
                    {formatTomansFromRials(row.revenueRials)}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">
                    {toPersianDigits(
                      String(Math.round(row.conversionRate * 100)),
                    )}
                    ٪
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function Widget({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-2 text-xl font-bold text-primary tabular-nums">{value}</p>
    </div>
  );
}
