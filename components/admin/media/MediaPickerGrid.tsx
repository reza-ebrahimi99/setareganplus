"use client";

import Image from "next/image";
import type { MediaPickerItem } from "@/components/admin/media/media-picker-types";

type MediaPickerGridProps = {
  items: MediaPickerItem[];
  pending?: boolean;
  error?: string | null;
  emptyMessage?: string;
  isSelected: (id: string) => boolean;
  isExcluded: (id: string) => boolean;
  onToggle: (item: MediaPickerItem) => void;
};

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className="size-3.5"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function MediaPickerGrid({
  items,
  pending,
  error,
  emptyMessage = "تصویری در کتابخانه یافت نشد.",
  isSelected,
  isExcluded,
  onToggle,
}: MediaPickerGridProps) {
  if (error) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm leading-7 text-red-800"
      >
        {error}
      </div>
    );
  }

  if (pending && items.length === 0) {
    return (
      <div
        role="status"
        className="rounded-xl border border-border bg-background px-4 py-10 text-center text-sm text-muted"
      >
        در حال بارگذاری تصاویر…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-background px-4 py-10 text-center text-sm text-muted">
        {emptyMessage}
      </div>
    );
  }

  return (
    <ul
      className={`grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 ${
        pending ? "opacity-70" : ""
      }`}
    >
      {items.map((item) => {
        const selected = isSelected(item.id);
        const excluded = isExcluded(item.id);
        const label = item.title || item.category || item.altText || "رسانه";

        return (
          <li key={item.id}>
            <button
              type="button"
              disabled={excluded}
              aria-pressed={selected}
              aria-label={
                excluded
                  ? `${label} — قبلاً اضافه شده`
                  : selected
                    ? `لغو انتخاب ${label}`
                    : `انتخاب ${label}`
              }
              onClick={() => onToggle(item)}
              className={`group relative block w-full overflow-hidden rounded-xl border bg-white text-start transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:cursor-not-allowed disabled:opacity-45 ${
                selected
                  ? "border-secondary ring-2 ring-secondary/40"
                  : "border-border"
              }`}
            >
              <div className="relative aspect-square bg-primary/[0.03]">
                <Image
                  src={item.url}
                  alt={item.altText || label}
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="(max-width: 640px) 45vw, 160px"
                />
                {selected ? (
                  <span className="absolute end-2 top-2 flex size-7 items-center justify-center rounded-full bg-secondary text-white shadow">
                    <CheckIcon />
                  </span>
                ) : null}
                {excluded ? (
                  <span className="absolute inset-x-0 bottom-0 bg-slate-900/70 px-2 py-1.5 text-center text-[0.65rem] text-white">
                    در آلبوم هست
                  </span>
                ) : null}
              </div>
              <div className="px-2 py-2">
                <p className="truncate text-xs text-muted">{label}</p>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
