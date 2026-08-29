import type { Metadata } from "next";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { SitePlacementsManager } from "@/components/admin/settings/SitePlacementsManager";
import { adminBreadcrumbs } from "@/content/admin";
import { loadAdminSitePlacements } from "@/lib/site/load-admin-site-placements";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "جایگاه‌های سایت",
};

export default async function AdminSitePlacementsPage() {
  const result = await loadAdminSitePlacements();

  if (!result.ok) {
    return (
      <>
        <AdminPageHeader
          title="جایگاه‌های سایت"
          description="اتصال فرم و رزرو به صفحات عمومی"
          breadcrumbs={[...adminBreadcrumbs.sitePlacements]}
          showNotice
          compact
        />
        <div
          role="alert"
          className="admin-card border-red-200 bg-red-50 px-5 py-4 text-sm leading-7 text-red-800"
        >
          بارگذاری تنظیمات جایگاه‌ها ممکن نشد. اتصال پایگاه داده را بررسی کنید.
        </div>
      </>
    );
  }

  const { forms, bookingServices, placements } = result.data;

  return (
    <>
      <AdminPageHeader
        title="جایگاه‌های سایت"
        description="انتخاب فرم‌ها و خدمت‌های رزرو برای صفحات پیش‌ثبت‌نام و مشاوره — بدون نیاز به ویرایش سرور"
        breadcrumbs={[...adminBreadcrumbs.sitePlacements]}
        showNotice
        compact
      />

      {forms.length === 0 && bookingServices.length === 0 ? (
        <AdminEmptyState
          title="هنوز محتوایی برای اتصال نیست"
          description="ابتدا یک فرم را منتشر کنید یا یک خدمت نوبت‌دهی فعال بسازید، سپس به این صفحه برگردید."
        />
      ) : (
        <SitePlacementsManager
          forms={forms}
          bookingServices={bookingServices}
          placements={placements}
        />
      )}
    </>
  );
}
