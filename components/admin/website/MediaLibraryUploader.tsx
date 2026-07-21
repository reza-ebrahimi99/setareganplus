"use client";

import Image from "next/image";
import { useActionState, useCallback, useRef, useState } from "react";
import {
  uploadLibraryMediaAction,
  type MediaLibraryActionState,
} from "@/app/admin/(dashboard)/website/media/actions";
import { LIBRARY_IMAGE_MAX_BYTES } from "@/lib/media/library-constants";

const emptyState: MediaLibraryActionState = {};

export function MediaLibraryUploader() {
  const [state, action, pending] = useActionState(
    uploadLibraryMediaAction,
    emptyState,
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<
    Array<{ name: string; url: string }>
  >([]);
  const [dragging, setDragging] = useState(false);
  const maxMb = Math.round(LIBRARY_IMAGE_MAX_BYTES / (1024 * 1024));

  const applyFiles = useCallback((fileList: FileList | null) => {
    if (!fileList || !inputRef.current) return;
    const dt = new DataTransfer();
    const next: Array<{ name: string; url: string }> = [];
    Array.from(fileList).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      dt.items.add(file);
      next.push({ name: file.name, url: URL.createObjectURL(file) });
    });
    inputRef.current.files = dt.files;
    setPreviews((prev) => {
      prev.forEach((item) => URL.revokeObjectURL(item.url));
      return next;
    });
  }, []);

  return (
    <section className="admin-card space-y-4 p-4 sm:p-5">
      <div>
        <h2 className="text-sm font-semibold text-primary">بارگذاری چندفایلی</h2>
        <p className="mt-1 text-xs leading-6 text-muted">
          JPEG، PNG یا WebP — حداکثر {maxMb} مگابایت برای هر فایل. فایل‌ها را
          بکشید و رها کنید یا انتخاب کنید.
        </p>
      </div>

      {state.formError ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-7 text-red-800"
        >
          {state.formError}
        </div>
      ) : null}
      {state.successMessage ? (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-7 text-emerald-900"
        >
          {state.successMessage}
        </div>
      ) : null}

      <form action={action} className="space-y-4">
        <div
          onDragEnter={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setDragging(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            applyFiles(event.dataTransfer.files);
          }}
          className={`rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
            dragging
              ? "border-secondary bg-secondary/5"
              : "border-border bg-background"
          }`}
        >
          <p className="text-sm text-primary">
            تصاویر را اینجا رها کنید یا از دکمه زیر انتخاب کنید
          </p>
          <input
            ref={inputRef}
            type="file"
            name="files"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="mt-4 block w-full text-sm text-muted file:me-3 file:rounded-xl file:border-0 file:bg-primary file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-white"
            onChange={(event) => applyFiles(event.target.files)}
          />
        </div>

        {previews.length > 0 ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {previews.map((preview) => (
              <li
                key={preview.url}
                className="overflow-hidden rounded-xl border border-border bg-white"
              >
                <div className="relative aspect-square">
                  <Image
                    src={preview.url}
                    alt={preview.name}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                </div>
                <p className="truncate px-2 py-1.5 text-[0.7rem] text-muted">
                  {preview.name}
                </p>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1.5 block text-muted">عنوان مشترک (اختیاری)</span>
            <input
              name="title"
              className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block text-muted">دسته (اختیاری)</span>
            <input
              name="category"
              className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1.5 block text-muted">متن جایگزین</span>
            <input
              name="altText"
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
        </div>

        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? "در حال بارگذاری…" : "بارگذاری تصاویر"}
        </button>
      </form>
    </section>
  );
}
