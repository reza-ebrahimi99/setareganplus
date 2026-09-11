import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { adminBreadcrumbs } from "@/content/admin";
import { requirePermission } from "@/lib/auth/require-admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "نظرات استاربوک",
};

export default async function AdminCommerceReviewsPage() {
  await requirePermission("commerce.view");

  return (
    <>
      <AdminPageHeader
        title="نظر و امتیاز"
        description="پیشنهاد دبیر و مشاور روی صفحه کتاب است. امتیاز دانش‌آموز فعلاً روی دستگاه خودش ذخیره می‌شود — جدول Review جدا نساختیم."
        breadcrumbs={adminBreadcrumbs.commerceReviews}
        compact
      />
      <article className="max-w-2xl rounded-2xl border border-border bg-surface p-5 text-sm leading-8 text-muted">
        متن پیشنهاد دبیر/مشاور از توضیح BookTitle و ویژگی‌های BookSku می‌آید. برای تغییر، همان
        محصول را در کاتالوگ ویرایش کنید. امتیاز ستاره‌ای دانش‌آموز در مرورگر است تا سفارش و
        کاتالوگ واحد دست‌نخورده بماند.
      </article>
    </>
  );
}
