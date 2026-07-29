import type { Metadata } from "next";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { adminBreadcrumbs } from "@/content/admin";
import { requirePermission } from "@/lib/auth/require-admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "سفارش‌های فروشگاه",
};

export default async function AdminCommerceOrdersPage() {
  await requirePermission("commerce.orders.view");

  return (
    <>
      <AdminPageHeader
        title="سفارش‌ها"
        description="سفارش‌های مستقل از ثبت‌نام — foundation آماده است"
        breadcrumbs={adminBreadcrumbs.commerceOrders}
        compact
      />
      <AdminEmptyState
        title="هنوز سفارشی ثبت نشده"
        description="Checkout عمومی و ایجاد سفارش در فازهای بعدی فعال می‌شود."
      />
    </>
  );
}
