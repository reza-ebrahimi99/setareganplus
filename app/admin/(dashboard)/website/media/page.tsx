import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  bulkSetLibraryMediaStatusAction,
} from "@/app/admin/(dashboard)/website/media/actions";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { MediaLibraryUploader } from "@/components/admin/website/MediaLibraryUploader";
import { requirePermission } from "@/lib/auth/require-admin";
import { toPersianDigits } from "@/lib/persian";
import {
  listAdminMediaAssets,
  listAdminMediaCategories,
  type AdminMediaSort,
} from "@/lib/website/media-library-admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "کتابخانه رسانه" };

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function param(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

export default async function AdminMediaLibraryPage({
  searchParams,
}: PageProps) {
  const session = await requirePermission("website.manage");
  const params = await searchParams;
  const q = param(params.q);
  const status = (param(params.status) || "all") as
    | "all"
    | "ACTIVE"
    | "INACTIVE";
  const category = param(params.category);
  const sort = (param(params.sort) || "newest") as AdminMediaSort;
  const requestedPage = Number.parseInt(param(params.page) || "1", 10);

  const [list, categories] = await Promise.all([
    listAdminMediaAssets(session.organization.id, {
      q,
      status,
      category: category || undefined,
      sort,
      page:
        Number.isSafeInteger(requestedPage) && requestedPage > 0
          ? requestedPage
          : 1,
    }),
    listAdminMediaCategories(session.organization.id),
  ]);

  const pageHref = (targetPage: number) => {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (status !== "all") query.set("status", status);
    if (category) query.set("category", category);
    if (sort !== "newest") query.set("sort", sort);
    if (targetPage > 1) query.set("page", String(targetPage));
    const qs = query.toString();
    return qs ? `/admin/website/media?${qs}` : "/admin/website/media";
  };

  return (
    <>
      <AdminPageHeader
        title="کتابخانه رسانه"
        description="بارگذاری، ویرایش و استفاده مجدد از تصاویر در گالری و جایگاه‌های سایت"
        breadcrumbs={[
          { label: "مدیریت", href: "/admin" },
          { label: "وب‌سایت" },
          { label: "کتابخانه رسانه" },
        ]}
        compact
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <Link
          href="/admin/website/gallery"
          className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm"
        >
          آلبوم‌های گالری
        </Link>
        <Link
          href="/admin/website/media/placements"
          className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm"
        >
          جایگاه‌های رسانه
        </Link>
        <Link
          href="/gallery"
          className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm"
        >
          مشاهده گالری عمومی
        </Link>
      </div>

      <div className="mb-6">
        <MediaLibraryUploader />
      </div>

      <form
        method="get"
        className="admin-card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5"
      >
        <label className="block text-sm lg:col-span-2">
          <span className="mb-1.5 block text-muted">جستجو</span>
          <input
            name="q"
            defaultValue={q}
            placeholder="عنوان، alt، دسته…"
            className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">وضعیت</span>
          <select
            name="status"
            defaultValue={status}
            className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5"
          >
            <option value="all">همه</option>
            <option value="ACTIVE">فعال</option>
            <option value="INACTIVE">غیرفعال</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">دسته</span>
          <select
            name="category"
            defaultValue={category}
            className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5"
          >
            <option value="">همه</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">مرتب‌سازی</span>
          <select
            name="sort"
            defaultValue={sort}
            className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5"
          >
            <option value="newest">جدیدترین</option>
            <option value="oldest">قدیمی‌ترین</option>
            <option value="title">عنوان</option>
          </select>
        </label>
        <div className="flex items-end sm:col-span-2 lg:col-span-5">
          <button
            type="submit"
            className="min-h-11 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white"
          >
            اعمال فیلتر
          </button>
        </div>
      </form>

      {list.items.length === 0 ? (
        <AdminEmptyState
          title="رسانه‌ای یافت نشد"
          description="هنوز تصویری در کتابخانه نیست یا فیلترها نتیجه‌ای ندارند. از فرم بالا بارگذاری کنید."
        />
      ) : (
        <form action={bulkSetLibraryMediaStatusAction}>
          <div className="mb-3 flex flex-wrap gap-2">
            <button
              type="submit"
              name="status"
              value="ACTIVE"
              className="min-h-11 rounded-xl border border-border bg-white px-4 py-2.5 text-sm"
            >
              فعال‌سازی گروهی
            </button>
            <button
              type="submit"
              name="status"
              value="INACTIVE"
              className="min-h-11 rounded-xl border border-border bg-white px-4 py-2.5 text-sm"
            >
              غیرفعال‌سازی گروهی
            </button>
          </div>

          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {list.items.map((item) => (
              <li key={item.id} className="admin-card relative overflow-hidden">
                <label className="absolute start-2 top-2 z-10 rounded bg-white/90 p-1 shadow-sm">
                  <input
                    type="checkbox"
                    name="mediaIds"
                    value={item.id}
                    className="size-4 rounded border-border"
                  />
                  <span className="sr-only">انتخاب</span>
                </label>
                <Link href={`/admin/website/media/${item.id}`} className="block">
                  <div className="relative aspect-[4/3] bg-primary/[0.03]">
                    <Image
                      src={item.url}
                      alt={item.altText || item.title || "رسانه"}
                      fill
                      unoptimized
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, 25vw"
                    />
                  </div>
                  <div className="space-y-1 p-3">
                    <p className="truncate text-sm font-medium text-primary">
                      {item.title || "بدون عنوان"}
                    </p>
                    <p className="text-xs text-muted">
                      {item.category || "بدون دسته"} ·{" "}
                      {item.status === "ACTIVE" ? "فعال" : "غیرفعال"}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </form>
      )}

      {list.totalPages > 1 ? (
        <nav
          className="mt-6 flex flex-wrap items-center justify-center gap-2"
          aria-label="صفحه‌بندی"
        >
          {Array.from({ length: list.totalPages }, (_, index) => index + 1).map(
            (page) => (
              <Link
                key={page}
                href={pageHref(page)}
                className={`min-h-11 min-w-11 rounded-xl border px-3 py-2 text-center text-sm ${
                  page === list.page
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-white text-primary"
                }`}
              >
                {toPersianDigits(String(page))}
              </Link>
            ),
          )}
        </nav>
      ) : null}
    </>
  );
}
