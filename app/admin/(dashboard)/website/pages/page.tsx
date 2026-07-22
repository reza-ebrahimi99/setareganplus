import type { Metadata } from "next";
import Link from "next/link";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CreateWebsitePageForm } from "@/components/admin/website/page-builder/CreateWebsitePageForm";
import { requirePermission } from "@/lib/auth/require-admin";
import { getPublicPagePath } from "@/lib/website/page-builder/public-path";
import { listAdminWebsitePages } from "@/lib/website/page-builder/pages-admin";
import { toPersianDigits } from "@/lib/persian";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "صفحات" };

const statusLabel: Record<string, string> = {
  DRAFT: "پیش‌نویس",
  PUBLISHED: "منتشرشده",
  ARCHIVED: "بایگانی",
};

export default async function AdminWebsitePagesPage() {
  const session = await requirePermission("website.manage");
  const pages = await listAdminWebsitePages(session.organization.id);

  return (
    <>
      <AdminPageHeader
        title="صفحات"
        description="مدیریت صفحات عمومی ساخته‌شده با صفحه‌ساز"
        breadcrumbs={[
          { label: "مدیریت", href: "/admin" },
          { label: "وب‌سایت" },
          { label: "صفحات" },
        ]}
        compact
      />

      <div className="mb-6">
        <CreateWebsitePageForm />
      </div>

      {pages.length === 0 ? (
        <AdminEmptyState
          title="هنوز صفحه‌ای ثبت نشده"
          description="با فرم بالا یک صفحه جدید بسازید، سپس بخش‌ها را اضافه و منتشر کنید."
        />
      ) : (
        <ul className="space-y-3">
          {pages.map((page) => (
            <li
              key={page.id}
              className="admin-card flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div>
                <p className="font-semibold text-primary">{page.title}</p>
                <p className="mt-1 text-sm text-muted" dir="ltr">
                  {getPublicPagePath(page.slug)} ·{" "}
                  {statusLabel[page.status] ?? page.status} ·{" "}
                  {toPersianDigits(String(page.sectionCount))} بخش
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {page.status === "PUBLISHED" ? (
                  <Link
                    href={getPublicPagePath(page.slug)}
                    target="_blank"
                    className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm"
                  >
                    مشاهده
                  </Link>
                ) : null}
                <Link
                  href={`/admin/website/pages/${page.id}`}
                  className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white"
                >
                  ویرایش
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
