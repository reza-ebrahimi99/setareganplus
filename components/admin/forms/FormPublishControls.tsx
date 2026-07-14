"use client";

import { useActionState, useState } from "react";
import {
  pausePublishedFormAction,
  publishFormVersionAction,
  type PublishActionState,
} from "@/app/admin/(dashboard)/forms/publish-actions";
import type { EditorDisplayStatus } from "@/lib/forms/load-form-editor";
import { toPersianDigits } from "@/lib/persian";

const initialState: PublishActionState = {};

const STATUS_LABELS: Record<EditorDisplayStatus, string> = {
  DRAFT: "پیش‌نویس",
  PUBLISHED: "منتشرشده",
  PAUSED: "متوقف‌شده",
};

const STATUS_STYLES: Record<EditorDisplayStatus, string> = {
  DRAFT: "bg-amber-50 text-amber-900",
  PUBLISHED: "bg-emerald-50 text-emerald-800",
  PAUSED: "bg-slate-100 text-slate-700",
};

type FormPublishControlsProps = {
  formId: string;
  slug: string;
  displayStatus: EditorDisplayStatus;
  hasDraft: boolean;
  isPublished: boolean;
  draftVersionNumber: number | null;
  publishedVersionNumber: number | null;
};

function PublicUrlPreview({ slug }: { slug: string }) {
  const path = `/forms/${slug}`;
  const [copied, setCopied] = useState(false);

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-3 text-sm">
      <p className="font-medium text-emerald-900">
        آدرس عمومی (پس از راه‌اندازی نمایشگر)
      </p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
        <code
          dir="ltr"
          className="block min-w-0 flex-1 overflow-x-auto rounded-lg bg-white/80 px-3 py-2 font-mono text-xs text-emerald-950"
        >
          {path}
        </code>
        <button
          type="button"
          className="shrink-0 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-medium text-emerald-900 hover:bg-emerald-50"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(path);
              setCopied(true);
            } catch {
              setCopied(false);
            }
          }}
        >
          {copied ? "کپی شد" : "کپی مسیر"}
        </button>
      </div>
      <p className="mt-2 text-xs leading-6 text-emerald-900/80">
        مسیر عمومی هنوز پیاده‌سازی نشده است؛ فقط پیش‌نمایش است.
      </p>
    </div>
  );
}

export function FormPublishControls({
  formId,
  slug,
  displayStatus,
  hasDraft,
  isPublished,
  draftVersionNumber,
  publishedVersionNumber,
}: FormPublishControlsProps) {
  const [publishState, publishAction, publishPending] = useActionState(
    publishFormVersionAction,
    initialState,
  );
  const [pauseState, pauseAction, pausePending] = useActionState(
    pausePublishedFormAction,
    initialState,
  );

  const actionError = publishState.formError ?? pauseState.formError;
  const actionSuccess =
    publishState.successMessage ?? pauseState.successMessage;
  const validationErrors = publishState.errors;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${STATUS_STYLES[displayStatus]}`}
        >
          {STATUS_LABELS[displayStatus]}
        </span>
        {draftVersionNumber != null ? (
          <span className="text-xs text-muted">
            پیش‌نویس: نسخه {toPersianDigits(draftVersionNumber)}
          </span>
        ) : null}
        {publishedVersionNumber != null ? (
          <span className="text-xs text-muted">
            منتشر: نسخه {toPersianDigits(publishedVersionNumber)}
          </span>
        ) : null}
      </div>

      {actionError ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-7 text-red-800"
        >
          <p>{actionError}</p>
          {validationErrors && validationErrors.length > 0 ? (
            <ul className="mt-2 list-disc pr-5">
              {validationErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {actionSuccess ? (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-7 text-emerald-900"
        >
          {actionSuccess}
        </div>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {hasDraft ? (
          <form
            action={publishAction}
            onSubmit={(event) => {
              if (
                !window.confirm(
                  "نسخه پیش‌نویس منتشر شود؟ در صورت وجود نسخه منتشرشده قبلی، آن نسخه جایگزین می‌شود.",
                )
              ) {
                event.preventDefault();
              }
            }}
          >
            <input type="hidden" name="formId" value={formId} />
            <button
              type="submit"
              disabled={publishPending}
              className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary/92 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {publishPending ? "در حال انتشار..." : "انتشار فرم"}
            </button>
          </form>
        ) : null}

        {isPublished ? (
          <form
            action={pauseAction}
            onSubmit={(event) => {
              if (
                !window.confirm(
                  "انتشار فرم متوقف شود؟ آدرس عمومی دیگر نسخه فعالی نخواهد داشت.",
                )
              ) {
                event.preventDefault();
              }
            }}
          >
            <input type="hidden" name="formId" value={formId} />
            <button
              type="submit"
              disabled={pausePending}
              className="inline-flex w-full items-center justify-center rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-foreground hover:bg-background disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {pausePending ? "در حال توقف..." : "توقف انتشار"}
            </button>
          </form>
        ) : null}
      </div>

      {isPublished ? <PublicUrlPreview key={slug} slug={slug} /> : null}
    </div>
  );
}
