import type { Metadata } from "next";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { adminBreadcrumbs } from "@/content/admin";
import { requirePermission } from "@/lib/auth/require-admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "دسته‌بندی‌های فروشگاه",
};

export default async function AdminCommerceCategoriesPage() {
  await requirePermission("commerce.categories.manage");

  return (
    <>
      <AdminPageHeader
        title="دسته‌بندی‌ها"
        description="دسته‌بندی‌های پویا و تودرتو — seed اولیه قابل ویرایش و حذف است"
        breadcrumbs={adminBreadcrumbs.commerceCategories}
        compact
      />
      <AdminEmptyState
        title="مدیریت دسته‌بندی‌ها به‌زودی"
        description="مدل و seed دسته‌ها آماده است. رابط ایجاد/ویرایش در فاز بعدی اضافه می‌شود."
      />
    </>
  );
}
