import type { Metadata } from "next";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { adminBreadcrumbs } from "@/content/admin";
import { requirePermission } from "@/lib/auth/require-admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "پرداخت‌های فروشگاه",
};

export default async function AdminCommercePaymentsPage() {
  await requirePermission("commerce.payments.view");

  return (
    <>
      <AdminPageHeader
        title="پرداخت‌ها"
        description="پرداخت‌های با هدف COMMERCE_ORDER (پس از فعال‌سازی checkout)"
        breadcrumbs={adminBreadcrumbs.commercePayments}
        compact
      />
      <AdminEmptyState
        title="پرداخت فروشگاهی هنوز فعال نیست"
        description="PaymentIntent اکنون از payableType پشتیبانی می‌کند؛ شروع پرداخت فروشگاهی در فاز بعد متصل می‌شود."
      />
    </>
  );
}
