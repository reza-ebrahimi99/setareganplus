"use client";

import { useActionState } from "react";
import {
  createTopRankArchiveAction,
  updateTopRankArchiveAction,
  type TopRankArchiveActionState,
} from "@/app/admin/(dashboard)/website/top-rank-archive/actions";
import { MediaPickerField } from "@/components/admin/media/MediaPickerField";
import { toPersianDigits } from "@/lib/persian";
import { defaultTopRankTitle } from "@/lib/website/top-rank-archive-constants";

const emptyState: TopRankArchiveActionState = {};

type TopRankArchiveFormProps = {
  mode: "create" | "edit";
  archive?: {
    id: string;
    year: number;
    title: string | null;
    description: string | null;
    sortOrder: number;
    isPublished: boolean;
    mediaId: string;
    imageUrl: string | null;
    imageAlt: string;
  };
};

export function TopRankArchiveForm({ mode, archive }: TopRankArchiveFormProps) {
  const [createState, createAction, createPending] = useActionState(
    createTopRankArchiveAction,
    emptyState,
  );
  const [updateState, updateAction, updatePending] = useActionState(
    updateTopRankArchiveAction,
    emptyState,
  );

  if (mode === "create") {
    return (
      <form action={createAction} className="admin-card space-y-4 p-4">
        <FormAlerts state={createState} />
        <TopRankFields />
        <button
          type="submit"
          disabled={createPending}
          className="min-h-11 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {createPending ? "در حال ایجاد…" : "ایجاد آرشیو سال"}
        </button>
      </form>
    );
  }

  if (!archive) return null;

  return (
    <form action={updateAction} className="admin-card space-y-4 p-4">
      <input type="hidden" name="archiveId" value={archive.id} />
      <FormAlerts state={updateState} />
      <TopRankFields
        defaults={{
          year: String(archive.year),
          title: archive.title ?? "",
          description: archive.description ?? "",
          sortOrder: String(archive.sortOrder),
          isPublished: archive.isPublished,
          mediaId: archive.mediaId,
          imageUrl: archive.imageUrl,
          imageAlt: archive.imageAlt,
        }}
      />
      <button
        type="submit"
        disabled={updatePending}
        className="min-h-11 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
      >
        {updatePending ? "در حال ذخیره…" : "ذخیره تغییرات"}
      </button>
    </form>
  );
}

function FormAlerts({ state }: { state: TopRankArchiveActionState }) {
  return (
    <>
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
    </>
  );
}

function TopRankFields({
  defaults,
}: {
  defaults?: {
    year: string;
    title: string;
    description: string;
    sortOrder: string;
    isPublished: boolean;
    mediaId: string;
    imageUrl: string | null;
    imageAlt: string;
  };
}) {
  const yearHint = defaults?.year
    ? defaultTopRankTitle(Number.parseInt(defaults.year, 10) || 0)
    : "مثال: رتبه‌های برتر کنکور ۱۳۸۵";

  return (
    <>
      <label className="block text-sm">
        <span className="mb-1.5 block text-muted">سال شمسی *</span>
        <input
          name="year"
          type="number"
          required
          inputMode="numeric"
          defaultValue={defaults?.year ?? ""}
          placeholder="۱۳۸۵"
          className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm"
        />
        <span className="mt-1 block text-xs text-muted">
          عنوان پیش‌فرض در صورت خالی بودن عنوان: {toPersianDigits(yearHint)}
        </span>
      </label>

      <label className="block text-sm">
        <span className="mb-1.5 block text-muted">عنوان (اختیاری)</span>
        <input
          name="title"
          type="text"
          defaultValue={defaults?.title ?? ""}
          maxLength={120}
          className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm"
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1.5 block text-muted">توضیح (اختیاری)</span>
        <textarea
          name="description"
          rows={4}
          defaultValue={defaults?.description ?? ""}
          maxLength={2000}
          className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm leading-7"
        />
      </label>

      <MediaPickerField
        name="mediaId"
        label="تصویر آرشیو *"
        value={defaults?.mediaId ?? null}
        previewUrl={defaults?.imageUrl ?? null}
        previewTitle={defaults?.imageAlt ?? null}
        helperText="تصویر کامل همان سال؛ بدون برش در نمایش عمومی."
      />

      <label className="block text-sm">
        <span className="mb-1.5 block text-muted">ترتیب نمایش</span>
        <input
          name="sortOrder"
          type="number"
          defaultValue={defaults?.sortOrder ?? ""}
          placeholder="خودکار"
          className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm"
        />
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isPublished"
          value="true"
          defaultChecked={defaults?.isPublished ?? false}
          className="size-4 rounded border-border"
        />
        <span>انتشار در سایت عمومی</span>
      </label>
    </>
  );
}
