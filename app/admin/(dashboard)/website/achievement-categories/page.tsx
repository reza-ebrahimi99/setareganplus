import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  createAchievementCategory,
  deleteAchievementCategory,
  updateAchievementCategory,
} from "@/app/admin/(dashboard)/website/achievements/actions";
import { requirePermission } from "@/lib/auth/require-admin";
import { listAdminAchievementCategories } from "@/lib/website/achievement-categories";
import { toPersianDigits } from "@/lib/persian";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "دسته‌بندی افتخارات" };

export default async function AdminAchievementCategoriesPage() {
  const session = await requirePermission("website.manage");
  const categories = await listAdminAchievementCategories(
    session.organization.id,
  );

  return (
    <>
      <AdminPageHeader
        title="دسته‌بندی افتخارات"
        description="دسته‌های قابل مدیریت برای المپیاد، پذیرش، مسابقات و گواهی‌ها"
        breadcrumbs={[
          { label: "مدیریت", href: "/admin" },
          { label: "افتخارات", href: "/admin/website/achievements" },
          { label: "دسته‌بندی‌ها" },
        ]}
        compact
      />

      <div className="mb-4">
        <Link
          href="/admin/website/achievements"
          className="text-sm text-primary underline"
        >
          بازگشت به فهرست افتخارات
        </Link>
      </div>

      <form
        action={createAchievementCategory}
        className="admin-card mb-5 grid gap-3 p-5 sm:grid-cols-4"
      >
        <label className="text-sm sm:col-span-2">
          <span className="font-medium text-primary">نام دسته</span>
          <input
            name="name"
            required
            className="mt-1.5 w-full rounded-xl border border-border px-3 py-2.5 text-sm"
            placeholder="مثال: المپیادها"
          />
        </label>
        <label className="text-sm">
          <span className="font-medium text-primary">آیکون</span>
          <input
            name="icon"
            className="mt-1.5 w-full rounded-xl border border-border px-3 py-2.5 text-sm"
            placeholder="trophy"
          />
        </label>
        <label className="text-sm">
          <span className="font-medium text-primary">رنگ</span>
          <input
            name="color"
            dir="ltr"
            className="mt-1.5 w-full rounded-xl border border-border px-3 py-2.5 text-sm"
            placeholder="#0f766e"
          />
        </label>
        <div className="sm:col-span-4">
          <button
            type="submit"
            className="rounded-xl bg-primary px-4 py-2.5 text-sm text-white"
          >
            افزودن دسته
          </button>
        </div>
      </form>

      <div className="space-y-4">
        {categories.map((category) => (
          <form
            key={category.id}
            action={updateAchievementCategory}
            className="admin-card grid gap-3 p-4 sm:grid-cols-6"
          >
            <input type="hidden" name="categoryId" value={category.id} />
            <label className="text-sm sm:col-span-2">
              <span className="text-muted">نام</span>
              <input
                name="name"
                defaultValue={category.name}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm">
              <span className="text-muted">ترتیب</span>
              <input
                name="displayOrder"
                type="number"
                defaultValue={category.displayOrder}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm">
              <span className="text-muted">آیکون</span>
              <input
                name="icon"
                defaultValue={category.icon ?? ""}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm">
              <span className="text-muted">رنگ</span>
              <input
                name="color"
                dir="ltr"
                defaultValue={category.color ?? ""}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
            </label>
            <div className="flex flex-wrap items-end gap-3 text-sm sm:col-span-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="isActive"
                  value="true"
                  defaultChecked={category.isActive}
                />
                فعال
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="archived"
                  value="true"
                  defaultChecked={Boolean(category.archivedAt)}
                />
                بایگانی
              </label>
              <button
                type="submit"
                className="rounded-lg bg-primary px-3 py-2 text-xs text-white"
              >
                ذخیره
              </button>
              <button
                formAction={deleteAchievementCategory}
                className="rounded-lg border border-red-200 px-3 py-2 text-xs text-red-700"
              >
                حذف
              </button>
              <span className="text-xs text-muted">
                {toPersianDigits(category._count.achievements)} افتخار
              </span>
            </div>
          </form>
        ))}
      </div>
    </>
  );
}
