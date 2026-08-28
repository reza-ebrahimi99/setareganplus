"use client";

type MediaPickerPaginationProps = {
  page: number;
  totalPages: number;
  total: number;
  pending?: boolean;
  onPageChange: (page: number) => void;
};

export function MediaPickerPagination({
  page,
  totalPages,
  total,
  pending,
  onPageChange,
}: MediaPickerPaginationProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
      <p className="text-xs text-muted" aria-live="polite">
        {total === 0
          ? "نتیجه‌ای نیست"
          : `${total} تصویر · صفحه ${page} از ${totalPages}`}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending || page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="min-h-11 rounded-xl border border-border bg-white px-4 py-2.5 text-sm disabled:opacity-50"
        >
          قبلی
        </button>
        <button
          type="button"
          disabled={pending || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="min-h-11 rounded-xl border border-border bg-white px-4 py-2.5 text-sm disabled:opacity-50"
        >
          بعدی
        </button>
      </div>
    </div>
  );
}
