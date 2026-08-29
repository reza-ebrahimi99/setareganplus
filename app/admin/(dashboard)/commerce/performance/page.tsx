import type { Metadata } from "next";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { adminBreadcrumbs } from "@/content/admin";
import { requirePermission } from "@/lib/auth/require-admin";
import { loadStaffOpsDashboard } from "@/lib/commerce/orders/performance";
import { toPersianDigits } from "@/lib/persian";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "عملکرد عملیات جزوه",
};

export default async function CommercePerformancePage() {
  const session = await requirePermission("commerce.orders.view");
  const allowedBranchIds = session.membership.allBranches
    ? null
    : session.membership.branchIds;
  const dashboard = await loadStaffOpsDashboard({
    organizationId: session.organization.id,
    userId: session.user.id,
    allowedBranchIds,
  });

  const cards = [
    { label: "تولید امروز", value: dashboard.todayProduction },
    { label: "تحویل امروز", value: dashboard.todayDeliveries },
    { label: "در انتظار دریافت", value: dashboard.pendingPickup },
    { label: "سفارش‌های معوق", value: dashboard.delayedOrders },
    { label: "محول‌شده به من", value: dashboard.assignedToMe },
    { label: "تکمیل امروز من", value: dashboard.completedToday },
  ];

  return (
    <>
      <AdminPageHeader
        title="داشبورد کارکنان"
        description="تولید، تحویل، تأخیر و جدول عملکرد"
        breadcrumbs={adminBreadcrumbs.commercePerformance}
        compact
      />
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {cards.map((card) => (
          <article key={card.label} className="admin-glass px-4 py-4">
            <p className="text-xs text-muted">{card.label}</p>
            <p className="mt-2 text-2xl font-bold text-primary">{toPersianDigits(card.value)}</p>
          </article>
        ))}
      </section>
      <section className="mt-4 grid gap-3 sm:grid-cols-2">
        <article className="admin-glass px-4 py-4">
          <p className="text-xs text-muted">میانگین پردازش امروز</p>
          <p className="mt-2 text-xl font-bold">
            {dashboard.avgProcessingMinutes != null
              ? `${toPersianDigits(dashboard.avgProcessingMinutes)} دقیقه`
              : "—"}
          </p>
        </article>
        <article className="admin-glass px-4 py-4">
          <p className="text-xs text-muted">میانگین تحویل امروز</p>
          <p className="mt-2 text-xl font-bold">
            {dashboard.avgDeliveryMinutes != null
              ? `${toPersianDigits(dashboard.avgDeliveryMinutes)} دقیقه`
              : "—"}
          </p>
        </article>
      </section>
      {dashboard.leaderboard.length === 0 ? (
        <div className="mt-6">
          <AdminEmptyState
            title="هنوز آماری برای جدول رتبه نیست"
            description="پس از تخصیص مسئول و تحویل سفارش‌ها، عملکرد اینجا دیده می‌شود."
          />
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="min-w-full text-sm">
            <thead className="bg-background text-muted">
              <tr>
                <th className="px-4 py-3 text-right font-medium">کارمند</th>
                <th className="px-4 py-3 text-right font-medium">تحویل امروز</th>
                <th className="px-4 py-3 text-right font-medium">تولید امروز</th>
                <th className="px-4 py-3 text-right font-medium">این هفته</th>
                <th className="px-4 py-3 text-right font-medium">میانگین تحویل</th>
                <th className="px-4 py-3 text-right font-medium">معوق</th>
                <th className="px-4 py-3 text-right font-medium">آماده نزد او</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.leaderboard.map((row) => (
                <tr key={row.userId} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{row.name}</td>
                  <td className="px-4 py-3">{toPersianDigits(row.todayDeliveries)}</td>
                  <td className="px-4 py-3">{toPersianDigits(row.todayProduction)}</td>
                  <td className="px-4 py-3">{toPersianDigits(row.weekDeliveries)}</td>
                  <td className="px-4 py-3">
                    {row.avgDeliveryMinutes != null
                      ? `${toPersianDigits(row.avgDeliveryMinutes)} دقیقه`
                      : "—"}
                  </td>
                  <td className="px-4 py-3">{toPersianDigits(row.delayed)}</td>
                  <td className="px-4 py-3">{toPersianDigits(row.pendingPickup)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
