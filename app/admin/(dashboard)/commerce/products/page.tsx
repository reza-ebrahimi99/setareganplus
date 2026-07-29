import type { Metadata } from "next";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { adminBreadcrumbs } from "@/content/admin";
import { requirePermission } from "@/lib/auth/require-admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "محصولات فروشگاه",
};

export default async function AdminCommerceProductsPage() {
  await requirePermission("commerce.products.manage");

  return (
    <>
      <AdminPageHeader
        title="محصولات"
        description="کاتالوگ CommerceItem — کالا، خدمت، دوره، رویداد و …"
        breadcrumbs={adminBreadcrumbs.commerceProducts}
        compact
      />
      <AdminEmptyState
        title="مدیریت محصولات به‌زودی"
        description="مدل کاتالوگ آماده است. فرم ایجاد/ویرایش و اتصال دسته‌ها در فاز بعدی اضافه می‌شود."
      />
    </>
  );
}
