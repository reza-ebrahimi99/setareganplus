"use client";

import { useActionState } from "react";
import {
  publishPageAction,
  updatePageSettingsAction,
  type PageBuilderActionState,
} from "@/app/admin/(dashboard)/website/pages/actions";
import type { PageStatus } from "@/lib/website/page-builder/constants";

const emptyState: PageBuilderActionState = {};

type Props = {
  page: {
    id: string;
    title: string;
    seoTitle: string | null;
    seoDescription: string | null;
    status: PageStatus;
    publishedSectionCount: number;
  };
};

export function PageSettingsForm({ page }: Props) {
  const [state, action, pending] = useActionState(
    updatePageSettingsAction,
    emptyState,
  );
  const [publishState, publishAction, publishPending] = useActionState(
    publishPageAction,
    emptyState,
  );

  return (
    <div className="space-y-4">
      <form action={action} className="admin-card space-y-4 p-4">
        <input type="hidden" name="pageId" value={page.id} />
        <h2 className="text-base font-semibold text-primary">تنظیمات صفحه</h2>

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

        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">عنوان</span>
          <input
            name="title"
            defaultValue={page.title}
            required
            className="min-h-11 rounded-xl border border-border bg-white px-3 py-2.5 w-full"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">عنوان سئو</span>
          <input
            name="seoTitle"
            defaultValue={page.seoTitle ?? ""}
            className="min-h-11 rounded-xl border border-border bg-white px-3 py-2.5 w-full"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">توضیح سئو</span>
          <textarea
            name="seoDescription"
            defaultValue={page.seoDescription ?? ""}
            rows={3}
            className="min-h-11 rounded-xl border border-border bg-white px-3 py-2.5 w-full"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">وضعیت صفحه</span>
          <select
            name="status"
            defaultValue={page.status}
            className="min-h-11 rounded-xl border border-border bg-white px-3 py-2.5 w-full"
          >
            <option value="DRAFT">پیش‌نویس</option>
            <option value="PUBLISHED">منتشرشده</option>
            <option value="ARCHIVED">بایگانی</option>
          </select>
        </label>

        {page.publishedSectionCount === 0 ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-900">
            هنوز هیچ بخشی با وضعیت «منتشرشده» ندارید. انتشار صفحه، بخش‌های
            پیش‌نویس را منتشر نمی‌کند.
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? "در حال ذخیره…" : "ذخیره تنظیمات"}
        </button>
      </form>

      <form action={publishAction} className="admin-card space-y-3 p-4">
        <input type="hidden" name="pageId" value={page.id} />
        <h2 className="text-base font-semibold text-primary">انتشار</h2>
        <p className="text-sm leading-7 text-muted">
          فقط بخش‌هایی که خودشان «منتشرشده» هستند در مسیر عمومی نمایش داده
          می‌شوند.
        </p>
        {publishState.formError ? (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-7 text-red-800"
          >
            {publishState.formError}
          </div>
        ) : null}
        {publishState.successMessage ? (
          <div
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-7 text-emerald-900"
          >
            {publishState.successMessage}
          </div>
        ) : null}
        <button
          type="submit"
          disabled={publishPending || page.publishedSectionCount === 0}
          className="min-h-11 rounded-xl border border-primary bg-white px-4 py-2.5 text-sm font-medium text-primary disabled:opacity-60"
        >
          {publishPending ? "در حال انتشار…" : "انتشار صفحه آزمایشی"}
        </button>
      </form>
    </div>
  );
}
