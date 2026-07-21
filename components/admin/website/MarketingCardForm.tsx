"use client";

import { useActionState } from "react";
import {
  createMarketingCardAction,
  updateMarketingCardAction,
  type MarketingCardActionState,
} from "@/app/admin/(dashboard)/website/marketing-cards/actions";
import { MediaPickerField } from "@/components/admin/media/MediaPickerField";
import { HOMEPAGE_QALAMCHI_SECTION_KEY } from "@/lib/website/marketing-card-constants";

const emptyState: MarketingCardActionState = {};

type MarketingCardFormProps = {
  mode: "create" | "edit";
  card?: {
    id: string;
    title: string;
    description: string;
    badge: string | null;
    imageMediaId: string | null;
    imageUrl: string | null;
    imageAlt: string | null;
    isActive: boolean;
  };
};

export function MarketingCardForm({ mode, card }: MarketingCardFormProps) {
  const [updateState, updateAction, updatePending] = useActionState(
    updateMarketingCardAction,
    emptyState,
  );

  if (mode === "create") {
    return (
      <form action={createMarketingCardAction} className="admin-card space-y-4 p-4">
        <input
          type="hidden"
          name="sectionKey"
          value={HOMEPAGE_QALAMCHI_SECTION_KEY}
        />
        <MarketingCardFields />
        <button
          type="submit"
          className="min-h-11 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white"
        >
          ایجاد کارت
        </button>
      </form>
    );
  }

  if (!card) return null;

  return (
    <form action={updateAction} className="admin-card space-y-4 p-4">
      <input type="hidden" name="cardId" value={card.id} />
      {updateState.formError ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-7 text-red-800"
        >
          {updateState.formError}
        </div>
      ) : null}
      {updateState.successMessage ? (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-7 text-emerald-900"
        >
          {updateState.successMessage}
        </div>
      ) : null}
      <MarketingCardFields
        defaults={{
          title: card.title,
          description: card.description,
          badge: card.badge ?? "",
          imageMediaId: card.imageMediaId,
          imageUrl: card.imageUrl,
          imageAlt: card.imageAlt ?? "",
          isActive: card.isActive,
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

function MarketingCardFields({
  defaults,
}: {
  defaults?: {
    title: string;
    description: string;
    badge: string;
    imageMediaId: string | null;
    imageUrl: string | null;
    imageAlt: string;
    isActive: boolean;
  };
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block text-sm sm:col-span-2">
        <span className="mb-1.5 block text-muted">عنوان</span>
        <input
          name="title"
          required
          maxLength={120}
          defaultValue={defaults?.title ?? ""}
          className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5"
        />
      </label>
      <label className="block text-sm sm:col-span-2">
        <span className="mb-1.5 block text-muted">توضیح</span>
        <textarea
          name="description"
          rows={3}
          maxLength={500}
          defaultValue={defaults?.description ?? ""}
          className="w-full rounded-xl border border-border bg-white px-3 py-2.5"
        />
      </label>
      <label className="block text-sm sm:col-span-2">
        <span className="mb-1.5 block text-muted">نشان (اختیاری)</span>
        <input
          name="badge"
          maxLength={80}
          defaultValue={defaults?.badge ?? ""}
          placeholder="نمایندگی رسمی"
          className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5"
        />
      </label>
      <div className="sm:col-span-2">
        <MediaPickerField
          key={`media-${defaults?.imageMediaId ?? "none"}`}
          name="mediaId"
          label="تصویر"
          value={defaults?.imageMediaId ?? null}
          previewUrl={defaults?.imageUrl ?? null}
          previewTitle={defaults?.title ?? null}
          clearable
          allowUpload
          helperText="از کتابخانه رسانه انتخاب کنید یا بارگذاری کنید."
        />
      </div>
      <label className="block text-sm sm:col-span-2">
        <span className="mb-1.5 block text-muted">متن جایگزین تصویر</span>
        <input
          name="imageAlt"
          maxLength={300}
          defaultValue={defaults?.imageAlt ?? ""}
          className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5"
        />
      </label>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input
          type="checkbox"
          name="isActive"
          value="true"
          defaultChecked={defaults?.isActive ?? true}
          className="size-4 rounded border-border"
        />
        <span>کارت فعال باشد</span>
      </label>
    </div>
  );
}
