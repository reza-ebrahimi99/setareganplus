import type { Metadata } from "next";
import Link from "next/link";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CreateWebsitePageForm } from "@/components/admin/website/page-builder/CreateWebsitePageForm";
import { PageLifecycleActions } from "@/components/admin/website/page-builder/PageLifecycleActions";
import { requirePermission } from "@/lib/auth/require-admin";
import { formatJalaliDateTimeShort } from "@/lib/datetime/jalali";
import { getPublicPagePath } from "@/lib/website/page-builder/public-path";
import {
  listAdminWebsitePages,
  type AdminWebsitePageListView,
} from "@/lib/website/page-builder/pages-admin";
import { toPersianDigits } from "@/lib/persian";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "صفحات" };

const statusLabel: Record<string, string> = {
  DRAFT: "پیش‌نویس",
  PUBLISHED: "منتشرشده",
  ARCHIVED: "بایگانی",
};

const VIEW_TABS: { id: AdminWebsitePageListView; label: string }[] = [
  { id: "active", label: "صفحات فعال" },
  { id: "draft", label: "پیش‌نویس" },
  { id: "published", label: "منتشرشده" },
  { id: "archived", label: "بایگانی‌شده" },
  { id: "deleted", label: "حذف‌شده" },
];

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readView(
  raw: string | string[] | undefined,
): AdminWebsitePageListView {
  const value = typeof raw === "string" ? raw : "active";
  if (
    value === "draft" ||
    value === "published" ||
    value === "archived" ||
    value === "deleted" ||
    value === "active"
  ) {
    return value;
  }
  return "active";
}

function readMessage(raw: string | string[] | undefined): string {
  return typeof raw === "string" ? raw : "";
}

function viewHref(view: AdminWebsitePageListView): string {
  return view === "active"
    ? "/admin/website/pages"
    : `/admin/website/pages?view=${view}`;
}

export default async function AdminWebsitePagesPage({
  searchParams,
}: PageProps) {
  const session = await requirePermission("website.manage");
  const params = await searchParams;
  const view = readView(params.view);
  const success = readMessage(params.success);
  const error = readMessage(params.error);

  const pages = await listAdminWebsitePages(session.organization.id, view);

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

      {success ? (
        <div
          role="status"
          className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-7 text-emerald-900"
        >
          {success}
        </div>
      ) : null}
      {error ? (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-7 text-red-800"
        >
          {error}
        </div>
      ) : null}

      <nav
        className="mb-4 flex flex-wrap gap-2"
        aria-label="فیلتر وضعیت صفحات"
      >
        {VIEW_TABS.map((tab) => {
          const active = tab.id === view;
          return (
            <Link
              key={tab.id}
              href={viewHref(tab.id)}
              className={
                active
                  ? "rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white"
                  : "rounded-xl border border-border bg-white px-4 py-2.5 text-sm"
              }
              aria-current={active ? "page" : undefined}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {view === "active" ? (
        <div className="mb-6">
          <CreateWebsitePageForm />
        </div>
      ) : null}

      {pages.length === 0 ? (
        <AdminEmptyState
          title={
            view === "deleted"
              ? "صفحه حذف‌شده‌ای وجود ندارد"
              : view === "archived"
                ? "صفحه بایگانی‌شده‌ای وجود ندارد"
                : "هنوز صفحه‌ای در این فهرست نیست"
          }
          description={
            view === "active"
              ? "با فرم بالا یک صفحه جدید بسازید، سپس بخش‌ها را اضافه و منتشر کنید."
              : "صفحات مطابق این فیلتر در سامانه ثبت نشده‌اند."
          }
        />
      ) : (
        <ul className="space-y-3">
          {pages.map((page) => {
            const lifecycleState =
              page.deletedAt != null
                ? ("deleted" as const)
                : page.status === "ARCHIVED"
                  ? ("archived" as const)
                  : ("live" as const);

            return (
              <li
                key={page.id}
                className="admin-card flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-primary">{page.title}</p>
                    <span className="rounded-lg bg-surface px-2 py-0.5 text-xs text-muted">
                      {page.deletedAt != null
                        ? "حذف‌شده"
                        : (statusLabel[page.status] ?? page.status)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted" dir="ltr">
                    {getPublicPagePath(page.slug)} ·{" "}
                    {toPersianDigits(String(page.sectionCount))} بخش
                  </p>
                  <dl className="mt-2 space-y-1 text-xs text-muted">
                    <div>
                      <dt className="inline">آخرین ویرایش: </dt>
                      <dd className="inline">
                        {formatJalaliDateTimeShort(page.updatedAt)}
                      </dd>
                    </div>
                    {page.publishedAt ? (
                      <div>
                        <dt className="inline">منتشرشده: </dt>
                        <dd className="inline">
                          {formatJalaliDateTimeShort(page.publishedAt)}
                        </dd>
                      </div>
                    ) : null}
                    {page.archivedAt ? (
                      <div>
                        <dt className="inline">بایگانی: </dt>
                        <dd className="inline">
                          {formatJalaliDateTimeShort(page.archivedAt)}
                        </dd>
                      </div>
                    ) : null}
                    {page.deletedAt ? (
                      <div>
                        <dt className="inline">حذف‌شده: </dt>
                        <dd className="inline">
                          {formatJalaliDateTimeShort(page.deletedAt)}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                </div>
                <PageLifecycleActions
                  pageId={page.id}
                  slug={page.slug}
                  status={page.status}
                  lifecycleState={lifecycleState}
                  view={view}
                  layout="list"
                />
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
