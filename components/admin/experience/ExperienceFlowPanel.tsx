"use client";

import Link from "next/link";
import { useState } from "react";
import {
  archiveDraftAction,
  clonePublishedToDraftAction,
  createExperienceForFlowAction,
} from "@/app/admin/(dashboard)/registrations/flows/[id]/experience/actions";
import { ExperiencePublishDialog } from "@/components/admin/experience/ExperiencePublishDialog";
import type { SerializableFlowExperienceSummary } from "@/components/admin/experience/types";
import { formatJalaliDateTimeShort } from "@/lib/datetime/jalali";
import { toPersianDigits } from "@/lib/persian";

type ExperienceFlowPanelProps = {
  flowId: string;
  summary: SerializableFlowExperienceSummary;
  canManage: boolean;
  publicSlug: string;
};

const ENTRY_LABELS: Record<
  SerializableFlowExperienceSummary["entryState"],
  string
> = {
  NONE: "هنوز تجربه‌ای ساخته نشده است",
  PUBLISHED_ONLY: "نسخه منتشرشده فعال است؛ پیش‌نویس وجود ندارد",
  DRAFT_ACTIVE: "پیش‌نویس فعال برای ویرایش آماده است",
};

export function ExperienceFlowPanel({
  flowId,
  summary,
  canManage,
  publicSlug,
}: ExperienceFlowPanelProps) {
  const [publishOpen, setPublishOpen] = useState(false);
  const experienceId = summary.experienceId;
  const draft = summary.draft;
  const published = summary.published;

  return (
    <section className="admin-card space-y-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-primary">
            تجربه صفحه فرود
          </h2>
          <p className="mt-1 text-sm leading-7 text-muted">
            {ENTRY_LABELS[summary.entryState]}
          </p>
          <p className="mt-1 text-xs text-muted" dir="ltr">
            /register/{publicSlug}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-slate-50 px-3 py-3">
          <p className="text-xs text-muted">پیش‌نویس</p>
          {draft ? (
            <div className="mt-1 space-y-1 text-sm text-primary">
              <p>نسخه {toPersianDigits(draft.versionNumber)}</p>
              <p>{toPersianDigits(draft.blockCount)} بلوک</p>
              <p className="text-xs text-muted">
                به‌روزرسانی:{" "}
                {formatJalaliDateTimeShort(new Date(draft.updatedAtIso))}
              </p>
            </div>
          ) : (
            <p className="mt-1 text-sm text-muted">وجود ندارد</p>
          )}
        </div>
        <div className="rounded-xl border border-border bg-slate-50 px-3 py-3">
          <p className="text-xs text-muted">منتشرشده</p>
          {published ? (
            <div className="mt-1 space-y-1 text-sm text-primary">
              <p>نسخه {toPersianDigits(published.versionNumber)}</p>
              <p>{toPersianDigits(published.blockCount)} بلوک</p>
              <p className="text-xs text-muted">
                انتشار:{" "}
                {published.publishedAtIso
                  ? formatJalaliDateTimeShort(
                      new Date(published.publishedAtIso),
                    )
                  : "—"}
              </p>
            </div>
          ) : (
            <p className="mt-1 text-sm text-muted">هنوز منتشر نشده</p>
          )}
        </div>
      </div>

      {canManage ? (
        <div className="flex flex-wrap gap-2">
          {summary.entryState === "NONE" ? (
            <form action={createExperienceForFlowAction}>
              <input type="hidden" name="flowId" value={flowId} />
              <button
                type="submit"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-white"
              >
                ایجاد Experience
              </button>
            </form>
          ) : null}

          {summary.entryState === "PUBLISHED_ONLY" && experienceId ? (
            <form action={clonePublishedToDraftAction}>
              <input type="hidden" name="flowId" value={flowId} />
              <input type="hidden" name="experienceId" value={experienceId} />
              <button
                type="submit"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-white"
              >
                کلون از منتشرشده
              </button>
            </form>
          ) : null}

          {draft && experienceId ? (
            <>
              <Link
                href={`/admin/registrations/flows/${flowId}/experience`}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-white px-4 text-sm text-primary"
              >
                ویرایش پیش‌نویس
              </Link>
              <Link
                href={`/admin/registrations/flows/${flowId}/experience/preview`}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-white px-4 text-sm text-primary"
              >
                پیش‌نمایش
              </Link>
              <button
                type="button"
                onClick={() => setPublishOpen(true)}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-white"
              >
                انتشار
              </button>
              <form
                action={archiveDraftAction}
                onSubmit={(event) => {
                  if (
                    !window.confirm(
                      "پیش‌نویس بایگانی شود؟ این کار قابل بازگشت سریع نیست.",
                    )
                  ) {
                    event.preventDefault();
                  }
                }}
              >
                <input type="hidden" name="flowId" value={flowId} />
                <input type="hidden" name="experienceId" value={experienceId} />
                <input type="hidden" name="versionId" value={draft.versionId} />
                <button
                  type="submit"
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 text-sm text-red-800"
                >
                  بایگانی پیش‌نویس
                </button>
              </form>
            </>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-muted">
          برای مدیریت Experience به دسترسی ویرایش جریان نیاز دارید.
        </p>
      )}

      {canManage && draft && experienceId ? (
        <ExperiencePublishDialog
          open={publishOpen}
          onClose={() => setPublishOpen(false)}
          flowId={flowId}
          experienceId={experienceId}
          draftVersionId={draft.versionId}
        />
      ) : null}
    </section>
  );
}
