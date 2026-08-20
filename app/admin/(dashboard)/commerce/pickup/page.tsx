import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { PickupLookupForm } from "@/components/admin/commerce/PickupLookupForm";
import { adminBreadcrumbs } from "@/content/admin";
import { requirePermission } from "@/lib/auth/require-admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "میز دریافت جزوه",
};

export default async function CommercePickupIndexPage() {
  await requirePermission("commerce.orders.view");
  return (
    <>
      <AdminPageHeader
        title="میز دریافت"
        description="یک اسکن QR، پرونده سفارش، یک کلیک تحویل"
        breadcrumbs={adminBreadcrumbs.commercePickup}
        compact
      />
      <PickupLookupForm />
    </>
  );
}
