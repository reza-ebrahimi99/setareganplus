import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CatalogImportWizard } from "@/components/admin/books/CatalogImportWizard";
import { adminBreadcrumbs } from "@/content/admin";
import { formatJalaliDateShort } from "@/lib/datetime/jalali";
import { prisma } from "@/lib/prisma";
import { requireBookCommerceAccess } from "@/lib/books/require";
import { toPersianDigits } from "@/lib/persian";

export const metadata: Metadata = {
  title: "ورود اکسل کاتالوگ",
};
export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  UPLOADED: "بارگذاری‌شده",
  PREVIEWED: "پیش‌نمایش‌شده",
  VALIDATED: "اعتبارسنجی‌شده",
  COMMITTING: "در حال ورود",
  DONE: "انجام‌شده",
  FAILED: "ناموفق",
  CANCELLED: "لغوشده",
};

export default async function BookCatalogImportPage() {
  const session = await requireBookCommerceAccess("books.import");
  const jobs = await prisma.bookImportJob.findMany({
    where: { organizationId: session.organization.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="ورود اکسل کاتالوگ"
        description="بارگذاری → تطبیق ستون‌ها → اعتبارسنجی → ورود → گزارش. هرگز فرمول اجرا نمی‌شود."
        breadcrumbs={adminBreadcrumbs.booksCatalogImport}
      />

      <CatalogImportWizard />

      <section className="admin-card p-5 sm:p-6">
        <h2 className="text-base font-semibold text-primary">سوابق ورود اکسل</h2>
        {jobs.length === 0 ? (
          <p className="mt-3 text-sm text-muted">هنوز عملیات ورود اکسلی ثبت نشده است.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border text-right text-xs text-muted">
                  <th className="px-3 py-2 font-medium">فایل</th>
                  <th className="px-3 py-2 font-medium">تاریخ</th>
                  <th className="px-3 py-2 font-medium">وضعیت</th>
                  <th className="px-3 py-2 font-medium">افزوده/به‌روزرسانی/خطا</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 text-primary">{job.fileName}</td>
                    <td className="px-3 py-2 text-muted">{formatJalaliDateShort(job.createdAt)}</td>
                    <td className="px-3 py-2 text-muted">{STATUS_LABELS[job.status] ?? job.status}</td>
                    <td className="px-3 py-2 text-muted">
                      {toPersianDigits(job.insertedCount)} / {toPersianDigits(job.updatedCount)} /{" "}
                      {toPersianDigits(job.errorCount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
