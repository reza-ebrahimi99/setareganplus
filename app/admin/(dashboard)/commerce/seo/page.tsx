import type { Metadata } from "next";
import Link from "next/link";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { adminBreadcrumbs } from "@/content/admin";
import { requirePermission } from "@/lib/auth/require-admin";
import { listAdminCommerceSeoRows } from "@/lib/commerce/catalog/service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "سئوی استاربوک",
};

export default async function AdminCommerceSeoPage() {
  const session = await requirePermission("commerce.products.manage");
  const rows = await listAdminCommerceSeoRows(session.organization.id);

  return (
    <>
      <AdminPageHeader
        title="سئو"
        description="metaTitle و metaDescription روی همان BookSku"
        breadcrumbs={adminBreadcrumbs.commerceSeo}
        compact
      />
      {rows.length === 0 ? (
        <AdminEmptyState title="کاتالوگی نیست" description="اول کتاب را در محصولات ثبت کنید." />
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <article key={row.id} className="rounded-2xl border border-border bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-bold">{row.title.title}</h2>
                <Link
                  href={`/admin/commerce/products/${row.id}`}
                  className="text-sm text-primary"
                >
                  ویرایش متا
                </Link>
              </div>
              <p className="mt-1 text-xs text-muted" dir="ltr">
                /shop/{row.slug}
              </p>
              <p className="mt-3 text-sm">
                {row.metaTitle || "بدون عنوان سئو — عنوان کتاب استفاده می‌شود"}
              </p>
              <p className="mt-1 text-sm text-muted">
                {row.metaDescription || "بدون توضیح سئو"}
              </p>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
