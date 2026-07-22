"use client";

import {
  deleteAchievementCategory,
  moveAchievementCategory,
  updateAchievementCategory,
} from "@/app/admin/(dashboard)/website/achievements/actions";
import { toPersianDigits } from "@/lib/persian";

type AchievementCategoryRowProps = {
  category: {
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
    displayOrder: number;
    isActive: boolean;
    archivedAt: Date | null;
    achievementCount: number;
  };
  canMoveUp: boolean;
  canMoveDown: boolean;
};

const inputClass =
  "mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm";

export function AchievementCategoryRow({
  category,
  canMoveUp,
  canMoveDown,
}: AchievementCategoryRowProps) {
  return (
    <form
      action={updateAchievementCategory}
      className="admin-card grid gap-3 p-4 sm:grid-cols-6"
      onSubmit={(event) => {
        const submitter = (event.nativeEvent as SubmitEvent).submitter;
        if (
          submitter instanceof HTMLButtonElement &&
          submitter.name === "deleteCategory"
        ) {
          if (category.achievementCount > 0) {
            window.alert(
              "این دسته دارای افتخار است و قابل حذف نیست. ابتدا افتخارات را به دسته دیگری منتقل کنید.",
            );
            event.preventDefault();
            return;
          }
          if (
            !window.confirm(
              `دسته «${category.name}» حذف شود؟ این عمل قابل بازگشت نیست.`,
            )
          ) {
            event.preventDefault();
          }
        }
      }}
    >
      <input type="hidden" name="categoryId" value={category.id} />
      <label className="text-sm sm:col-span-2">
        <span className="text-muted">نام</span>
        <input
          name="name"
          required
          defaultValue={category.name}
          className={inputClass}
        />
      </label>
      <label className="text-sm">
        <span className="text-muted">ترتیب</span>
        <input
          name="displayOrder"
          type="number"
          defaultValue={category.displayOrder}
          className={inputClass}
        />
      </label>
      <label className="text-sm">
        <span className="text-muted">آیکون</span>
        <input
          name="icon"
          defaultValue={category.icon ?? ""}
          className={inputClass}
        />
      </label>
      <label className="text-sm">
        <span className="text-muted">رنگ</span>
        <input
          name="color"
          dir="ltr"
          defaultValue={category.color ?? ""}
          className={inputClass}
        />
      </label>
      <div className="flex flex-wrap items-end gap-3 text-sm sm:col-span-6">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="isActive"
            value="true"
            defaultChecked={category.isActive}
            className="size-4 rounded border-border"
          />
          فعال
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="archived"
            value="true"
            defaultChecked={Boolean(category.archivedAt)}
            className="size-4 rounded border-border"
          />
          بایگانی
        </label>
        <button
          type="submit"
          className="min-h-10 rounded-lg bg-primary px-3 py-2 text-xs text-white"
        >
          ذخیره
        </button>
        <button
          type="submit"
          formAction={moveAchievementCategory}
          name="direction"
          value="up"
          disabled={!canMoveUp}
          className="min-h-10 rounded-lg border border-border px-3 py-2 text-xs disabled:opacity-40"
        >
          بالا
        </button>
        <button
          type="submit"
          formAction={moveAchievementCategory}
          name="direction"
          value="down"
          disabled={!canMoveDown}
          className="min-h-10 rounded-lg border border-border px-3 py-2 text-xs disabled:opacity-40"
        >
          پایین
        </button>
        <button
          type="submit"
          formAction={deleteAchievementCategory}
          name="deleteCategory"
          value="true"
          className="min-h-10 rounded-lg border border-red-200 px-3 py-2 text-xs text-red-700"
        >
          حذف
        </button>
        <span className="text-xs text-muted">
          {toPersianDigits(category.achievementCount)} افتخار
        </span>
      </div>
    </form>
  );
}
