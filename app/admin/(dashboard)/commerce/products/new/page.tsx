import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CommerceProductForm } from "@/components/admin/commerce/CommerceProductForm";
import { adminBreadcrumbs } from "@/content/admin";
import { requirePermission } from "@/lib/auth/require-admin";
import { listAdminCommerceCategories } from "@/lib/commerce/catalog/service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "محصول جدید",
};

export default async function AdminCommerceProductNewPage() {
  const session = await requirePermission("commerce.products.manage");
  const categories = await listAdminCommerceCategories(session.organization.id);

  return (
    <>
      <AdminPageHeader
        title="محصول جدید"
        description="ثبت جزوه فیزیکی برای فروش حضوری"
        breadcrumbs={[
          ...adminBreadcrumbs.commerceProducts,
          { label: "جدید" },
        ]}
        compact
      />
      <CommerceProductForm mode="create" categories={categories} />
    </>
  );
}
