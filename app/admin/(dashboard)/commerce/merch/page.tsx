import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { toggleBookSkuMerchFlagAction } from "@/app/admin/(dashboard)/commerce/actions";
import { adminBreadcrumbs } from "@/content/admin";
import { requirePermission } from "@/lib/auth/require-admin";
import { listAdminCommerceItems } from "@/lib/commerce/catalog/service";
import { listAdminCommerceCategoriesManage } from "@/lib/commerce/categories/service";
import { STARBOOK_CAMPAIGNS } from "@/lib/commerce/starbook/campaigns";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "مرچندایز استاربوک",
};

export default async function AdminCommerceMerchPage() {
  const session = await requirePermission("commerce.products.manage");
  const [items, categories] = await Promise.all([
    listAdminCommerceItems(session.organization.id),
    listAdminCommerceCategoriesManage(session.organization.id),
  ]);
  const featured = items.filter((item) => item.isFeatured);

  return (
    <>
      <AdminPageHeader
        title="استودیو ویترین"
        description="بنر خانه، کتاب ویژه و کمپین‌ها — همه روی BookSku و CommerceCategory"
        breadcrumbs={adminBreadcrumbs.commerceMerch}
        compact
      />
      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        {STARBOOK_CAMPAIGNS.map((campaign) => (
          <article key={campaign.slug} className="rounded-2xl border border-border bg-surface p-4">
            <p className="text-xs text-muted">{campaign.eyebrow}</p>
            <h2 className="mt-2 font-bold">{campaign.title}</h2>
            <p className="mt-2 text-sm leading-7 text-muted">{campaign.subtitle}</p>
            <Link href={campaign.href} className="mt-3 inline-block text-sm text-primary">
              مشاهده در استاربوک
            </Link>
          </article>
        ))}
      </section>
      <section className="mb-6">
        <h2 className="mb-3 text-base font-bold">کتاب‌های ویژه خانه</h2>
        <div className="grid gap-2">
          {items.slice(0, 24).map((item) => (
            <form
              key={item.id}
              action={toggleBookSkuMerchFlagAction}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3"
            >
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="text-xs text-muted">
                  {item.categoryTitle ?? "بدون کالکشن"} · {item.isVisible ? "نمایان" : "مخفی"}
                </p>
              </div>
              <input type="hidden" name="skuId" value={item.id} />
              <input type="hidden" name="field" value="isFeatured" />
              <input type="hidden" name="value" value={item.isFeatured ? "false" : "true"} />
              <button type="submit" className="rounded-full border border-border px-3 py-1 text-xs">
                {item.isFeatured ? "برداشتن از ویژه" : "ویژه خانه"}
              </button>
            </form>
          ))}
        </div>
        {featured.length === 0 ? (
          <p className="mt-3 text-sm text-muted">هنوز کتاب ویژه‌ای انتخاب نشده.</p>
        ) : null}
      </section>
      <section>
        <h2 className="mb-3 text-base font-bold">بنر کالکشن‌ها</h2>
        <p className="mb-3 text-sm text-muted">
          ویژه کردن یک دسته، آن را روی خانه و صفحه کالکشن‌ها برجسته می‌کند.
        </p>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <Link
              key={category.id}
              href="/admin/commerce/categories"
              className="rounded-full border border-border px-3 py-1 text-sm"
            >
              {category.title}
              {category.isFeatured ? " · بنر" : ""}
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
