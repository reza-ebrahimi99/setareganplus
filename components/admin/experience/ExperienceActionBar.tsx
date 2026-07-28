"use client";

import Link from "next/link";
import { useState } from "react";
import { ExperiencePublishDialog } from "@/components/admin/experience/ExperiencePublishDialog";
import { toPersianDigits } from "@/lib/persian";

type ExperienceActionBarProps = {
  flowId: string;
  experienceId: string;
  draftVersionId: string;
  flowTitle: string;
  draftVersionNumber: number;
  canManage: boolean;
  blockCount: number;
};

export function ExperienceActionBar({
  flowId,
  experienceId,
  draftVersionId,
  flowTitle,
  draftVersionNumber,
  canManage,
  blockCount,
}: ExperienceActionBarProps) {
  const [publishOpen, setPublishOpen] = useState(false);

  return (
    <>
      <div className="sticky top-0 z-30 border-b border-border bg-white/95 backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-3 sm:px-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-primary">
              {flowTitle}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              پیش‌نویس نسخه {toPersianDigits(draftVersionNumber)} ·{" "}
              {toPersianDigits(blockCount)} بلوک
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/admin/registrations/flows/${flowId}`}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-white px-3 text-sm text-primary"
            >
              بازگشت
            </Link>
            <Link
              href={`/admin/registrations/flows/${flowId}/experience/preview`}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-white px-3 text-sm text-primary"
            >
              پیش‌نمایش
            </Link>
            {canManage ? (
              <button
                type="button"
                onClick={() => setPublishOpen(true)}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-white"
              >
                انتشار
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {canManage ? (
        <ExperiencePublishDialog
          open={publishOpen}
          onClose={() => setPublishOpen(false)}
          flowId={flowId}
          experienceId={experienceId}
          draftVersionId={draftVersionId}
        />
      ) : null}
    </>
  );
}
