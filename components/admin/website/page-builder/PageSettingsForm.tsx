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
    slug: string;
    title: string;
    seoTitle: string | null;
    seoDescription: string | null;
    status: PageStatus;
    publishedSectionCount: number;
    publicPath: string;
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
            className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">نامک (slug)</span>
          <input
            name="slug"
            defaultValue={page.slug}
            required
            dir="ltr"
            className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5 font-mono text-sm"
          />
          <span className="mt-1 block text-xs text-muted" dir="ltr">
            {page.publicPath}
          </span>
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">عنوان سئو</span>
          <input
            name="seoTitle"
            defaultValue={page.seoTitle ?? ""}
            className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">توضیح سئو</span>
          <textarea
            name="seoDescription"
            defaultValue={page.seoDescription ?? ""}
            rows={3}
            className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">وضعیت صفحه</span>
          {page.status === "ARCHIVED" ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-900">
              این صفحه بایگانی شده است. برای تغییر وضعیت، از عملیات «بازیابی به
              پیش‌نویس» استفاده کنید.
            </p>
          ) : (
            <select
              name="status"
              defaultValue={
                page.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT"
              }
              className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5"
            >
              <option value="DRAFT">پیش‌نویس</option>
              <option value="PUBLISHED">منتشرشده</option>
            </select>
          )}
        </label>

        {page.status !== "ARCHIVED" && page.publishedSectionCount === 0 ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-900">
            هنوز هیچ بخشی با وضعیت «منتشرشده» ندارید. انتشار صفحه، بخش‌های
            پیش‌نویس را منتشر نمی‌کند.
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending || page.status === "ARCHIVED"}
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
          disabled={
            publishPending ||
            page.publishedSectionCount === 0 ||
            page.status === "ARCHIVED"
          }
          className="min-h-11 rounded-xl border border-primary bg-white px-4 py-2.5 text-sm font-medium text-primary disabled:opacity-60"
        >
          {publishPending ? "در حال انتشار…" : "انتشار صفحه"}
        </button>
      </form>
    </div>
  );
}
