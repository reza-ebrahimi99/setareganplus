import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { dashboardStats, platformReadiness } from "@/content/admin";

export const metadata: Metadata = {
  title: "نمای کلی",
};

export default function AdminDashboardPage() {
  return (
    <>
      <AdminPageHeader
        title="نمای کلی مدیریت"
        description="پیش‌نمایش داشبورد مدیریت و CRM. داده‌های عملیاتی پس از اتصال پایگاه داده و احراز هویت نمایش داده می‌شوند."
      />

      <section aria-labelledby="dashboard-stats-heading" className="mb-8">
        <h2 id="dashboard-stats-heading" className="sr-only">
          کارت‌های آماری
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {dashboardStats.map((stat) => (
            <li key={stat.label}>
              <AdminStatCard label={stat.label} />
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section aria-labelledby="crm-access-heading">
          <div className="admin-card h-full p-6">
            <h2
              id="crm-access-heading"
              className="text-lg font-semibold text-primary"
            >
              دسترسی سریع CRM
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted">
              فهرست متقاضیان و پرونده‌های پیگیری پس از اتصال سامانه در این بخش
              فعال می‌شود.
            </p>
            <Link
              href="/admin/leads"
              className="mt-5 inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
            >
              مشاهده متقاضیان
            </Link>
          </div>
        </section>

        <section aria-labelledby="readiness-heading">
          <div className="admin-card h-full p-6">
            <h2
              id="readiness-heading"
              className="text-lg font-semibold text-primary"
            >
              آمادگی فنی سکو
            </h2>
            <ul className="mt-4 space-y-3">
              {platformReadiness.map((item) => (
                <li
                  key={item.label}
                  className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background px-4 py-3"
                >
                  <span className="text-sm text-foreground">{item.label}</span>
                  <span
                    className={
                      item.tone === "ready"
                        ? "rounded-full border border-success/20 bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success"
                        : item.tone === "pending"
                          ? "rounded-full border border-secondary/30 bg-secondary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                          : "rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-muted"
                    }
                  >
                    {item.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </>
  );
}
