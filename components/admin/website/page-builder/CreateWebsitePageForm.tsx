"use client";

import { useActionState } from "react";
import {
  createWebsitePageAction,
  type PageBuilderActionState,
} from "@/app/admin/(dashboard)/website/pages/actions";

const emptyState: PageBuilderActionState = {};

export function CreateWebsitePageForm() {
  const [state, action, pending] = useActionState(
    createWebsitePageAction,
    emptyState,
  );

  return (
    <form action={action} className="admin-card space-y-3 p-4">
      <h2 className="text-base font-semibold text-primary">صفحه جدید</h2>
      <p className="text-sm leading-7 text-muted">
        نامک باید یکتا باشد و با مسیرهای رزروشده سایت تداخل نداشته باشد.
      </p>

      {state.formError ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-7 text-red-800"
        >
          {state.formError}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">عنوان</span>
          <input
            name="title"
            required
            className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5"
            placeholder="عنوان صفحه"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">نامک (slug)</span>
          <input
            name="slug"
            required
            dir="ltr"
            className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5 font-mono text-sm"
            placeholder="summer-club"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "در حال ایجاد…" : "ایجاد صفحه"}
      </button>
    </form>
  );
}
