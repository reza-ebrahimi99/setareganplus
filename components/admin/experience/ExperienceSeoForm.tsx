"use client";

import { useActionState } from "react";
import {
  updateSeoAction,
  type ExperienceActionState,
} from "@/app/admin/(dashboard)/registrations/flows/[id]/experience/actions";
import { MediaPickerField } from "@/components/admin/media/MediaPickerField";
import type { ExperienceSeoDto } from "@/components/admin/experience/types";
import { toPersianDigits } from "@/lib/persian";

const emptyState: ExperienceActionState = {};

type ExperienceSeoFormProps = {
  flowId: string;
  experienceId: string;
  versionId: string;
  seo: ExperienceSeoDto;
  canManage: boolean;
};

export function ExperienceSeoForm({
  flowId,
  experienceId,
  versionId,
  seo,
  canManage,
}: ExperienceSeoFormProps) {
  const [state, action, pending] = useActionState(updateSeoAction, emptyState);

  return (
    <form action={action} className="space-y-4 rounded-2xl border border-border bg-white p-4">
      <input type="hidden" name="flowId" value={flowId} />
      <input type="hidden" name="experienceId" value={experienceId} />
      <input type="hidden" name="versionId" value={versionId} />

      <div>
        <h3 className="text-sm font-semibold text-primary">SEO صفحه فرود</h3>
        <p className="mt-1 text-xs leading-6 text-muted">
          عنوان حدود {toPersianDigits(120)} و توضیحات حدود{" "}
          {toPersianDigits(320)} کاراکتر پیشنهاد می‌شود.
        </p>
      </div>

      {state.formError ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {state.formError}
        </div>
      ) : null}
      {state.successMessage ? (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
        >
          {state.successMessage}
        </div>
      ) : null}

      <label className="block text-sm">
        <span className="mb-1.5 block text-muted">عنوان SEO</span>
        <input
          name="seoTitle"
          defaultValue={seo.seoTitle}
          maxLength={120}
          disabled={!canManage || pending}
          className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5 disabled:opacity-60"
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1.5 block text-muted">توضیحات SEO</span>
        <textarea
          name="seoDescription"
          defaultValue={seo.seoDescription}
          maxLength={320}
          rows={3}
          disabled={!canManage || pending}
          className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5 disabled:opacity-60"
        />
      </label>

      <MediaPickerField
        name="seoImageMediaId"
        label="تصویر Open Graph"
        value={seo.seoImageMediaId}
        previewUrl={seo.seoImagePreviewUrl}
        previewTitle={seo.seoImagePreviewTitle}
        disabled={!canManage || pending}
        helperText="اختیاری — برای اشتراک‌گذاری در شبکه‌های اجتماعی"
      />

      {canManage ? (
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? "در حال ذخیره..." : "ذخیره SEO"}
        </button>
      ) : null}
    </form>
  );
}
