"use client";

import type { Ref } from "react";
import type { MediaPickerSort } from "@/components/admin/media/media-picker-types";

type MediaPickerToolbarProps = {
  q: string;
  category: string;
  sort: MediaPickerSort;
  categories: string[];
  disabled?: boolean;
  searchInputRef?: Ref<HTMLInputElement>;
  onQueryChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onSortChange: (value: MediaPickerSort) => void;
};

export function MediaPickerToolbar({
  q,
  category,
  sort,
  categories,
  disabled,
  searchInputRef,
  onQueryChange,
  onCategoryChange,
  onSortChange,
}: MediaPickerToolbarProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <label className="block text-sm sm:col-span-1">
        <span className="mb-1.5 block text-muted">جستجو</span>
        <input
          ref={searchInputRef}
          type="search"
          value={q}
          disabled={disabled}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="عنوان، توضیح، نام فایل…"
          className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1.5 block text-muted">دسته</span>
        <select
          value={category}
          disabled={disabled}
          onChange={(event) => onCategoryChange(event.target.value)}
          className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5"
        >
          <option value="">همه دسته‌ها</option>
          {categories.map((entry) => (
            <option key={entry} value={entry}>
              {entry}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="mb-1.5 block text-muted">مرتب‌سازی</span>
        <select
          value={sort}
          disabled={disabled}
          onChange={(event) =>
            onSortChange(event.target.value as MediaPickerSort)
          }
          className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5"
        >
          <option value="newest">جدیدترین</option>
          <option value="oldest">قدیمی‌ترین</option>
          <option value="title">عنوان</option>
        </select>
      </label>
    </div>
  );
}
