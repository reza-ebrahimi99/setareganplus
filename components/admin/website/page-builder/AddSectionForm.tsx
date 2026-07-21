"use client";

import { useActionState } from "react";
import {
  addSectionAction,
  type PageBuilderActionState,
} from "@/app/admin/(dashboard)/website/pages/actions";
import { SECTION_TYPE_OPTIONS } from "@/lib/website/page-builder/registry";

const emptyState: PageBuilderActionState = {};

export function AddSectionForm({ pageId }: { pageId: string }) {
  const [state, action, pending] = useActionState(addSectionAction, emptyState);

  return (
    <form action={action} className="admin-card flex flex-wrap items-end gap-3 p-4">
      <input type="hidden" name="pageId" value={pageId} />
      <label className="block min-w-[12rem] flex-1 text-sm">
        <span className="mb-1.5 block text-muted">افزودن بخش</span>
        <select name="type" required className="min-h-11 rounded-xl border border-border bg-white px-3 py-2.5 w-full" defaultValue="HERO">
          {SECTION_TYPE_OPTIONS.map((opt) => (
            <option key={opt.type} value={opt.type}>
              {opt.labelFa}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "…" : "افزودن"}
      </button>
      {state.formError ? (
        <p className="w-full text-sm text-red-700" role="alert">
          {state.formError}
        </p>
      ) : null}
      {state.successMessage ? (
        <p className="w-full text-sm text-emerald-800" role="status">
          {state.successMessage}
        </p>
      ) : null}
    </form>
  );
}
