"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState } from "react";
import {
  deleteLibraryMediaAction,
  updateLibraryMediaAction,
  type MediaLibraryActionState,
} from "@/app/admin/(dashboard)/website/media/actions";
import type { AdminMediaListItem } from "@/lib/website/media-library-admin";

const emptyState: MediaLibraryActionState = {};

type MediaAssetEditorProps = {
  asset: AdminMediaListItem & {
    originalName?: string;
    dependencies: Array<{ label: string; detail: string; href?: string }>;
  };
};

export function MediaAssetEditor({ asset }: MediaAssetEditorProps) {
  const [updateState, updateAction, updatePending] = useActionState(
    updateLibraryMediaAction,
    emptyState,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteLibraryMediaAction,
    emptyState,
  );

  const formError = updateState.formError ?? deleteState.formError;
  const successMessage =
    updateState.successMessage ?? deleteState.successMessage;
  const dependencies = deleteState.dependencies ?? asset.dependencies;
  const fieldErrors = updateState.fieldErrors;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
      <div className="admin-card overflow-hidden p-3">
        <div className="relative aspect-square overflow-hidden rounded-xl bg-primary/[0.03]">
          <Image
            src={asset.url}
            alt={asset.altText || asset.title || "پیش‌نمایش رسانه"}
            fill
            unoptimized
            className="object-contain"
            sizes="280px"
          />
        </div>
        <dl className="mt-3 space-y-1 text-xs text-muted">
          <div>نوع: {asset.mimeType}</div>
          <div>
            ابعاد: {asset.width ?? "—"}×{asset.height ?? "—"}
          </div>
          <div>حجم: {Math.round(asset.byteSize / 1024)} کیلوبایت</div>
          {asset.originalName ? <div>نام فایل: {asset.originalName}</div> : null}
        </dl>
      </div>

      <div className="space-y-4">
        {formError ? (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-7 text-red-800"
          >
            {formError}
          </div>
        ) : null}
        {successMessage ? (
          <div
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-7 text-emerald-900"
          >
            {successMessage}
          </div>
        ) : null}

        {dependencies.length > 0 ? (
          <section className="admin-card p-4">
            <h2 className="text-sm font-semibold text-primary">
              وابستگی‌های استفاده
            </h2>
            <p className="mt-1 text-xs leading-6 text-muted">
              تا وقتی این موارد وجود دارند، حذف رسانه ممکن نیست.
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {dependencies.map((dep, index) => (
                <li
                  key={`${dep.label}-${dep.detail}-${index}`}
                  className="rounded-xl border border-border px-3 py-2"
                >
                  <span className="font-medium text-primary">{dep.label}</span>
                  <span className="text-muted"> — {dep.detail}</span>
                  {dep.href ? (
                    <>
                      {" "}
                      <Link href={dep.href} className="text-secondary underline">
                        مشاهده
                      </Link>
                    </>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <form action={updateAction} className="admin-card space-y-3 p-4">
          <input type="hidden" name="mediaId" value={asset.id} />
          <label className="block text-sm">
            <span className="mb-1.5 block text-muted">عنوان</span>
            <input
              name="title"
              defaultValue={asset.title ?? ""}
              className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block text-muted">متن جایگزین (alt)</span>
            <input
              name="altText"
              defaultValue={asset.altText ?? ""}
              className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block text-muted">دسته</span>
            <input
              name="category"
              defaultValue={asset.category ?? ""}
              className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5"
            />
            {fieldErrors?.category ? (
              <span className="mt-1 block text-xs text-red-700">
                {fieldErrors.category}
              </span>
            ) : null}
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block text-muted">توضیح</span>
            <textarea
              name="description"
              rows={3}
              defaultValue={asset.description ?? ""}
              className="w-full rounded-xl border border-border bg-white px-3 py-2.5"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block text-muted">وضعیت</span>
            <select
              name="status"
              defaultValue={asset.status}
              className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5"
            >
              <option value="ACTIVE">فعال</option>
              <option value="INACTIVE">غیرفعال</option>
            </select>
          </label>
          <button
            type="submit"
            disabled={updatePending}
            className="min-h-11 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {updatePending ? "در حال ذخیره…" : "ذخیره تغییرات"}
          </button>
        </form>

        <form action={deleteAction} className="admin-card p-4">
          <input type="hidden" name="mediaId" value={asset.id} />
          <p className="text-sm leading-7 text-muted">
            حذف نرم فقط وقتی مجاز است که رسانه در هیچ موجودیتی استفاده نشود.
          </p>
          <button
            type="submit"
            disabled={deletePending || dependencies.length > 0}
            className="mt-3 min-h-11 rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-800 disabled:opacity-50"
          >
            {deletePending ? "در حال حذف…" : "حذف رسانه"}
          </button>
        </form>
      </div>
    </div>
  );
}
