"use client";

import { useActionState } from "react";
import {
  createBookTypeAction,
  updateBookTypeAction,
  type BookTypeActionState,
} from "./actions";

const initialState: BookTypeActionState = { status: "idle", message: "" };

export function CreateBookTypeForm() {
  const [state, formAction, pending] = useActionState(createBookTypeAction, initialState);

  return (
    <form
      action={formAction}
      className="admin-card grid gap-3 p-4 sm:grid-cols-[2fr_1fr_auto] sm:items-end"
      noValidate
    >
      <div>
        <label className="mb-1 block text-sm font-medium text-primary" htmlFor="label">
          عنوان نوع کتاب جدید
        </label>
        <input
          id="label"
          name="label"
          required
          placeholder="مثلاً: زرد"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-primary"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-primary" htmlFor="code">
          کد (اختیاری)
        </label>
        <input
          id="code"
          name="code"
          dir="ltr"
          placeholder="YELLOW"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-primary"
        />
      </div>
      <div>
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60 sm:w-auto"
        >
          {pending ? "در حال افزودن…" : "افزودن نوع"}
        </button>
      </div>
      {state.status !== "idle" ? (
        <p
          className={`sm:col-span-3 text-sm ${state.status === "success" ? "text-success" : "text-danger"}`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

export function BookTypeRowForm({
  id,
  label,
  sortOrder,
  isActive,
  isSystem,
}: {
  id: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
  isSystem: boolean;
}) {
  const [state, formAction, pending] = useActionState(updateBookTypeAction, initialState);

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-background px-4 py-3"
    >
      <input type="hidden" name="id" value={id} />
      <input
        name="label"
        defaultValue={label}
        className="min-w-40 flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-primary"
      />
      <input
        name="sortOrder"
        type="number"
        defaultValue={sortOrder}
        className="w-24 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-primary"
      />
      <label className="flex items-center gap-2 text-xs text-muted">
        <input type="checkbox" name="isActive" defaultChecked={isActive} className="accent-secondary" />
        فعال
      </label>
      {isSystem ? (
        <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted">پیش‌فرض</span>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-secondary/30 bg-secondary/10 px-3 py-1.5 text-xs font-medium text-primary disabled:opacity-60"
      >
        {pending ? "..." : "ذخیره"}
      </button>
      {state.status === "error" ? <span className="text-xs text-danger">{state.message}</span> : null}
    </form>
  );
}
