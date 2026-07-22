import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AchievementCategoryRow } from "@/components/admin/website/AchievementCategoryRow";
import { createAchievementCategory } from "@/app/admin/(dashboard)/website/achievements/actions";
import { requirePermission } from "@/lib/auth/require-admin";
import { listAdminAchievementCategories } from "@/lib/website/achievement-categories";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "دسته‌بندی افتخارات" };

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function flashMessage(
  params: Record<string, string | string[] | undefined>,
): { tone: "success" | "error"; text: string } | null {
  const error = params.error;
  const success = params.success;
  if (typeof error === "string") {
    switch (error) {
      case "name_required":
        return { tone: "error", text: "نام دسته الزامی است." };
      case "not_found":
        return { tone: "error", text: "دسته‌بندی یافت نشد." };
      case "in_use":
        return {
          tone: "error",
          text: "این دسته دارای افتخار است و قابل حذف نیست. ابتدا افتخارات را به دسته دیگری منتقل کنید.",
        };
      case "reorder_blocked":
        return { tone: "error", text: "جابه‌جایی ترتیب در این موقعیت ممکن نیست." };
      default:
        return { tone: "error", text: "عملیات انجام نشد." };
    }
  }
  if (typeof success === "string") {
    switch (success) {
      case "created":
        return { tone: "success", text: "دسته جدید با موفقیت اضافه شد." };
      case "updated":
        return { tone: "success", text: "تغییرات دسته ذخیره شد." };
      case "deleted":
        return { tone: "success", text: "دسته حذف شد." };
      case "reordered":
        return { tone: "success", text: "ترتیب دسته‌ها به‌روزرسانی شد." };
      default:
        return { tone: "success", text: "عملیات با موفقیت انجام شد." };
    }
  }
  return null;
}

export default async function AdminAchievementCategoriesPage({
  searchParams,
}: PageProps) {
  const session = await requirePermission("website.manage");
  const params = await searchParams;
  const categories = await listAdminAchievementCategories(
    session.organization.id,
  );
  const message = flashMessage(params);

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

      {message ? (
        <div
          className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
            message.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <form
        action={createAchievementCategory}
        className="admin-card mb-5 grid gap-3 p-5 sm:grid-cols-4"
      >
        <label className="text-sm sm:col-span-2">
          <span className="font-medium text-primary">نام دسته</span>
          <input
            name="name"
            required
            className="mt-1.5 min-h-11 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm"
            placeholder="مثال: المپیادها"
          />
        </label>
        <label className="text-sm">
          <span className="font-medium text-primary">آیکون</span>
          <input
            name="icon"
            className="mt-1.5 min-h-11 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm"
            placeholder="trophy"
          />
        </label>
        <label className="text-sm">
          <span className="font-medium text-primary">رنگ</span>
          <input
            name="color"
            dir="ltr"
            className="mt-1.5 min-h-11 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm"
            placeholder="#0f766e"
          />
        </label>
        <div className="sm:col-span-4">
          <button
            type="submit"
            className="min-h-11 rounded-xl bg-primary px-4 py-2.5 text-sm text-white"
          >
            افزودن دسته
          </button>
        </div>
      </form>

      <div className="space-y-4">
        {categories.length === 0 ? (
          <p className="admin-card px-4 py-8 text-center text-sm text-muted">
            هنوز دسته‌ای ثبت نشده است.
          </p>
        ) : (
          categories.map((category, index) => (
            <AchievementCategoryRow
              key={category.id}
              category={{
                id: category.id,
                name: category.name,
                icon: category.icon,
                color: category.color,
                displayOrder: category.displayOrder,
                isActive: category.isActive,
                archivedAt: category.archivedAt,
                achievementCount: category._count.achievements,
              }}
              canMoveUp={index > 0}
              canMoveDown={index < categories.length - 1}
            />
          ))
        )}
      </div>
    </>
  );
}
