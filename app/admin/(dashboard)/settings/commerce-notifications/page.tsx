import type { Metadata } from "next";
import { CommerceNotificationSettingsForm } from "@/components/admin/commerce/CommerceNotificationSettingsForm";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { adminBreadcrumbs } from "@/content/admin";
import { requirePermission } from "@/lib/auth/require-admin";
import { getCommerceNotificationSettings } from "@/lib/commerce/notification-settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "اعلان‌های فروشگاه",
};

export default async function CommerceNotificationsSettingsPage() {
  const session = await requirePermission("commerce.orders.manage");
  const settings = await getCommerceNotificationSettings(
    session.organization.id,
  );

  return (
    <>
      <AdminPageHeader
        title="اعلان‌های فروشگاه"
        description="پیامک مدیران هنگام پرداخت موفق سفارش‌های فروشگاه"
        breadcrumbs={adminBreadcrumbs.commerceNotifications}
        compact
      />
      <CommerceNotificationSettingsForm
        enabled={settings.adminNotificationSmsEnabled}
        recipients={settings.recipients}
      />
    </>
  );
}
