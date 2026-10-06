import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { adminBreadcrumbs } from "@/content/admin";
import { requirePermission } from "@/lib/auth/require-admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "کدهای نمایشی استاربوک",
};

export default async function AdminCommerceCouponsPage() {
  await requirePermission("commerce.products.manage");

  return (
    <>
      <AdminPageHeader
        title="کوپن‌ها"
        description="کد STAR7 فعلاً نمایشی است و هنوز روی مبلغ تخفیف سفارش اعمال نمی‌شود."
        breadcrumbs={adminBreadcrumbs.commerceCoupons}
        compact
      />
      <article className="max-w-xl rounded-2xl border border-border bg-surface p-5">
        <p className="text-xs text-muted">کد فعال ویترین</p>
        <h2 className="mt-2 text-2xl font-black tracking-wider" dir="ltr">
          STAR7
        </h2>
        <p className="mt-3 text-sm leading-7 text-muted">
          ۷٪ تخفیف نمایشی در سبد دانش‌آموز. پرداخت واقعی همان قیمت فروش کتاب است.
        </p>
      </article>
    </>
  );
}
