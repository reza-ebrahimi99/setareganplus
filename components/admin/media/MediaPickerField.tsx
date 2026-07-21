"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { MediaPicker } from "@/components/admin/media/MediaPicker";
import type { MediaPickerItem } from "@/components/admin/media/media-picker-types";

export type MediaPickerFieldProps = {
  name: string;
  label: string;
  value?: string | null;
  previewUrl?: string | null;
  previewTitle?: string | null;
  clearable?: boolean;
  allowUpload?: boolean;
  disabled?: boolean;
  helperText?: string;
  onChange?: (mediaId: string | null, item: MediaPickerItem | null) => void;
};

export function MediaPickerField({
  name,
  label,
  value = null,
  previewUrl = null,
  previewTitle = null,
  clearable = true,
  allowUpload = true,
  disabled = false,
  helperText,
  onChange,
}: MediaPickerFieldProps) {
  const [open, setOpen] = useState(false);
  const [mediaId, setMediaId] = useState<string | null>(value);
  const [preview, setPreview] = useState<{
    url: string | null;
    title: string | null;
  }>({ url: previewUrl, title: previewTitle });

  const selectedIds = useMemo(
    () => (mediaId ? [mediaId] : []),
    [mediaId],
  );

  const initialItems = useMemo((): MediaPickerItem[] | undefined => {
    if (!mediaId || !preview.url) return undefined;
    return [
      {
        id: mediaId,
        title: preview.title,
        altText: preview.title,
        category: null,
        url: preview.url,
        width: null,
        height: null,
        mimeType: "image/*",
        byteSize: 0,
        status: "ACTIVE",
      },
    ];
  }, [mediaId, preview.title, preview.url]);

  function applySelection(item: MediaPickerItem | null) {
    const nextId = item?.id ?? null;
    setMediaId(nextId);
    setPreview({
      url: item?.url ?? null,
      title: item?.title ?? item?.altText ?? null,
    });
    onChange?.(nextId, item);
  }

  return (
    <div className="block text-sm">
      <span className="mb-1.5 block text-muted">{label}</span>
      <input type="hidden" name={name} value={mediaId ?? ""} />

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-white p-3 sm:flex-row sm:items-center">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-primary/[0.03]">
          {preview.url ? (
            <Image
              src={preview.url}
              alt={preview.title || label}
              fill
              unoptimized
              className="object-cover"
              sizes="80px"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[0.65rem] text-muted">
              بدون تصویر
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <p className="truncate text-sm text-primary">
            {preview.title || (mediaId ? "تصویر انتخاب‌شده" : "انتخاب نشده")}
          </p>
          {helperText ? (
            <p className="text-xs leading-6 text-muted">{helperText}</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => setOpen(true)}
              className="min-h-11 rounded-xl border border-border bg-background px-4 py-2.5 text-sm disabled:opacity-60"
            >
              {mediaId ? "تغییر تصویر" : "انتخاب از کتابخانه"}
            </button>
            {clearable && mediaId ? (
              <button
                type="button"
                disabled={disabled}
                onClick={() => applySelection(null)}
                className="min-h-11 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800 disabled:opacity-60"
              >
                پاک کردن
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <MediaPicker
        open={open}
        onOpenChange={setOpen}
        mode="single"
        selectedIds={selectedIds}
        initialItems={initialItems}
        allowUpload={allowUpload}
        title="انتخاب تصویر"
        confirmLabel="انتخاب"
        onConfirm={(items) => {
          const item = items[0] ?? null;
          applySelection(item);
        }}
      />
    </div>
  );
}
