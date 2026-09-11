import type { Metadata } from "next";
import Link from "next/link";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CommerceCategoryForm } from "@/components/admin/commerce/CommerceCategoryForm";
import { adminBreadcrumbs } from "@/content/admin";
import {
  archiveCommerceCategoryAction,
  toggleCommerceCategoryFlagAction,
} from "@/app/admin/(dashboard)/commerce/actions";
import { requirePermission } from "@/lib/auth/require-admin";
import { listAdminCommerceCategoriesManage } from "@/lib/commerce/categories/service";
import { toPersianDigits } from "@/lib/persian";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "کالکشن‌های استاربوک",
};

type PageProps = {
  searchParams: Promise<{ edit?: string }>;
};

export default async function AdminCommerceCategoriesPage({ searchParams }: PageProps) {
  const session = await requirePermission("commerce.categories.manage");
  const { edit } = await searchParams;
  const categories = await listAdminCommerceCategoriesManage(session.organization.id);
  const editing = categories.find((item) => item.id === edit) ?? null;

  return (
    <>
      <AdminPageHeader
        title="کالکشن‌ها"
        description="دسته‌بندی فروشگاهی روی همان BookSku — بدون کاتالوگ دوم"
        breadcrumbs={adminBreadcrumbs.commerceCategories}
        compact
      />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
        <section className="space-y-3">
          {categories.length === 0 ? (
            <AdminEmptyState
              title="هنوز کالکشنی نیست"
              description="اولین قفسه فروشگاهی را بسازید."
            />
          ) : (
            categories.map((category) => (
              <article
                key={category.id}
                className="rounded-2xl border border-border bg-surface p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-bold text-foreground">{category.title}</h2>
                    <p className="mt-1 text-xs text-muted" dir="ltr">
                      /shop/collections/{category.slug}
                    </p>
                    <p className="mt-2 text-sm text-muted">
                      {category.parentTitle ? `زیر ${category.parentTitle} · ` : ""}
                      {toPersianDigits(category.productCount)} کتاب
                      {category.isFeatured ? " · بنر خانه" : ""}
                      {category.isVisible ? "" : " · مخفی"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/admin/commerce/categories?edit=${category.id}`}
                      className="rounded-full border border-border px-3 py-1 text-xs"
                    >
                      ویرایش
                    </Link>
                    <form action={toggleCommerceCategoryFlagAction}>
                      <input type="hidden" name="categoryId" value={category.id} />
                      <input type="hidden" name="field" value="isFeatured" />
                      <input
                        type="hidden"
                        name="value"
                        value={category.isFeatured ? "false" : "true"}
                      />
                      <button
                        type="submit"
                        className="rounded-full border border-border px-3 py-1 text-xs"
                      >
                        {category.isFeatured ? "ویژه است" : "ویژه کن"}
                      </button>
                    </form>
                    <form action={toggleCommerceCategoryFlagAction}>
                      <input type="hidden" name="categoryId" value={category.id} />
                      <input type="hidden" name="field" value="isVisible" />
                      <input
                        type="hidden"
                        name="value"
                        value={category.isVisible ? "false" : "true"}
                      />
                      <button
                        type="submit"
                        className="rounded-full border border-border px-3 py-1 text-xs"
                      >
                        {category.isVisible ? "نمایان" : "مخفی"}
                      </button>
                    </form>
                    <form action={archiveCommerceCategoryAction}>
                      <input type="hidden" name="categoryId" value={category.id} />
                      <button
                        type="submit"
                        className="rounded-full border border-red-200 px-3 py-1 text-xs text-red-700"
                      >
                        بایگانی
                      </button>
                    </form>
                  </div>
                </div>
              </article>
            ))
          )}
        </section>
        <aside className="space-y-4">
          {editing ? (
            <>
              <h2 className="text-sm font-bold text-muted">ویرایش {editing.title}</h2>
              <CommerceCategoryForm mode="edit" parents={categories} defaults={editing} />
            </>
          ) : (
            <>
              <h2 className="text-sm font-bold text-muted">کالکشن تازه</h2>
              <CommerceCategoryForm mode="create" parents={categories} />
            </>
          )}
        </aside>
      </div>
    </>
  );
}
