"use client";

/**
 * Guidance ERP — final grades upload form (portal).
 */

import { useActionState } from "react";
import {
  uploadGuidanceFinalGradesAction,
  type GuidanceGradesUploadState,
} from "@/app/portal/student/services/guidance/grades/actions";

const initial: GuidanceGradesUploadState = {};

type GuidanceGradesUploadFormProps = {
  hasExisting: boolean;
};

export function GuidanceGradesUploadForm({
  hasExisting,
}: GuidanceGradesUploadFormProps) {
  const [state, action, pending] = useActionState(
    uploadGuidanceFinalGradesAction,
    initial,
  );

  if (state.ok) {
    return (
      <div className="space-y-3 rounded-2xl border border-success/20 bg-success/5 p-5">
        <p className="text-base font-semibold text-primary">
          کارنامه شما دریافت شد.
        </p>
        <p className="text-sm leading-7 text-muted">در انتظار بررسی...</p>
        {state.versionNumber ? (
          <p className="text-xs text-muted">
            نسخه {state.versionNumber}
            {state.replaced ? " (جایگزین نسخه قبلی)" : ""}
          </p>
        ) : null}
        <a
          href="/portal/student/services/guidance"
          className="inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white"
        >
          بازگشت به مسیر انتخاب رشته
        </a>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      {state.error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {state.error}
        </p>
      ) : null}

      <p className="text-sm leading-7 text-muted">
        فایل کارنامه نهایی یا سوابق تحصیلی را بارگذاری کنید (PDF یا تصویر، حداکثر
        ۵ مگابایت).
        {hasExisting
          ? " بارگذاری جدید به‌عنوان نسخه تازه ثبت می‌شود و نسخه قبلی در سوابق می‌ماند."
          : null}
      </p>

      <div>
        <label
          htmlFor="guidance-grades-file"
          className="text-sm font-medium text-primary"
        >
          فایل کارنامه
        </label>
        <input
          id="guidance-grades-file"
          name="file"
          type="file"
          required
          accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp"
          className="mt-1.5 block w-full text-sm text-muted file:me-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full justify-center rounded-xl bg-primary px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending
          ? "در حال بارگذاری…"
          : hasExisting
            ? "جایگزینی کارنامه"
            : "ارسال کارنامه"}
      </button>
    </form>
  );
}
