import type { Metadata } from "next";
import { AdminMetricGrid } from "@/components/admin/AdminMetricGrid";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminQuickAction } from "@/components/admin/AdminQuickAction";
import { AdminReadinessItem } from "@/components/admin/AdminReadinessItem";
import { AdminSection } from "@/components/admin/AdminSection";
import { AdminSystemCard } from "@/components/admin/AdminSystemCard";
import { AdminTaskEmpty } from "@/components/admin/AdminTaskEmpty";
import { AdminTimelineEmpty } from "@/components/admin/AdminTimelineEmpty";
import {
  adminBreadcrumbs,
  dashboardQuickActions,
  dashboardStats,
  platformReadiness,
} from "@/content/admin";

export const metadata: Metadata = {
  title: "نمای کلی",
};

export default function AdminDashboardPage() {
  return (
    <>
      <AdminPageHeader
        title="نمای کلی مدیریت"
        description="پیش‌نمایش داشبورد مدیریت آموزشی. اطلاعات عملیاتی پس از اتصال پایگاه داده و احراز هویت بارگذاری می‌شوند."
        breadcrumbs={adminBreadcrumbs.dashboard}
        showNotice
      />

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
