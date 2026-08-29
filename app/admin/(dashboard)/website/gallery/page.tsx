import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  createGalleryAlbumAction,
  setGalleryAlbumActiveAction,
} from "@/app/admin/(dashboard)/website/gallery/actions";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { requirePermission } from "@/lib/auth/require-admin";
import { toPersianDigits } from "@/lib/persian";
import { listAdminGalleryAlbums } from "@/lib/website/gallery-admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "آلبوم‌های گالری" };

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function param(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

export default async function AdminGalleryAlbumsPage({
  searchParams,
}: PageProps) {
  const session = await requirePermission("website.manage");
  const params = await searchParams;
  const q = param(params.q);
  const active = (param(params.active) || "all") as "all" | "yes" | "no";
  const requestedPage = Number.parseInt(param(params.page) || "1", 10);

  const list = await listAdminGalleryAlbums(session.organization.id, {
    q,
    active,
    page:
      Number.isSafeInteger(requestedPage) && requestedPage > 0
        ? requestedPage
        : 1,
  });

  return (
    <>
      <AdminPageHeader
        title="آلبوم‌های گالری"
        description="سازمان‌دهی تصاویر کتابخانه در آلبوم‌های قابل انتشار"
        breadcrumbs={[
          { label: "مدیریت", href: "/admin" },
          { label: "وب‌سایت" },
          { label: "آلبوم‌های گالری" },
        ]}
        compact
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <Link
          href="/admin/website/media"
          className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm"
        >
          کتابخانه رسانه
        </Link>
        <Link
          href="/gallery"
          className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm"
        >
          گالری عمومی
        </Link>
      </div>

      <form
        action={createGalleryAlbumAction}
        className="admin-card mb-6 grid gap-3 p-4 sm:grid-cols-2"
      >
        <h2 className="text-sm font-semibold text-primary sm:col-span-2">
          آلبوم جدید
        </h2>
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">عنوان</span>
          <input
            name="title"
            required
            className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">اسلاگ (اختیاری)</span>
          <input
            name="slug"
            dir="ltr"
            className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5"
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1.5 block text-muted">توضیح</span>
          <textarea
            name="description"
            rows={2}
            className="w-full rounded-xl border border-border bg-white px-3 py-2.5"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="isActive"
            value="true"
            defaultChecked
            className="size-4 rounded border-border"
          />
          <span>فعال</span>
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            className="min-h-11 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white"
          >
            ایجاد آلبوم
          </button>
        </div>
      </form>

      <form
        method="get"
        className="admin-card mb-4 grid gap-3 p-4 sm:grid-cols-3"
      >
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">جستجو</span>
          <input
            name="q"
            defaultValue={q}
            className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">وضعیت</span>
          <select
            name="active"
            defaultValue={active}
            className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5"
          >
            <option value="all">همه</option>
            <option value="yes">فعال</option>
            <option value="no">غیرفعال</option>
          </select>
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            className="min-h-11 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white"
          >
            فیلتر
          </button>
        </div>
      </form>

      {list.items.length === 0 ? (
        <AdminEmptyState
          title="آلبومی وجود ندارد"
          description="اولین آلبوم را از فرم بالا بسازید و تصاویر کتابخانه را به آن اضافه کنید."
        />
      ) : (
        <ul className="space-y-3">
          {list.items.map((album) => (
            <li
              key={album.id}
              className="admin-card flex flex-col gap-3 p-3 sm:flex-row sm:items-center"
            >
              <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-primary/[0.03]">
                {album.coverUrl ? (
                  <Image
                    src={album.coverUrl}
                    alt={album.coverAlt}
                    fill
                    unoptimized
                    className="object-cover"
                    sizes="80px"
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/admin/website/gallery/${album.id}`}
                  className="text-sm font-semibold text-primary hover:underline"
                >
                  {album.title}
                </Link>
                <p className="mt-1 text-xs text-muted">
                  /{album.slug} · {toPersianDigits(String(album.itemCount))} تصویر ·{" "}
                  {album.isActive ? "فعال" : "غیرفعال"}
                </p>
              </div>
              <form action={setGalleryAlbumActiveAction}>
                <input type="hidden" name="albumId" value={album.id} />
                <input
                  type="hidden"
                  name="isActive"
                  value={album.isActive ? "false" : "true"}
                />
                <button
                  type="submit"
                  className="min-h-11 rounded-xl border border-border bg-white px-3 text-sm"
                >
                  {album.isActive ? "غیرفعال" : "فعال"}
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
