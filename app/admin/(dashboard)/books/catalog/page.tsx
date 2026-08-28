import type { Metadata } from "next";
import Link from "next/link";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { adminBreadcrumbs } from "@/content/admin";
import { BookSkuStatus } from "@/generated/prisma/enums";
import { listBookCatalog, type BookCatalogSort } from "@/lib/books/catalog/list-service";
import { loadCatalogTaxonomyOptions } from "@/lib/books/catalog/taxonomy-options";
import { formatRials } from "@/lib/books/catalog/price";
import { requireBookCommerceAccess } from "@/lib/books/require";
import { toPersianDigits } from "@/lib/persian";

export const metadata: Metadata = {
  title: "کاتالوگ کتاب",
};
export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<BookSkuStatus, string> = {
  ACTIVE: "فعال",
  INACTIVE: "غیرفعال",
  DISCONTINUED: "متوقف‌شده",
};

const SORT_OPTIONS: Array<{ value: BookCatalogSort; label: string }> = [
  { value: "newest", label: "جدیدترین" },
  { value: "title", label: "عنوان (الفبا)" },
  { value: "priceAsc", label: "قیمت: کم به زیاد" },
  { value: "priceDesc", label: "قیمت: زیاد به کم" },
];

type PageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function BookCatalogPage({ searchParams }: PageProps) {
  const session = await requireBookCommerceAccess("books.catalog.manage");
  const organizationId = session.organization.id;
  const params = await searchParams;

  const filters = {
    q: params.q,
    bookTypeId: params.bookTypeId || undefined,
    gradeId: params.gradeId || undefined,
    subjectId: params.subjectId || undefined,
    majorId: params.majorId || undefined,
    publisherId: params.publisherId || undefined,
    status: (params.status as BookSkuStatus | undefined) || undefined,
    priceMinRials: params.priceMin ? Number(params.priceMin) : undefined,
    priceMaxRials: params.priceMax ? Number(params.priceMax) : undefined,
    sort: (params.sort as BookCatalogSort | undefined) ?? "newest",
    page: params.page ? Number(params.page) : 1,
  };

  const [page, { bookTypes, grades, subjects, majors, publishers }] = await Promise.all([
    listBookCatalog(organizationId, filters),
    loadCatalogTaxonomyOptions(organizationId),
  ]);

  return (
    <div>
      <AdminPageHeader
        title="کاتالوگ کتاب"
        description="کاتالوگ داده اصلی است، نه موجودی. تعداد فقط در فاز انبار مشخص می‌شود."
        breadcrumbs={adminBreadcrumbs.booksCatalog}
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {toPersianDigits(page.total)} کتاب — صفحه {toPersianDigits(page.page)} از{" "}
          {toPersianDigits(page.pageCount)}
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/books/catalog/types"
            className="rounded-lg border border-border bg-background px-3.5 py-2 text-sm font-medium text-primary"
          >
            انواع کتاب
          </Link>
          <Link
            href="/admin/books/catalog/import"
            className="rounded-lg border border-border bg-background px-3.5 py-2 text-sm font-medium text-primary"
          >
            ورود اکسل
          </Link>
          <Link
            href="/admin/books/catalog/new"
            className="rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-white"
          >
            افزودن کتاب
          </Link>
        </div>
      </div>

      <form
        method="get"
        className="admin-card mb-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <input
          type="search"
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="جستجو: کد داخلی، بارکد، عنوان"
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm sm:col-span-2 lg:col-span-1"
        />
        <select name="bookTypeId" defaultValue={params.bookTypeId ?? ""} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
          <option value="">همه انواع کتاب</option>
          {bookTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.label}
            </option>
          ))}
        </select>
        <select name="gradeId" defaultValue={params.gradeId ?? ""} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
          <option value="">همه پایه‌ها</option>
          {grades.map((grade) => (
            <option key={grade.id} value={grade.id}>
              {grade.label}
            </option>
          ))}
        </select>
        <select name="subjectId" defaultValue={params.subjectId ?? ""} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
          <option value="">همه درس‌ها</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.label}
            </option>
          ))}
        </select>
        <select name="majorId" defaultValue={params.majorId ?? ""} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
          <option value="">همه رشته‌ها</option>
          {majors.map((major) => (
            <option key={major.id} value={major.id}>
              {major.label}
            </option>
          ))}
        </select>
        <select name="publisherId" defaultValue={params.publisherId ?? ""} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
          <option value="">همه ناشران</option>
          {publishers.map((publisher) => (
            <option key={publisher.id} value={publisher.id}>
              {publisher.label}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={params.status ?? ""} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
          <option value="">همه وضعیت‌ها</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select name="sort" defaultValue={filters.sort} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <input
          type="number"
          name="priceMin"
          defaultValue={params.priceMin ?? ""}
          placeholder="حداقل قیمت (ریال)"
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <input
          type="number"
          name="priceMax"
          defaultValue={params.priceMax ?? ""}
          placeholder="حداکثر قیمت (ریال)"
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-lg border border-secondary/30 bg-secondary/10 px-3.5 py-2 text-sm font-medium text-primary"
        >
          اعمال فیلتر
        </button>
      </form>

      {page.rows.length === 0 ? (
        <AdminEmptyState
          title="کتابی با این فیلترها یافت نشد"
          description="فیلترها را تغییر دهید یا از ورود اکسل برای افزودن کاتالوگ استفاده کنید."
        />
      ) : (
        <div className="admin-card overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border text-right text-xs text-muted">
                <th className="px-4 py-3 font-medium">عنوان</th>
                <th className="px-4 py-3 font-medium">کد داخلی</th>
                <th className="px-4 py-3 font-medium">نوع</th>
                <th className="px-4 py-3 font-medium">ناشر</th>
                <th className="px-4 py-3 font-medium">قیمت</th>
                <th className="px-4 py-3 font-medium">وضعیت</th>
              </tr>
            </thead>
            <tbody>
              {page.rows.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0 hover:bg-background">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/books/catalog/${row.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {row.title}
                    </Link>
                    {row.editionLabel ? (
                      <span className="ms-1 text-xs text-muted">({row.editionLabel})</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-muted" dir="ltr">
                    {row.internalCode}
                  </td>
                  <td className="px-4 py-3 text-muted">{row.bookTypeLabel ?? "—"}</td>
                  <td className="px-4 py-3 text-muted">{row.publisherName ?? "—"}</td>
                  <td className="px-4 py-3">
                    {row.currentSaleRials != null ? (
                      <span>
                        <span className="text-secondary">{formatRials(row.currentSaleRials)}</span>{" "}
                        <span className="text-xs text-muted line-through">
                          {row.currentListRials != null ? formatRials(row.currentListRials) : ""}
                        </span>
                      </span>
                    ) : row.currentListRials != null ? (
                      formatRials(row.currentListRials)
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full border border-border bg-background px-2.5 py-1 text-xs text-muted">
                      {STATUS_LABELS[row.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
