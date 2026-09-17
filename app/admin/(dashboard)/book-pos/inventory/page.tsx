import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CatalogImportWizard } from "@/components/admin/books/CatalogImportWizard";
import { InventoryManager } from "@/components/admin/book-pos/InventoryManager";
import { adminBreadcrumbs } from "@/content/admin";
import { requirePermission } from "@/lib/auth/require-admin";
import { listPosInventory } from "@/lib/commerce/pos/inventory";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "موجودی کتاب‌ها",
};

const GHALAMCHI_PUBLISHER = "کانون فرهنگی آموزش (قلم‌چی)";

export default async function BookPosInventoryPage() {
  const session = await requirePermission("commerce.products.manage");
  const rows = await listPosInventory(session.organization.id);

  return (
    <>
      <AdminPageHeader
        title="موجودی کتاب‌ها"
        description="مدیریت موجودی، افزایش و اصلاح تعداد، و تاریخچه حرکات — همه با ثبت سابقه."
        breadcrumbs={adminBreadcrumbs.bookPosInventory}
        compact
      />

      <section className="admin-card mb-6 p-5 sm:p-6">
        <h2 className="text-base font-semibold text-primary">تعریف کتاب</h2>
        <p className="mt-1 text-sm text-muted">
          کتاب جدید را دستی اضافه کنید یا فهرست را از اکسل وارد کنید.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/admin/commerce/products/new"
            className="inline-flex min-h-11 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-white"
          >
            افزودن دستی
          </Link>
        </div>
        <details className="mt-4 rounded-xl border border-border">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-primary [&::-webkit-details-marker]:hidden">
            ورود از اکسل ▾
          </summary>
          <div className="border-t border-border p-4">
            <CatalogImportWizard
              defaultPublisherName={GHALAMCHI_PUBLISHER}
              templateHref="/admin/book-pos/books/template.xlsx"
            />
          </div>
        </details>
      </section>

      <InventoryManager rows={rows} />
    </>
  );
}
