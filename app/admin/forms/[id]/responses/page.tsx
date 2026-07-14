import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ResponsesFilters } from "@/components/admin/forms/ResponsesFilters";
import { ResponsesList } from "@/components/admin/forms/ResponsesList";
import { ResponseStatsCards } from "@/components/admin/forms/ResponseStatsCards";
import { loadFormResponseStats } from "@/lib/forms/load-form-response-stats";
import { loadFormResponses } from "@/lib/forms/load-form-responses";
import {
  buildResponseFiltersQuery,
  parseResponseFiltersFromSearchParams,
} from "@/lib/forms/response-filters";
import { toPersianDigits } from "@/lib/persian";

export const dynamic = "force-dynamic";

type ResponsesPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({
  params,
}: ResponsesPageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await loadFormResponses(id, {});
  return {
    title: result.ok ? `پاسخ‌ها · ${result.data.form.title}` : "پاسخ‌های فرم",
  };
}

export default async function AdminFormResponsesPage({
  params,
  searchParams,
}: ResponsesPageProps) {
  // TODO(auth): Enforce authenticated admin access before production exposure.

  const { id } = await params;
  const raw = await searchParams;
  const filters = parseResponseFiltersFromSearchParams(raw);

  const [result, statsResult] = await Promise.all([
    loadFormResponses(id, filters),
    loadFormResponseStats(id, filters),
  ]);

  if (!result.ok && result.reason === "not_found") {
    notFound();
  }

  if (!result.ok) {
    return (
      <>
        <AdminPageHeader
          title="پاسخ‌های فرم"
          description="مدیریت پاسخ‌های ثبت‌شده"
          showNotice
          compact
        />
        <div
          role="alert"
          className="admin-card border-red-200 bg-red-50 px-5 py-4 text-sm leading-7 text-red-800"
        >
          اتصال به پایگاه داده برقرار نشد. پس از پیکربندی PostgreSQL دوباره تلاش
          کنید.
        </div>
      </>
    );
  }

  const { form, items, total } = result.data;
  const exportQuery = buildResponseFiltersQuery(filters);
  const exportHref = exportQuery
    ? `/admin/forms/${form.id}/responses/export?${exportQuery}`
    : `/admin/forms/${form.id}/responses/export`;

  return (
    <>
      <AdminPageHeader
        title={`پاسخ‌ها · ${form.title}`}
        description="فهرست پاسخ‌های ثبت‌شده، آمار خلاصه و خروجی CSV"
        breadcrumbs={[
          { label: "مدیریت", href: "/admin" },
          { label: "فرم‌ساز", href: "/admin/forms" },
          { label: form.title, href: `/admin/forms/${form.id}` },
          { label: "پاسخ‌ها" },
        ]}
        showNotice
        compact
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {toPersianDigits(total)} پاسخ
          {total > items.length
            ? ` · نمایش ${toPersianDigits(items.length)} مورد اخیر`
            : null}
        </p>
        <div className="flex flex-wrap gap-2">
          <a
            href={exportHref}
            className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary/92"
          >
            دانلود CSV
          </a>
          <Link
            href={`/admin/forms/${form.id}`}
            className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-background"
          >
            بازگشت به ویرایش‌گر
          </Link>
        </div>
      </div>

      {statsResult.ok ? (
        <div className="mb-5">
          <ResponseStatsCards stats={statsResult.stats} />
        </div>
      ) : null}

      <div className="mb-5">
        <ResponsesFilters formId={form.id} filters={filters} />
      </div>

      {items.length === 0 ? (
        <AdminEmptyState
          title="پاسخی یافت نشد"
          description="هنوز پاسخی ثبت نشده یا فیلترها نتیجه‌ای ندارند."
        />
      ) : (
        <ResponsesList formId={form.id} items={items} />
      )}
    </>
  );
}
