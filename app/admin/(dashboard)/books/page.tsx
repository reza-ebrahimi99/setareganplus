import type { Metadata } from "next";
import Link from "next/link";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { adminBreadcrumbs } from "@/content/admin";
import { BookSkuStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { requireBookCommerceAccess } from "@/lib/books/require";
import { toPersianDigits } from "@/lib/persian";

export const metadata: Metadata = {
  title: "بازرگانی کتاب",
};
export const dynamic = "force-dynamic";

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="admin-card p-5">
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className="mt-3 text-3xl font-bold tracking-tight text-primary">{value}</p>
      {hint ? <p className="mt-2 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

function SoonCard({ label }: { label: string }) {
  return (
    <div className="admin-card p-5">
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className="mt-3 text-2xl font-bold tracking-tight text-primary/40">به‌زودی</p>
      <p className="mt-2 text-xs text-muted">
        پس از راه‌اندازی انبار و فروش در فاز بعدی نمایش داده می‌شود.
      </p>
    </div>
  );
}

export default async function BooksExecutiveOverviewPage() {
  const session = await requireBookCommerceAccess("books.view");
  const organizationId = session.organization.id;

  const [skuCount, activeSkuCount, publisherCount, importJobCount, lastImportJob] =
    await Promise.all([
      prisma.bookSku.count({ where: { organizationId, deletedAt: null } }),
      prisma.bookSku.count({
        where: { organizationId, deletedAt: null, status: BookSkuStatus.ACTIVE },
      }),
      prisma.bookPublisher.count({ where: { organizationId, deletedAt: null } }),
      prisma.bookImportJob.count({ where: { organizationId } }),
      prisma.bookImportJob.findFirst({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true, status: true, insertedCount: true, updatedCount: true },
      }),
    ]);

  return (
    <div>
      <AdminPageHeader
        title="نمای کلی اجرایی بازرگانی کتاب"
        description="فاز A — پایه و کاتالوگ. انبار، فروش، خزانه، بازاریابی و پورسانت در فازهای بعدی تأیید و پیاده‌سازی می‌شوند."
        breadcrumbs={adminBreadcrumbs.books}
      />

      <section
        aria-labelledby="books-overview-catalog"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <h2 id="books-overview-catalog" className="sr-only">
          آمار کاتالوگ
        </h2>
        <StatCard label="تعداد کتاب (SKU)" value={toPersianDigits(skuCount)} />
        <StatCard label="کتاب‌های فعال" value={toPersianDigits(activeSkuCount)} />
        <StatCard label="ناشران ثبت‌شده" value={toPersianDigits(publisherCount)} />
        <StatCard
          label="عملیات ورود اکسل"
          value={toPersianDigits(importJobCount)}
          hint={
            lastImportJob
              ? `آخرین اجرا: ${toPersianDigits(lastImportJob.insertedCount)} افزوده، ${toPersianDigits(lastImportJob.updatedCount)} به‌روزرسانی`
              : undefined
          }
        />
      </section>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link
          href="/admin/books/catalog"
          className="admin-card px-4 py-4 text-sm font-medium text-primary transition hover:border-secondary/40"
        >
          مدیریت کاتالوگ کتاب
        </Link>
        <Link
          href="/admin/books/catalog/import"
          className="admin-card px-4 py-4 text-sm font-medium text-primary transition hover:border-secondary/40"
        >
          ورود اکسل کاتالوگ
        </Link>
      </div>

      <section aria-labelledby="books-overview-roadmap" className="mt-8">
        <h2 id="books-overview-roadmap" className="mb-4 text-base font-semibold text-primary sm:text-lg">
          شاخص‌های نیازمند انبار و فروش
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SoonCard label="موجودی و نیاز به تأمین" />
          <SoonCard label="رزروهای باز" />
          <SoonCard label="مانده بیعانه" />
          <SoonCard label="پرفروش‌ترین کتاب‌ها" />
        </div>
      </section>

      {skuCount === 0 ? (
        <div className="mt-8">
          <AdminEmptyState
            title="هنوز کتابی در کاتالوگ ثبت نشده است"
            description="با ورود اکسل کاتالوگ یا افزودن دستی یک کتاب شروع کنید."
            action={
              <Link
                href="/admin/books/catalog/import"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
              >
                شروع ورود اکسل
              </Link>
            }
          />
        </div>
      ) : null}
    </div>
  );
}
