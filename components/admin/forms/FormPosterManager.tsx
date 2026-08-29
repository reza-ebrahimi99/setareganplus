"use client";

import { useActionState, useEffect, useState } from "react";
import {
  removeFormPosterAction,
  uploadFormPosterAction,
  type PosterActionState,
} from "@/app/admin/(dashboard)/forms/poster-actions";
import type { EditorPoster } from "@/lib/forms/load-form-editor";
import { POSTER_MAX_BYTES } from "@/lib/media/validate-poster";

const emptyState: PosterActionState = {};

type FormPosterManagerProps = {
  formId: string;
  /** When set, upload/replace/remove are enabled for the draft. */
  editable: boolean;
  poster: EditorPoster | null;
};

export function FormPosterManager({
  formId,
  editable,
  poster: initialPoster,
}: FormPosterManagerProps) {
  const [uploadState, uploadAction, uploadPending] = useActionState(
    uploadFormPosterAction,
    emptyState,
  );
  const [removeState, removeAction, removePending] = useActionState(
    removeFormPosterAction,
    emptyState,
  );

  const [preview, setPreview] = useState<EditorPoster | null>(initialPoster);

  useEffect(() => {
    setPreview(initialPoster);
  }, [initialPoster]);

  useEffect(() => {
    if (uploadState.poster !== undefined) {
      setPreview(uploadState.poster);
    }
  }, [uploadState.poster]);

  useEffect(() => {
    if (removeState.poster === null) {
      setPreview(null);
    }
  }, [removeState.poster]);

  const formError = uploadState.formError ?? removeState.formError;
  const successMessage =
    uploadState.successMessage ?? removeState.successMessage;
  const pending = uploadPending || removePending;
  const maxMb = Math.round(POSTER_MAX_BYTES / (1024 * 1024));

  return (
    <section
      aria-label="پوستر فرم"
      className="rounded-xl border border-border bg-surface px-4 py-4 sm:px-5"
    >
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-primary">پوستر فرم</h2>
        <p className="mt-1 text-xs leading-6 text-muted">
          {editable
            ? `تصویر معرف فرم روی نسخه پیش‌نویس (JPEG، PNG یا WebP — حداکثر ${maxMb} مگابایت). پس از انتشار روی فرم عمومی نمایش داده می‌شود.`
            : "نسخه پیش‌نویس وجود ندارد؛ پوستر نسخه منتشرشده فقط برای مشاهده است و از این‌جا ویرایش نمی‌شود."}
        </p>
      </div>

      {formError ? (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-7 text-red-800"
        >
          {formError}
        </div>
      ) : null}

      {successMessage && !formError ? (
        <p
          role="status"
          className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-7 text-emerald-900"
        >
          {successMessage}
        </p>
      ) : null}

      {preview ? (
        <div className="mb-4 overflow-hidden rounded-xl border border-border bg-background">
          {/* eslint-disable-next-line @next/next/no-img-element -- media served by Nginx alias, not Next Image CDN */}
          <img
            src={preview.publicUrl}
            alt={preview.altText?.trim() || "پوستر فرم"}
            className="mx-auto h-auto max-h-56 w-full object-contain"
          />
        </div>
      ) : (
        <p className="mb-4 rounded-xl border border-dashed border-border bg-background px-4 py-6 text-center text-sm text-muted">
          پوستری تنظیم نشده است.
        </p>
      )}

      {editable ? (
        <div className="space-y-4">
          <form action={uploadAction} className="space-y-3">
            <input type="hidden" name="formId" value={formId} />
            <div>
              <label
                htmlFor="poster-file"
                className="text-sm font-medium text-primary"
              >
                انتخاب تصویر
              </label>
              <input
                id="poster-file"
                name="poster"
                type="file"
                accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                required
                disabled={pending}
                className="mt-1.5 block w-full text-sm text-foreground file:me-3 file:rounded-lg file:border-0 file:bg-secondary/15 file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary"
              />
            </div>
            <div>
              <label
                htmlFor="poster-alt"
                className="text-sm font-medium text-primary"
              >
                متن جایگزین (alt)
              </label>
              <input
                id="poster-alt"
                name="altText"
                type="text"
                maxLength={200}
                defaultValue={preview?.altText ?? ""}
                disabled={pending}
                placeholder="مثلاً پوستر ثبت‌نام دوره تابستان"
                className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
              />
            </div>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary/92 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {pending
                ? "در حال ذخیره…"
                : preview
                  ? "جایگزینی پوستر"
                  : "بارگذاری پوستر"}
            </button>
          </form>

          {preview ? (
            <form action={removeAction}>
              <input type="hidden" name="formId" value={formId} />
              <button
                type="submit"
                disabled={pending}
                className="inline-flex w-full items-center justify-center rounded-xl border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-medium text-red-800 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {removePending ? "در حال حذف…" : "حذف پوستر"}
              </button>
            </form>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
