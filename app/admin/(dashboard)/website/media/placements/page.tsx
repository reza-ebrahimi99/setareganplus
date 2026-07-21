import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  createMediaPlacementAction,
  deleteMediaPlacementAction,
} from "@/app/admin/(dashboard)/website/media/placement-actions";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { HOME_GALLERY_PLACEMENT_KEY } from "@/lib/media/placement-keys";
import { requirePermission } from "@/lib/auth/require-admin";
import { listAdminGalleryAlbums } from "@/lib/website/gallery-admin";
import { listAdminMediaAssets } from "@/lib/website/media-library-admin";
import { listAdminMediaPlacements } from "@/lib/website/media-placements-admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "جایگاه‌های رسانه" };

export default async function AdminMediaPlacementsPage() {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;

  const [placements, albums, media] = await Promise.all([
    listAdminMediaPlacements(organizationId, HOME_GALLERY_PLACEMENT_KEY),
    listAdminGalleryAlbums(organizationId, { active: "yes", page: 1 }),
    listAdminMediaAssets(organizationId, {
      status: "ACTIVE",
      page: 1,
      sort: "newest",
    }),
  ]);

  return (
    <>
      <AdminPageHeader
        title="جایگاه‌های رسانه"
        description="اتصال آلبوم یا تصویر به جایگاه HOME_GALLERY در صفحه اصلی"
        breadcrumbs={[
          { label: "مدیریت", href: "/admin" },
          { label: "وب‌سایت" },
          { label: "کتابخانه رسانه", href: "/admin/website/media" },
          { label: "جایگاه‌ها" },
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
          href="/admin/website/gallery"
          className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm"
        >
          آلبوم‌ها
        </Link>
      </div>

      <form
        action={createMediaPlacementAction}
        className="admin-card mb-6 grid gap-3 p-4 sm:grid-cols-2"
      >
        <input
          type="hidden"
          name="placementKey"
          value={HOME_GALLERY_PLACEMENT_KEY}
        />
        <h2 className="text-sm font-semibold text-primary sm:col-span-2">
          جایگاه جدید برای {HOME_GALLERY_PLACEMENT_KEY}
        </h2>
        <p className="text-xs leading-6 text-muted sm:col-span-2">
          دقیقاً یکی از آلبوم یا تصویر را انتخاب کنید. اگر محتوایی نباشد،
          گالری صفحه اصلی به تصاویر ثابت برمی‌گردد.
        </p>
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">آلبوم (یا خالی)</span>
          <select
            name="albumId"
            className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5"
            defaultValue=""
          >
            <option value="">—</option>
            {albums.items.map((album) => (
              <option key={album.id} value={album.id}>
                {album.title}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">تصویر (یا خالی)</span>
          <select
            name="mediaId"
            className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5"
            defaultValue=""
          >
            <option value="">—</option>
            {media.items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title || item.category || item.id}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">عنوان جایگزین</span>
          <input
            name="titleOverride"
            className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">ترتیب</span>
          <input
            name="sortOrder"
            type="number"
            defaultValue={placements.length}
            className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5"
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1.5 block text-muted">توضیح جایگزین</span>
          <textarea
            name="descriptionOverride"
            rows={2}
            className="w-full rounded-xl border border-border bg-white px-3 py-2.5"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">شروع (اختیاری)</span>
          <input
            name="startAt"
            type="datetime-local"
            className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">پایان (اختیاری)</span>
          <input
            name="endAt"
            type="datetime-local"
            className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5"
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
            افزودن جایگاه
          </button>
        </div>
      </form>

      {placements.length === 0 ? (
        <AdminEmptyState
          title="جایگاهی تعریف نشده"
          description="با افزودن یک آلبوم یا تصویر به HOME_GALLERY، گالری صفحه اصلی از پایگاه داده تغذیه می‌شود."
        />
      ) : (
        <ul className="space-y-3">
          {placements.map((placement) => (
            <li
              key={placement.id}
              className="admin-card flex flex-col gap-3 p-3 sm:flex-row sm:items-center"
            >
              <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-primary/[0.03]">
                {placement.mediaUrl ? (
                  <Image
                    src={placement.mediaUrl}
                    alt={placement.mediaTitle || "رسانه"}
                    fill
                    unoptimized
                    className="object-cover"
                    sizes="64px"
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-medium text-primary">
                  {placement.albumTitle
                    ? `آلبوم: ${placement.albumTitle}`
                    : `تصویر: ${placement.mediaTitle || "بدون عنوان"}`}
                </p>
                <p className="mt-1 text-xs text-muted">
                  ترتیب {placement.sortOrder} ·{" "}
                  {placement.isActive ? "فعال" : "غیرفعال"}
                  {placement.titleOverride
                    ? ` · ${placement.titleOverride}`
                    : ""}
                </p>
              </div>
              <form action={deleteMediaPlacementAction}>
                <input type="hidden" name="placementId" value={placement.id} />
                <button
                  type="submit"
                  className="min-h-11 rounded-xl border border-red-200 bg-red-50 px-3 text-sm text-red-800"
                >
                  حذف
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
