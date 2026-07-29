import type { Metadata } from "next";
import Link from "next/link";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { adminBreadcrumbs } from "@/content/admin";
import { requirePermission } from "@/lib/auth/require-admin";
import { listAdminCommerceItems } from "@/lib/commerce/catalog/service";
import { formatRials } from "@/lib/registration/format";
import { formatJalaliDateTimeShort } from "@/lib/datetime/jalali";
import { toPersianDigits } from "@/lib/persian";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "محصولات فروشگاه",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "پیش‌نویس",
  ACTIVE: "فعال",
  OUT_OF_STOCK: "ناموجود",
  ARCHIVED: "بایگانی",
};

export default async function AdminCommerceProductsPage() {
  const session = await requirePermission("commerce.products.manage");
  const items = await listAdminCommerceItems(session.organization.id);

  return (
    <>
      <AdminPageHeader
        title="محصولات"
        description="مدیریت جزوه‌های فیزیکی و اقلام فروشگاه"
        breadcrumbs={adminBreadcrumbs.commerceProducts}
        compact
      />
      <div className="mb-4">
        <Link
          href="/admin/commerce/products/new"
          className="inline-flex min-h-10 items-center rounded-xl bg-primary px-4 text-sm font-medium text-white"
        >
          محصول جدید
        </Link>
      </div>

      {items.length === 0 ? (
        <AdminEmptyState
          title="هنوز محصولی ثبت نشده"
          description="اولین جزوه فیزیکی را اضافه کنید."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="min-w-full text-sm">
            <thead className="bg-background text-muted">
              <tr>
                <th className="px-4 py-3 text-right font-medium">عنوان</th>
                <th className="px-4 py-3 text-right font-medium">دسته</th>
                <th className="px-4 py-3 text-right font-medium">قیمت</th>
                <th className="px-4 py-3 text-right font-medium">موجودی</th>
                <th className="px-4 py-3 text-right font-medium">وضعیت</th>
                <th className="px-4 py-3 text-right font-medium">به‌روزرسانی</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/commerce/products/${item.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {item.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted" dir="ltr">
                      /shop/{item.slug}
                    </p>
                  </td>
                  <td className="px-4 py-3">{item.categoryTitle ?? "—"}</td>
                  <td className="px-4 py-3">
                    {formatRials(item.salePriceRials ?? item.basePriceRials)}
                  </td>
                  <td className="px-4 py-3">
                    {item.unlimitedStock
                      ? "نامحدود"
                      : toPersianDigits(String(item.stockQuantity ?? 0))}
                  </td>
                  <td className="px-4 py-3">
                    {STATUS_LABELS[item.status] ?? item.status}
                    {!item.isVisible ? (
                      <span className="mr-2 text-xs text-amber-700">مخفی</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {formatJalaliDateTimeShort(item.updatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
