"use client";

import { useActionState } from "react";
import {
  createCommerceCategoryAction,
  updateCommerceCategoryAction,
  type CommerceCategoryActionState,
} from "@/app/admin/(dashboard)/commerce/actions";
import type { CommerceCategoryAdminRow } from "@/lib/commerce/categories/service";

const emptyState: CommerceCategoryActionState = {};

type Props = {
  mode: "create" | "edit";
  parents: readonly Pick<CommerceCategoryAdminRow, "id" | "title">[];
  defaults?: CommerceCategoryAdminRow;
};

export function CommerceCategoryForm({ mode, parents, defaults }: Props) {
  const action =
    mode === "create" ? createCommerceCategoryAction : updateCommerceCategoryAction;
  const [state, formAction, pending] = useActionState(action, emptyState);

  return (
    <form action={formAction} className="admin-card space-y-4 p-4 sm:p-6">
      {defaults?.id ? <input type="hidden" name="categoryId" value={defaults.id} /> : null}
      {state.formError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {state.formError}
        </p>
      ) : null}
      {state.successMessage ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {state.successMessage}
        </p>
      ) : null}
      <label className="block text-sm">
        <span className="mb-1.5 block text-muted">عنوان</span>
        <input
          name="title"
          required
          defaultValue={defaults?.title ?? ""}
          className="min-h-11 w-full rounded-xl border border-border bg-white px-3"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1.5 block text-muted">اسلاگ</span>
        <input
          name="slug"
          dir="ltr"
          defaultValue={defaults?.slug ?? ""}
          placeholder="خودکار از عنوان"
          className="min-h-11 w-full rounded-xl border border-border bg-white px-3"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1.5 block text-muted">والد</span>
        <select
          name="parentId"
          defaultValue={defaults?.parentId ?? ""}
          className="min-h-11 w-full rounded-xl border border-border bg-white px-3"
        >
          <option value="">— ریشه —</option>
          {parents
            .filter((item) => item.id !== defaults?.id)
            .map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="mb-1.5 block text-muted">توضیح فروشگاهی</span>
        <textarea
          name="description"
          rows={3}
          defaultValue={defaults?.description ?? ""}
          className="w-full rounded-xl border border-border bg-white px-3 py-2"
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">ترتیب</span>
          <input
            name="sortOrder"
            type="number"
            defaultValue={defaults?.sortOrder ?? 0}
            className="min-h-11 w-full rounded-xl border border-border bg-white px-3"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">رنگ</span>
          <input
            name="color"
            defaultValue={defaults?.color ?? ""}
            placeholder="#8b6bff"
            className="min-h-11 w-full rounded-xl border border-border bg-white px-3"
          />
        </label>
      </div>
      <label className="block text-sm">
        <span className="mb-1.5 block text-muted">عنوان سئو</span>
        <input
          name="metaTitle"
          defaultValue={defaults?.metaTitle ?? ""}
          className="min-h-11 w-full rounded-xl border border-border bg-white px-3"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1.5 block text-muted">توضیح سئو</span>
        <textarea
          name="metaDescription"
          rows={2}
          defaultValue={defaults?.metaDescription ?? ""}
          className="w-full rounded-xl border border-border bg-white px-3 py-2"
        />
      </label>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="isVisible"
            value="true"
            defaultChecked={defaults?.isVisible ?? true}
          />
          نمایش در استاربوک
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="isFeatured"
            value="true"
            defaultChecked={defaults?.isFeatured ?? false}
          />
          بنر / کالکشن ویژه
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="isActive"
            value="true"
            defaultChecked={defaults?.isActive ?? true}
          />
          فعال
        </label>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-xl bg-primary px-5 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "در حال ذخیره…" : mode === "create" ? "ایجاد دسته" : "ذخیره دسته"}
      </button>
    </form>
  );
}
