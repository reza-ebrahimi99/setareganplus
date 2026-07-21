import type { Metadata } from "next";
import Link from "next/link";
import { createExperimentalPageAction } from "@/app/admin/(dashboard)/website/pages/actions";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { requirePermission } from "@/lib/auth/require-admin";
import {
  EXPERIMENTAL_PAGE_SLUG,
  EXPERIMENTAL_PUBLIC_PATH,
} from "@/lib/website/page-builder/constants";
import { listAdminWebsitePages } from "@/lib/website/page-builder/pages-admin";
import { toPersianDigits } from "@/lib/persian";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "صفحات" };

const statusLabel: Record<string, string> = {
  DRAFT: "پیش‌نویس",
  PUBLISHED: "منتشرشده",
  ARCHIVED: "بایگانی",
};

export default async function AdminWebsitePagesPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const session = await requirePermission("website.manage");
  const pages = await listAdminWebsitePages(session.organization.id);
  const params = searchParams ? await searchParams : {};
  const hasExperimental = pages.some((p) => p.slug === EXPERIMENTAL_PAGE_SLUG);

  return (
    <>
      <AdminPageHeader
        title="صفحات"
        description="صفحه‌ساز آزمایشی — فاز ۱ (فقط builder-demo)"
        breadcrumbs={[
          { label: "مدیریت", href: "/admin" },
          { label: "وب‌سایت" },
          { label: "صفحات" },
        ]}
        compact
      />

      {params.error === "create" ? (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          ایجاد صفحه آزمایشی ناموفق بود. دوباره تلاش کنید.
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-3">
        {!hasExperimental ? (
          <form action={createExperimentalPageAction}>
            <button
              type="submit"
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white"
            >
              ایجاد صفحه آزمایشی builder-demo
            </button>
          </form>
        ) : (
          <Link
            href={EXPERIMENTAL_PUBLIC_PATH}
            className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm"
            target="_blank"
          >
            مشاهده مسیر عمومی
          </Link>
        )}
      </div>

      {pages.length === 0 ? (
        <AdminEmptyState
          title="هنوز صفحه‌ای ثبت نشده"
          description="برای شروع، صفحه آزمایشی builder-demo را ایجاد کنید."
        />
      ) : (
        <ul className="space-y-3">
          {pages.map((page) => (
            <li key={page.id} className="admin-card flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-semibold text-primary">{page.title}</p>
                <p className="mt-1 text-sm text-muted" dir="ltr">
                  /{page.slug} · {statusLabel[page.status] ?? page.status} ·{" "}
                  {toPersianDigits(String(page.sectionCount))} بخش
                </p>
              </div>
              <Link
                href={`/admin/website/pages/${page.id}`}
                className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white"
              >
                ویرایش
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
